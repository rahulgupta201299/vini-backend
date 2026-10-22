import jwt from 'jsonwebtoken';

import { jwtSecret } from '../config/env.js';

/**
 * Admin sign-in tokens (JWT). Nothing is stored in MongoDB: a token carries the admin id and a
 * fingerprint of the password, so setting a new password cancels every token issued before it.
 */

export const fromNow = (ms) => new Date(Date.now() + ms);

/** Signs a token for the admin (needs `passwordHash` selected). */
export const signToken = (admin, type, ttlMs) => {
  const payload = { sub: admin.id, typ: type, pwd: admin.passwordFingerprint() };
  const token = jwt.sign(payload, jwtSecret, { expiresIn: Math.floor(ttlMs / 1000) });

  return { token, expiresAt: fromNow(ttlMs) };
};

/** The token's payload when it is valid and of the expected type, otherwise null. */
export const readToken = (token, type) => {
  if (typeof token !== 'string' || !token) return null;

  try {
    const payload = jwt.verify(token, jwtSecret);

    if (payload.typ !== type) return null;

    return payload;
  } catch {
    return null;
  }
};

/** True when the token belongs to this admin and was issued with their current password. */
export const isTokenForAdmin = (payload, admin) => {
  if (!payload) return false;

  return payload.sub === admin.id && payload.pwd === admin.passwordFingerprint();
};
