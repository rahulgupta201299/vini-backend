/**
 * App configuration, read once from environment variables (.env locally, Vercel settings in production).
 * Every module that needs config imports from here, so .env is always loaded first.
 */
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const {
  NODE_ENV = 'development',
  PORT = '8000',
  MONGO_URI = '',
  DB_NAME = 'vini',
  CLIENT_URLS = 'http://localhost:3000,http://localhost:5173',
  JWT_SECRET,
  ADMIN_2FA_ENABLED = 'true',
  SMTP_HOST = '',
  SMTP_PORT = '465',
  SMTP_SECURE = 'true',
  SMTP_USER = '',
  SMTP_PASS = '',
  MAIL_FROM = SMTP_USER,
} = process.env;

// JWT_SECRET is temporarily optional — add it back to this list once it is set on Vercel.
const REQUIRED_VARS = ['MONGO_URI'];

/** Required variables that are not set. The app still starts; GET /api/health reports them. */
export const missingEnv = REQUIRED_VARS.filter((key) => !process.env[key]?.trim());

if (missingEnv.length) {
  console.error(`[config] Missing required environment variable(s): ${missingEnv.join(', ')}`);
}

export const nodeEnv = NODE_ENV;
export const isProd = NODE_ENV === 'production';
export const port = Number(PORT);
export const mongoUri = MONGO_URI;
export const dbName = DB_NAME;

/** Frontend origins allowed by CORS in production (development also allows any localhost). */
export const clientUrls = CLIENT_URLS.split(',')
  .map((url) => url.trim())
  .filter(Boolean);

/**
 * Signs admin tokens and OTP hashes. TEMPORARY fallback while JWT_SECRET is not set: a secret derived
 * from MONGO_URI (private and already configured) — never a hard-coded value anyone could read.
 */
export const jwtSecret =
  JWT_SECRET || crypto.createHash('sha256').update(`vini-jwt-fallback:${MONGO_URI}`).digest('hex');

export const adminAuth = {
  // Email OTP after the password. ADMIN_2FA_ENABLED=false → email + password only.
  twoFactorEnabled: ADMIN_2FA_ENABLED !== 'false',
  sessionTtlMs: 48 * HOUR,
  trustedDeviceTtlMs: 48 * HOUR, // no OTP on this device for 48h after a verified code
  otpTtlMs: 10 * MINUTE,
  otpMaxAttempts: 5,
  otpMaxSends: 5,
  otpResendCooldownMs: 30 * 1000,
  maxFailedLogins: 5,
  lockDurationMs: 15 * MINUTE,
};

/** SMTP for OTP emails. With no SMTP_HOST in development, the OTP is printed to the console. */
export const smtp = {
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === 'true',
  user: SMTP_USER,
  pass: SMTP_PASS,
  from: MAIL_FROM,
};
