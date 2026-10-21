import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

export const ROLES = ['superadmin', 'admin', 'editor'];

const PASSWORD_HASH_ROUNDS = 12;

/** Admin accounts (admins collection). Managed through /api/admin/admins — never through env variables. */
const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true, default: 'Admin' },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'admin' },
    isActive: { type: Boolean, default: true },
    // Bumping this signs the admin out everywhere (all sessions and trusted devices)
    tokenVersion: { type: Number, default: 0 },
    failedLoginCount: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true, collection: 'admins' },
);

adminSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
};

adminSchema.methods.checkPassword = function checkPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

/** Safe to send to the client (no password hash or security counters). */
adminSchema.methods.toPublic = function toPublic() {
  const { id, email, name, role, isActive, lastLoginAt, createdAt, updatedAt } = this;

  return { id, email, name, role, isActive, lastLoginAt, createdAt, updatedAt };
};

export default mongoose.model('Admin', adminSchema);
