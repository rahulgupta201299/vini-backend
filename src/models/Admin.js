import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

import { accessFromDocs, ROLE_KEYS, SUPER_ADMIN, WORKSPACE_KEYS } from '../config/permissions.js';

const PASSWORD_HASH_ROUNDS = 12;

/**
 * Admin accounts (collection adminUsers). Managed through /api/admin/admins — never through env variables.
 *   type               superAdmin / admin / member. Super Admins can do everything — they need no access documents.
 *   rolePermissionIds  → adminRolePermission: one per workspace it works in, each a role (adminRoles) with its
 *                      permissions (adminPermissions)
 * The access documents are joined in (populated) whenever an account is loaded.
 */
const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true, default: 'Admin' },
    passwordHash: { type: String, required: true, select: false },
    type: { type: String, enum: ROLE_KEYS, required: true },
    rolePermissionIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AdminRolePermission' }],
      default: [],
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true, collection: COLLECTIONS.adminUsers },
);

/** Every find joins the access in: rolePermissionIds → { roleId: { role }, permissionIds: [{ section, level, canDelete }] }. */
const ACCESS_POPULATE = {
  path: 'rolePermissionIds',
  select: 'roleId permissionIds',
  populate: [
    { path: 'roleId', select: 'role' },
    { path: 'permissionIds', select: 'section level canDelete' },
  ],
};

adminSchema.pre(['find', 'findOne'], function joinAccess() {
  this.populate(ACCESS_POPULATE);
});

/** Joins the access into a document that was just created or changed. */
adminSchema.methods.loadAccess = function loadAccess() {
  return this.populate(ACCESS_POPULATE);
};

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

/** `role` (the user's type) and per-section permissions ({ homepage: { level, canDelete }, … }), from the joined permissions. */
adminSchema.methods.getAccess = function access() {
  const { type, rolePermissionIds } = this;

  return accessFromDocs(type, rolePermissionIds);
};

/** Safe to send to the client (never includes the password hash). */
adminSchema.methods.toPublic = function toPublic() {
  const { id, email, name, isActive, lastLoginAt, createdAt, updatedAt } = this;

  const { role } = this.getAccess();
  // Super Admins work everywhere
  const workspaces =
    role === SUPER_ADMIN
      ? WORKSPACE_KEYS
      : this.rolePermissionIds.map(({ roleId }) => roleId?.role).filter(Boolean);

  return {
    id,
    email,
    name,
    ...this.getAccess(),
    workspaces,
    isActive,
    lastLoginAt,
    createdAt,
    updatedAt,
  };
};

export default mongoose.model('Admin', adminSchema);
