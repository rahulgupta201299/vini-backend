import ApiError from '../../common/utils/ApiError.js';
import { isEmail, isFilledPassword } from '../../common/utils/validators.js';
import { isProd } from '../../config/env.js';

import { SESSION_COOKIE, TRUSTED_DEVICE_COOKIE } from './login.constants.js';
import * as loginService from './login.service.js';

const cookieOptions = (expires) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  path: '/',
  expires,
});

const requireChallengeId = (challengeId) => {
  if (typeof challengeId !== 'string' || !challengeId) {
    throw new ApiError(400, 'challengeId is required.');
  }
};

/** POST /api/admin/auth/login { email, password, trustToken? } */
export const login = async (req, res) => {
  const { email, password, trustToken = req.cookies?.[TRUSTED_DEVICE_COOKIE] } = req.body ?? {};

  if (!isEmail(email) || !isFilledPassword(password)) {
    throw new ApiError(400, 'Enter a valid email and password.');
  }

  const result = await loginService.login({ email, password, trustToken });

  if (!result.otpRequired) {
    res.cookie(SESSION_COOKIE, result.token, cookieOptions(result.expiresAt));
  }

  res.json(result);
};

/** POST /api/admin/auth/send-otp { challengeId } — a new code for the same login attempt. */
export const sendOtp = async (req, res) => {
  const { challengeId } = req.body ?? {};

  requireChallengeId(challengeId);

  res.json(await loginService.sendOtp({ challengeId }));
};

/** POST /api/admin/auth/verify-otp { challengeId, code } — on success this device skips 2FA for 48h. */
export const verifyOtp = async (req, res) => {
  const { challengeId, code = '' } = req.body ?? {};

  requireChallengeId(challengeId);

  const result = await loginService.verifyOtp({ challengeId, code: String(code) });

  res.cookie(SESSION_COOKIE, result.token, cookieOptions(result.expiresAt));
  res.cookie(TRUSTED_DEVICE_COOKIE, result.trustToken, cookieOptions(result.trustExpiresAt));
  res.json(result);
};

/** GET /api/admin/auth/me */
export const me = (req, res) => res.json(req.admin.toPublic());

/**
 * POST /api/admin/auth/logout — sessions are stateless, so signing out just drops the session cookie.
 * The trusted-device cookie stays, so 2FA remains skipped for its 48h.
 */
export const logout = (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
};
