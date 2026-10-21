import mongoose from 'mongoose';

/**
 * Pending email OTP — at most ONE document per admin (unique `admin`): a new login overwrites it with a new code.
 * MongoDB deletes each document automatically once `expiresAt` passes (TTL index, checked about every 60s),
 * and the service deletes it immediately after a successful verify or too many wrong attempts.
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
  { timestamps: true, collection: 'admin_otps' }
);

adminOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AdminOtp', adminOtpSchema);
