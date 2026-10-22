import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const limiter = (limit) =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please wait and try again.' },
  });

/** Sign-in, resend code and verify code: 30 tries per 15 minutes per IP. */
export const loginLimiter = limiter(30);

/** First-run admin setup: 10 tries per 15 minutes per IP. */
export const setupLimiter = limiter(10);
