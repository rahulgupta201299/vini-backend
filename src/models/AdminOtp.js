import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

/**
 * Pending email OTP — at most ONE per admin: a new login overwrites it with a new code.
 * MongoDB deletes it automatically after `expiresAt` (TTL index, checked about every minute);
 * the service also deletes it right after a successful verify or too many wrong attempts.
 */
const adminOtpSchema = new mongoose.Schema(
  {
    challengeId: { type: String, required: true, unique: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, unique: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    sendCount: { type: Number, default: 1 },
    lastSentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: COLLECTIONS.adminOtps },
);

adminOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AdminOtp', adminOtpSchema);
