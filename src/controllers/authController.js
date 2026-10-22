import crypto from 'node:crypto';

import {
  LOGIN_ERROR,
  SESSION_COOKIE,
  TOKEN_TYPE,
  TRUSTED_DEVICE_COOKIE,
} from '../config/constants.js';
import { adminAuth, isProd } from '../config/env.js';
import Admin from '../models/Admin.js';
import AdminOtp from '../models/AdminOtp.js';
import ApiError from '../utils/ApiError.js';
import { sendOtpEmail } from '../utils/email.js';
import { createOtpCode, hashOtp, isSameHash, secondsUntil } from '../utils/otp.js';
import { fromNow, isTokenForAdmin, readToken, signToken } from '../utils/token.js';
import { isEmail, isFilledPassword } from '../utils/validators.js';

/**
 * Admin sign-in: email + password → (when 2FA is on) a 6-digit code by email → 48h session.
 * After a verified code the device is trusted for 48h and skips the code.
 */

const {
  twoFactorEnabled,
  sessionTtlMs,
  trustedDeviceTtlMs,
  otpTtlMs,
  otpMaxAttempts,
  otpMaxSends,
  otpResendCooldownMs,
} = adminAuth;

/* ---------- helpers ---------- */

const cookieOptions = (expires) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  path: '/',
  expires,
});

const assertChallengeId = (challengeId) => {
  if (typeof challengeId !== 'string' || !challengeId) {
    throw new ApiError(400, 'challengeId is required.');
  }
};

/** Saves the sign-in time and returns a 48h session for the client. */
const completeSignIn = async (admin) => {
  admin.lastLoginAt = new Date();
  await admin.save();

  const session = signToken(admin, TOKEN_TYPE.session, sessionTtlMs);

  return { ...session, admin: admin.toPublic() };
};

/**
 * Emails a fresh code. Each admin has at most one OTP document: a new sign-in overwrites it,
 * so any earlier code stops working. MongoDB deletes it after `expiresAt` (TTL index).
 */
const issueOtp = async (admin) => {
  const pending = await AdminOtp.findOne({ admin: admin._id, expiresAt: { $gt: new Date() } });

  if (pending) {
    const nextSendAllowedAt = new Date(pending.lastSentAt.getTime() + otpResendCooldownMs);

    if (nextSendAllowedAt > new Date()) {
      throw new ApiError(
        429,
        `A code was just sent. Please wait ${secondsUntil(nextSendAllowedAt)}s before requesting another.`,
      );
    }
  }

  const challengeId = crypto.randomBytes(24).toString('base64url');
  const code = createOtpCode();

  await AdminOtp.findOneAndUpdate(
    { admin: admin._id },
    {
      challengeId,
      codeHash: hashOtp(challengeId, code),
      attempts: 0,
      sendCount: 1,
      lastSentAt: new Date(),
      expiresAt: fromNow(otpTtlMs),
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  await sendOtpEmail({ to: admin.email, code, name: admin.name });

  return challengeId;
};

/* ---------- routes ---------- */

/**
 * POST /api/admin/auth/login { email, password, trustToken? }
 * 2FA off, or a device trusted in the last 48h → signed in straight away.
 * Otherwise → a code is emailed and a challengeId returned for /verify-otp.
 */
export const login = async (req, res) => {
  const { email, password, trustToken = req.cookies?.[TRUSTED_DEVICE_COOKIE] } = req.body || {};

  if (!isEmail(email) || !isFilledPassword(password)) {
    throw new ApiError(400, 'Enter a valid email and password.');
  }

  const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

  if (!admin?.isActive) throw new ApiError(401, LOGIN_ERROR);

  const isPasswordCorrect = await admin.checkPassword(password);

  if (!isPasswordCorrect) throw new ApiError(401, LOGIN_ERROR);

  const trustedDevice = readToken(trustToken, TOKEN_TYPE.trustedDevice);
  const isOtpNeeded = twoFactorEnabled && !isTokenForAdmin(trustedDevice, admin);

  if (isOtpNeeded) {
    const challengeId = await issueOtp(admin);

    return res.json({ otpRequired: true, challengeId });
  }

  const session = await completeSignIn(admin);

  res.cookie(SESSION_COOKIE, session.token, cookieOptions(session.expiresAt));
  res.json({ otpRequired: false, ...session });
};

/** POST /api/admin/auth/send-otp { challengeId } — a new code for the same sign-in (30s cooldown, max 5). */
export const sendOtp = async (req, res) => {
  const { challengeId } = req.body || {};

  assertChallengeId(challengeId);

  const otp = await AdminOtp.findOne({ challengeId }).populate('admin');
  const isExpired = !otp || otp.expiresAt < new Date() || !otp.admin?.isActive;

  if (isExpired) throw new ApiError(401, 'Code expired. Please sign in again.');

  if (otp.sendCount >= otpMaxSends) {
    throw new ApiError(429, 'Too many codes requested. Please sign in again.');
  }

  const nextSendAllowedAt = new Date(otp.lastSentAt.getTime() + otpResendCooldownMs);

  if (nextSendAllowedAt > new Date()) {
    throw new ApiError(
      429,
      `Please wait ${secondsUntil(nextSendAllowedAt)}s before requesting a new code.`,
    );
  }

  const code = createOtpCode();

  otp.set({
    codeHash: hashOtp(otp.challengeId, code),
    attempts: 0,
    sendCount: otp.sendCount + 1,
    lastSentAt: new Date(),
    expiresAt: fromNow(otpTtlMs),
  });
  await otp.save();

  await sendOtpEmail({ to: otp.admin.email, code, name: otp.admin.name });

  res.json({ sent: true });
};

/** POST /api/admin/auth/verify-otp { challengeId, code } — on success this device skips the code for 48h. */
export const verifyOtp = async (req, res) => {
  const { challengeId, code = '' } = req.body || {};

  assertChallengeId(challengeId);

  if (!/^\d{6}$/.test(String(code))) throw new ApiError(400, 'Enter the 6-digit code.');

  const otp = await AdminOtp.findOne({ challengeId });

  if (!otp || otp.expiresAt < new Date()) {
    throw new ApiError(401, 'Code expired. Please sign in again.');
  }

  if (otp.attempts >= otpMaxAttempts) {
    await otp.deleteOne();
    throw new ApiError(429, 'Too many attempts. Please sign in again.');
  }

  const isCorrect = isSameHash(hashOtp(challengeId, String(code)), otp.codeHash);

  if (!isCorrect) {
    otp.attempts += 1;
    await otp.save();
    throw new ApiError(401, 'Incorrect code. Please try again.');
  }

  await otp.deleteOne();

  const admin = await Admin.findById(otp.admin).select('+passwordHash');

  if (!admin?.isActive) throw new ApiError(401, 'Account not available.');

  const session = await completeSignIn(admin);
  const trusted = signToken(admin, TOKEN_TYPE.trustedDevice, trustedDeviceTtlMs);

  res.cookie(SESSION_COOKIE, session.token, cookieOptions(session.expiresAt));
  res.cookie(TRUSTED_DEVICE_COOKIE, trusted.token, cookieOptions(trusted.expiresAt));
  res.json({ ...session, trustToken: trusted.token, trustExpiresAt: trusted.expiresAt });
};

/** GET /api/admin/auth/me — the signed-in admin. */
export const getMe = (req, res) => {
  res.json(req.admin.toPublic());
};

/**
 * POST /api/admin/auth/logout — sessions are stateless, so signing out just drops the session cookie.
 * The trusted-device cookie stays, so the code is still skipped for its 48h.
 */
export const logout = (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
};
