import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';
import { PERMISSION_SECTIONS } from '../config/permissions.js';

/**
 * Access catalogue (collection adminPermissions): one unique document per section and level, shared by every
 * workspace — e.g. { section: 'dashboard', level: 'view' } serves the Web, App and Store dashboards alike.
 * adminRolePermission joins a workspace (adminRoles) with the ones it grants.
 */
const adminPermissionSchema = new mongoose.Schema(
  {
    section: { type: String, enum: PERMISSION_SECTIONS, required: true },
    level: { type: String, enum: ['view', 'edit'], required: true },
    canDelete: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminPermissions },
);

adminPermissionSchema.index({ section: 1, level: 1, canDelete: 1 }, { unique: true });

export default mongoose.model('AdminPermission', adminPermissionSchema);
