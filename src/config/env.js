require('dotenv').config({ quiet: true });

const required = ['MONGO_URI', 'JWT_SECRET'];
required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

const nodeEnv = process.env.NODE_ENV || 'development';

module.exports = {
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

  jwtSecret: process.env.JWT_SECRET,

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
