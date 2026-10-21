const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Admin = require('../admins/admin.model');
const AdminOtp = require('./adminOtp.model');
const ApiError = require('../../common/utils/ApiError');
const { sendOtpEmail } = require('../../common/services/mail.service');
const { jwtSecret, admin: cfg } = require('../../config/env');

const GENERIC_LOGIN_ERROR = 'Incorrect email or password.';

const hashOtp = (challengeId, code) => crypto.createHmac('sha256', jwtSecret).update(`${challengeId}:${code}`).digest('hex');
const newOtpCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/* ---------- tokens ---------- */

/**
 * Creates a 48h session token. Sessions are stateless (nothing stored in MongoDB): the signed token carries the
 * admin id and tokenVersion. Bumping admin.tokenVersion (e.g. password reset) invalidates all of that admin's tokens.
 */
function createSession(admin) {
  const expiresAt = new Date(Date.now() + cfg.sessionTtlMs);
  const token = jwt.sign({ sub: admin._id.toString(), typ: 'admin-session', ver: admin.tokenVersion }, jwtSecret, {
    expiresIn: Math.floor(cfg.sessionTtlMs / 1000),
  });
  return { token, expiresAt };
}

/** Trusted-device token: while valid, login with the right password skips the email OTP. */
function createTrustToken(admin) {
  const trustExpiresAt = new Date(Date.now() + cfg.trustTtlMs);
  const trustToken = jwt.sign({ sub: admin._id.toString(), typ: 'admin-trust', ver: admin.tokenVersion }, jwtSecret, {
    expiresIn: Math.floor(cfg.trustTtlMs / 1000),
  });
  return { trustToken, trustExpiresAt };
}

function readToken(token, typ) {
  if (!token || typeof token !== 'string') return null;
  try {
    const p = jwt.verify(token, jwtSecret);
    return p.typ === typ ? p : null;
  } catch {
    return null;
  }
}

/* ---------- OTP ---------- */

/**
 * Emails a fresh OTP. Each admin has at most ONE OTP document: a new login overwrites it
 * (new challengeId + code, counters reset), so any earlier code stops working.
 * Documents are deleted by MongoDB automatically once expired (TTL index on expiresAt) or right after a successful verify.
 */
async function issueOtp(admin) {
  const existing = await AdminOtp.findOne({ admin: admin._id, expiresAt: { $gt: new Date() } }).select('lastSentAt');
  const wait = existing ? existing.lastSentAt.getTime() + cfg.otpResendCooldownMs - Date.now() : 0;
  if (wait > 0) throw new ApiError(429, `A code was just sent. Please wait ${Math.ceil(wait / 1000)}s before requesting another.`);

  const challengeId = crypto.randomBytes(24).toString('base64url');
  const code = newOtpCode();
  await AdminOtp.findOneAndUpdate(
    { admin: admin._id },
    {
      challengeId,
      codeHash: hashOtp(challengeId, code),
      attempts: 0,
      sendCount: 1,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + cfg.otpTtlMs),
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await sendOtpEmail({ to: admin.email, code, name: admin.name });
  return challengeId;
}

/* ---------- steps ---------- */

/**
 * Step 1: check email + password.
 * - Valid trusted-device token for this admin → signed in straight away (no OTP).
 * - Otherwise → emails a 6-digit OTP and returns a challengeId for step 2.
 */
exports.login = async ({ email, password, trustToken }) => {
  const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash +failedLoginCount +lockUntil');
  if (!admin || !admin.isActive) throw new ApiError(401, GENERIC_LOGIN_ERROR);
  if (admin.lockUntil && admin.lockUntil > new Date()) throw new ApiError(429, 'Too many failed attempts. Try again in a few minutes.');

  if (!(await admin.checkPassword(password))) {
    admin.failedLoginCount = (admin.failedLoginCount || 0) + 1;
    if (admin.failedLoginCount >= cfg.maxFailedLogins) {
      admin.lockUntil = new Date(Date.now() + cfg.lockMs);
      admin.failedLoginCount = 0;
    }
    await admin.save();
    throw new ApiError(401, GENERIC_LOGIN_ERROR);
  }

  admin.failedLoginCount = 0;
  admin.lockUntil = undefined;

  const trust = readToken(trustToken, 'admin-trust');
  const trusted = trust && trust.sub === admin._id.toString() && trust.ver === admin.tokenVersion;
  // 2FA off (ADMIN_2FA_ENABLED=false) or a device trusted in the last 48h → signed in without an OTP
  if (!cfg.twoFactorEnabled || trusted) {
    admin.lastLoginAt = new Date();
    await admin.save();
    const session = createSession(admin);
    return { otpRequired: false, ...session, admin: admin.toPublic() };
  }

  await admin.save();
  const challengeId = await issueOtp(admin);
  return { otpRequired: true, challengeId };
};

/** Re-sends a fresh OTP for an existing challenge (30s cooldown, max 5 sends). */
exports.sendOtp = async ({ challengeId }) => {
  const otp = await AdminOtp.findOne({ challengeId: String(challengeId) }).populate('admin');
  if (!otp || otp.expiresAt < new Date() || !otp.admin?.isActive) throw new ApiError(401, 'Code expired. Please sign in again.');
  if (otp.sendCount >= cfg.otpMaxSends) throw new ApiError(429, 'Too many codes requested. Please sign in again.');
  const wait = otp.lastSentAt.getTime() + cfg.otpResendCooldownMs - Date.now();
  if (wait > 0) throw new ApiError(429, `Please wait ${Math.ceil(wait / 1000)}s before requesting a new code.`);

  const code = newOtpCode();
  otp.codeHash = hashOtp(otp.challengeId, code);
  otp.attempts = 0;
  otp.sendCount += 1;
  otp.lastSentAt = new Date();
  otp.expiresAt = new Date(Date.now() + cfg.otpTtlMs);
  await otp.save();
  await sendOtpEmail({ to: otp.admin.email, code, name: otp.admin.name });
  return { sent: true };
};

/** Step 2: validate the OTP → 48h session + 48h trusted-device token. */
exports.verifyOtp = async ({ challengeId, code }) => {
  if (!/^\d{6}$/.test(String(code))) throw new ApiError(400, 'Enter the 6-digit code.');
  const otp = await AdminOtp.findOne({ challengeId: String(challengeId) });
  if (!otp || otp.expiresAt < new Date()) throw new ApiError(401, 'Code expired. Please sign in again.');
  if (otp.attempts >= cfg.otpMaxAttempts) {
    await otp.deleteOne();
    throw new ApiError(429, 'Too many attempts. Please sign in again.');
  }

  if (!safeEqual(hashOtp(otp.challengeId, String(code)), otp.codeHash)) {
    otp.attempts += 1;
    await otp.save();
    throw new ApiError(401, 'Incorrect code. Please try again.');
  }

  await otp.deleteOne();
  const admin = await Admin.findById(otp.admin);
  if (!admin || !admin.isActive) throw new ApiError(401, 'Account not available.');
  admin.lastLoginAt = new Date();
  await admin.save();

  const session = createSession(admin);
  return { ...session, ...createTrustToken(admin), admin: admin.toPublic() };
};

/** Resolves a session token to the admin, or null. */
exports.getAdminFromSession = async (token) => {
  const p = readToken(token, 'admin-session');
  if (!p) return null;
  const admin = await Admin.findById(p.sub);
  if (!admin || !admin.isActive || admin.tokenVersion !== p.ver) return null;
  return admin;
};
