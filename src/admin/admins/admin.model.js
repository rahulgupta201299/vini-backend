import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/** Admin accounts (admins collection). Created and managed through /api/admin/admins — never from env variables. */
const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true, default: 'Admin' },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['superadmin', 'admin', 'editor'], default: 'admin' },
    isActive: { type: Boolean, default: true },
    // Bumping this invalidates every session and trusted device for the admin (e.g. after a password change)
    tokenVersion: { type: Number, default: 0 },
    failedLoginCount: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true, collection: 'admins' }
);

adminSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

adminSchema.methods.checkPassword = function checkPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

adminSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    role: this.role,
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

adminSchema.statics.ROLES = ['superadmin', 'admin', 'editor'];

export default mongoose.model('Admin', adminSchema);
