import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

/**
 * One workspace's access (collection adminRolePermission): a role (adminRoles, e.g. web) with the permissions it
 * grants there (adminPermissions). One shared document per unique combination — users with the same access point
 * to the same document. `permissionIds` are kept sorted so equal sets match.
 */
const adminRolePermissionSchema = new mongoose.Schema(
  {
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminRole', required: true },
    permissionIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AdminPermission' }],
      default: [],
    },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminRolePermission },
);

adminRolePermissionSchema.index({ roleId: 1 });

export default mongoose.model('AdminRolePermission', adminRolePermissionSchema);
