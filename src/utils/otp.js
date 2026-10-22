import crypto from 'node:crypto';

import { jwtSecret } from '../config/env.js';

/** A random 6-digit code, e.g. "048213". */
export const createOtpCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

/** Codes are stored only as a hash, tied to their login attempt (challengeId). */
export const hashOtp = (challengeId, code) =>
  crypto.createHmac('sha256', jwtSecret).update(`${challengeId}:${code}`).digest('hex');

/** Compares two hashes in constant time. */
export const isSameHash = (a, b) => {
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

export const secondsUntil = (date) => Math.ceil((date.getTime() - Date.now()) / 1000);
