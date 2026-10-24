import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';
import { WORKSPACE_KEYS } from '../config/permissions.js';

/** Admin roles (collection adminRoles): the workspaces — { role: 'web' }, { role: 'app' }, { role: 'store' }. */
const adminRoleSchema = new mongoose.Schema(
  { role: { type: String, enum: WORKSPACE_KEYS, required: true, unique: true } },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminRoles },
);

export default mongoose.model('AdminRole', adminRoleSchema);
