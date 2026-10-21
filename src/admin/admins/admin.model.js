import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { COLLECTIONS } from '../../config/collections.js';

export const ROLES = ['superadmin', 'admin', 'editor'];

const PASSWORD_HASH_ROUNDS = 12;

/** Admin accounts (collection admin.login). Managed through /api/admin/admins — never through env variables. */
const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true, default: 'Admin' },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'admin' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true, collection: COLLECTIONS.adminLogin },
);

adminSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
};

adminSchema.methods.checkPassword = function checkPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

/**
 * Short fingerprint of the password hash (needs `passwordHash` selected). Sign-in tokens carry it,
 * so setting a new password cancels every existing session and trusted device.
 */
adminSchema.methods.passwordFingerprint = function passwordFingerprint() {
  return crypto.createHash('sha256').update(this.passwordHash).digest('hex').slice(0, 16);
};

/** Safe to send to the client (never includes the password hash). */
adminSchema.methods.toPublic = function toPublic() {
  const { id, email, name, role, isActive, lastLoginAt, createdAt, updatedAt } = this;

  return { id, email, name, role, isActive, lastLoginAt, createdAt, updatedAt };
};

export default mongoose.model('Admin', adminSchema);
