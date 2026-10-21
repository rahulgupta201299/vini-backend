const asyncHandler = require('../../common/utils/asyncHandler');
const ApiError = require('../../common/utils/ApiError');
const auth = require('./login.service');
const { SESSION_COOKIE } = require('./login.middleware');
const { isProd } = require('../../config/env');

const TRUST_COOKIE = 'vini_admin_trusted';
const cookieOpts = (expires) => ({ httpOnly: true, secure: isProd, sameSite: 'strict', path: '/', expires });

const isEmail = (v) => typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** POST /admin/auth/login { email, password, trustToken? } */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!isEmail(email) || typeof password !== 'string' || !password || password.length > 200) {
    throw new ApiError(400, 'Enter a valid email and password.');
  }
  const trustToken = req.body.trustToken || req.cookies?.[TRUST_COOKIE];
  const result = await auth.login({ email, password, trustToken });
  if (!result.otpRequired) res.cookie(SESSION_COOKIE, result.token, cookieOpts(result.expiresAt));
  res.json(result);
});

/** POST /admin/auth/send-otp { challengeId } — sends a new code for the same login attempt. */
exports.sendOtp = asyncHandler(async (req, res) => {
  const { challengeId } = req.body || {};
  if (!challengeId) throw new ApiError(400, 'challengeId is required.');
  res.json(await auth.sendOtp({ challengeId }));
});

/** POST /admin/auth/verify-otp { challengeId, code } — on success the device skips 2FA for 48h. */
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { challengeId, code } = req.body || {};
  if (!challengeId) throw new ApiError(400, 'challengeId is required.');
  const result = await auth.verifyOtp({ challengeId, code });
  res.cookie(SESSION_COOKIE, result.token, cookieOpts(result.expiresAt));
  res.cookie(TRUST_COOKIE, result.trustToken, cookieOpts(result.trustExpiresAt));
  res.json(result);
});

/** GET /admin/auth/me */
exports.me = (req, res) => res.json(req.admin.toPublic());

/**
 * POST /admin/auth/logout — sessions are stateless, so signing out means the client drops its session token/cookie.
 * The trusted-device cookie is kept so 2FA stays skipped for its 48h.
 */
exports.logout = (req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
};
