import crypto from 'node:crypto';

import jwt from 'jsonwebtoken';

import { sendOtpEmail } from '../../common/services/mail.service.js';
import ApiError from '../../common/utils/ApiError.js';
import { adminAuth, jwtSecret } from '../../config/env.js';
import Admin from '../admins/admin.model.js';

import AdminOtp from './adminOtp.model.js';
import { LOGIN_ERROR, TOKEN_TYPE } from './login.constants.js';

const {
  twoFactorEnabled,
  sessionTtlMs,
  trustedDeviceTtlMs,
  otpTtlMs,
  otpMaxAttempts,
  otpMaxSends,
  otpResendCooldownMs,
} = adminAuth;

/* ---------- small helpers ---------- */

const fromNow = (ms) => new Date(Date.now() + ms);

const secondsUntil = (date) => Math.ceil((date.getTime() - Date.now()) / 1000);

const createOtpCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

const hashOtp = (challengeId, code) =>
  crypto.createHmac('sha256', jwtSecret).update(`${challengeId}:${code}`).digest('hex');

const isSameHash = (a, b) =>
  a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/* ---------- tokens ---------- */

/**
 * Signs a token for the admin. Tokens are stateless (nothing stored in MongoDB). They carry the admin id
 * and a fingerprint of the password, so a new password cancels every existing token.
 */
const signToken = (admin, type, ttlMs) => {
  const payload = { sub: admin.id, typ: type, pwd: admin.passwordFingerprint() };
  const token = jwt.sign(payload, jwtSecret, { expiresIn: Math.floor(ttlMs / 1000) });

  return { token, expiresAt: fromNow(ttlMs) };
};

const createSession = (admin) => signToken(admin, TOKEN_TYPE.session, sessionTtlMs);

/** While this token is valid, signing in on the same device skips the email OTP. */
const createTrustedDeviceToken = (admin) => {
  const { token, expiresAt } = signToken(admin, TOKEN_TYPE.trustedDevice, trustedDeviceTtlMs);

  return { trustToken: token, trustExpiresAt: expiresAt };
};

/** Returns the token payload if it is valid and of the expected type, otherwise null. */
const readToken = (token, type) => {
  if (typeof token !== 'string' || !token) return null;

  try {
    const payload = jwt.verify(token, jwtSecret);

    return payload.typ === type ? payload : null;
  } catch {
    return null;
  }
};

/** True when the token belongs to this admin and was issued with their current password. */
const isTokenForAdmin = (payload, admin) =>
  payload?.sub === admin.id && payload.pwd === admin.passwordFingerprint();

/** Saves a successful sign-in and returns the session for the client. */
const completeSignIn = async (admin) => {
  admin.lastLoginAt = new Date();
  await admin.save();

  return { ...createSession(admin), admin: admin.toPublic() };
};

/* ---------- OTP ---------- */

/**
 * Emails a fresh OTP. Each admin has at most one OTP document: a new login overwrites it,
 * so any earlier code stops working.
 */
const issueOtp = async (admin) => {
  const pending = await AdminOtp.findOne({ admin: admin._id, expiresAt: { $gt: new Date() } });
  const nextSendAllowedAt = pending && new Date(pending.lastSentAt.getTime() + otpResendCooldownMs);

  if (nextSendAllowedAt && nextSendAllowedAt > new Date()) {
    throw new ApiError(
      429,
      `A code was just sent. Please wait ${secondsUntil(nextSendAllowedAt)}s before requesting another.`,
    );
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

/* ---------- login steps ---------- */

/**
 * Step 1: check email + password.
 * - 2FA off, or a device trusted in the last 48h → signed in straight away.
 * - Otherwise → a 6-digit OTP is emailed and a challengeId returned for step 2.
 */
export const login = async ({ email, password, trustToken }) => {
  const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

  if (!admin?.isActive) throw new ApiError(401, LOGIN_ERROR);

  const isPasswordCorrect = await admin.checkPassword(password);

  if (!isPasswordCorrect) throw new ApiError(401, LOGIN_ERROR);

  const trustedDevice = readToken(trustToken, TOKEN_TYPE.trustedDevice);
  const skipOtp = !twoFactorEnabled || isTokenForAdmin(trustedDevice, admin);

  if (skipOtp) {
    const session = await completeSignIn(admin);

    return { otpRequired: false, ...session };
  }

  const challengeId = await issueOtp(admin);

  return { otpRequired: true, challengeId };
};

/** Sends a new code for the same login attempt (30s cooldown, max 5 sends). */
export const sendOtp = async ({ challengeId }) => {
  const otp = await AdminOtp.findOne({ challengeId }).populate('admin');

  if (!otp || otp.expiresAt < new Date() || !otp.admin?.isActive) {
    throw new ApiError(401, 'Code expired. Please sign in again.');
  }

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

  otp.codeHash = hashOtp(otp.challengeId, code);
  otp.attempts = 0;
  otp.sendCount += 1;
  otp.lastSentAt = new Date();
  otp.expiresAt = fromNow(otpTtlMs);
  await otp.save();

  await sendOtpEmail({ to: otp.admin.email, code, name: otp.admin.name });

  return { sent: true };
};

/** Step 2: check the OTP → 48h session + 48h trusted-device token. */
export const verifyOtp = async ({ challengeId, code }) => {
  if (!/^\d{6}$/.test(code)) throw new ApiError(400, 'Enter the 6-digit code.');

  const otp = await AdminOtp.findOne({ challengeId });

  if (!otp || otp.expiresAt < new Date()) {
    throw new ApiError(401, 'Code expired. Please sign in again.');
  }

  if (otp.attempts >= otpMaxAttempts) {
    await otp.deleteOne();
    throw new ApiError(429, 'Too many attempts. Please sign in again.');
  }

  if (!isSameHash(hashOtp(challengeId, code), otp.codeHash)) {
    otp.attempts += 1;
    await otp.save();
    throw new ApiError(401, 'Incorrect code. Please try again.');
  }

  await otp.deleteOne();

  const admin = await Admin.findById(otp.admin).select('+passwordHash');

  if (!admin?.isActive) throw new ApiError(401, 'Account not available.');

  const session = await completeSignIn(admin);

  return { ...session, ...createTrustedDeviceToken(admin) };
};

/** The signed-in admin for a session token, or null. */
export const getAdminFromSession = async (token) => {
  const session = readToken(token, TOKEN_TYPE.session);

  if (!session) return null;

  const admin = await Admin.findById(session.sub).select('+passwordHash');

  return admin?.isActive && isTokenForAdmin(session, admin) ? admin : null;
};
