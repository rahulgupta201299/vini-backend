// Loads .env into process.env. Every module that reads config imports this file, and ESM runs it
// before the importing module's own code — so .env is always loaded before it is used.
import dotenv from 'dotenv';
import crypto from 'node:crypto';

dotenv.config({ quiet: true });

// JWT_SECRET is temporarily optional (commented out below). Restore it once JWT_SECRET is set on Vercel.
// const required = ['MONGO_URI', 'JWT_SECRET'];
const required = ['MONGO_URI'];
// Don't crash on import (on Vercel that turns every request into FUNCTION_INVOCATION_FAILED with no clue why).
// Missing variables are logged here and reported by GET /api/health; API calls answer 503 until they are set.
export const missingEnv = required.filter((key) => !process.env[key] || !String(process.env[key]).trim());
if (missingEnv.length) console.error(`[config] Missing required environment variable(s): ${missingEnv.join(', ')}`);

export const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
  missingEnv,
  nodeEnv,
  isProd: nodeEnv === 'production',
  port: parseInt(process.env.PORT, 10) || 8000,
  mongoUri: process.env.MONGO_URI,
  dbName: process.env.DB_NAME || 'vini',
  // Comma-separated list of frontend origins allowed to call the API
  clientUrls: (process.env.CLIENT_URLS || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean),

  // TEMPORARY fallback while JWT_SECRET is not set: a secret derived from MONGO_URI (private, already configured).
  // Never a hard-coded value — that would let anyone who reads the code forge admin logins.
  // Restore to `jwtSecret: process.env.JWT_SECRET,` when JWT_SECRET is added.
  jwtSecret:
    process.env.JWT_SECRET ||
    crypto.createHash('sha256').update(`vini-jwt-fallback:${process.env.MONGO_URI || ''}`).digest('hex'),

  // Admin auth
  admin: {
    // Email OTP after the password. ADMIN_2FA_ENABLED=false → email + password only (temporary, until SMTP is set up)
    twoFactorEnabled: (process.env.ADMIN_2FA_ENABLED || 'true') !== 'false',
    sessionTtlMs: 48 * 60 * 60 * 1000, // signed-in session: 48 hours
    trustTtlMs: 48 * 60 * 60 * 1000, // 2FA skipped on this device for 48 hours after a verified OTP
    otpTtlMs: 10 * 60 * 1000, // OTP valid for 10 minutes
    otpMaxAttempts: 5,
    otpResendCooldownMs: 30 * 1000,
    otpMaxSends: 5,
    maxFailedLogins: 5,
    lockMs: 15 * 60 * 1000,
  },

  // SMTP for OTP emails. If SMTP_HOST is empty in development, the OTP is printed to the console instead.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    secure: (process.env.SMTP_SECURE || 'true') === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
  },
};

export default config;
export const { isProd, port, mongoUri, dbName, clientUrls, jwtSecret, admin, smtp } = config;
