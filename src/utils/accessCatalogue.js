import {
  PERMISSION_SECTIONS,
  permissionSectionOf,
  SECTION_KEYS,
  SECTIONS,
  SUPER_ADMIN,
  WORKSPACE_KEYS,
} from '../config/permissions.js';
import AdminPermission from '../models/AdminPermission.js';
import AdminRole from '../models/AdminRole.js';
import AdminRolePermission from '../models/AdminRolePermission.js';

/** A permission section can be deleted in when any workspace's section using it is deletable. */
const isDeletable = (permissionSection) =>
  SECTION_KEYS.some(
    (key) => permissionSectionOf(key) === permissionSection && SECTIONS[key].deletable !== false,
  );

/** The adminPermissions documents: per permission section View, Edit, and Edit + Delete (when deletable). */
const permissionDocs = () =>
  PERMISSION_SECTIONS.flatMap((section) => {
    const docs = [
      { section, level: 'view', canDelete: false },
      { section, level: 'edit', canDelete: false },
    ];

    if (!isDeletable(section)) return docs;

    return [...docs, { section, level: 'edit', canDelete: true }];
  });

const upsertEach = (docs) =>
  docs.map((doc) => ({ updateOne: { filter: doc, update: { $setOnInsert: doc }, upsert: true } }));

/**
 * Makes sure every role (workspace) and permission exists — insert-only, so nothing saved is changed.
 * Runs once per server start, right after MongoDB connects.
 */
export const ensureAccessCatalogue = async () => {
  await AdminRole.bulkWrite(upsertEach(WORKSPACE_KEYS.map((role) => ({ role }))));
  await AdminPermission.bulkWrite(upsertEach(permissionDocs()));
};

const byId = (a, b) => String(a).localeCompare(String(b));

/** The shared adminRolePermission document for a role and permission set — reused, or created when new. */
const findOrCreateRolePermission = async (roleId, permissionIds) => {
  const sortedIds = [...permissionIds].sort(byId);
  const existing = await AdminRolePermission.findOne({ roleId, permissionIds: sortedIds });

  if (existing) return existing._id;

  const created = await AdminRolePermission.create({ roleId, permissionIds: sortedIds });

  return created._id;
};

/**
 * A user's type and permissions ({ homepage: { level, canDelete }, … }) → its `rolePermissionIds`:
 * one shared adminRolePermission per workspace it has access in. Super Admins need none.
 */
export const toRolePermissionIds = async ({ type, permissions }) => {
  if (type === SUPER_ADMIN) return [];

  const granted = SECTION_KEYS.filter((section) => permissions[section].level !== 'none');
  const workspaces = WORKSPACE_KEYS.filter((workspace) =>
    granted.some((section) => SECTIONS[section].workspace === workspace),
  );

  const ids = await Promise.all(
    workspaces.map(async (workspace) => {
      const role = await AdminRole.findOne({ role: workspace });
      const filters = granted
        .filter((section) => SECTIONS[section].workspace === workspace)
        .map((section) => {
          const { level, canDelete } = permissions[section];

          return {
            section: permissionSectionOf(section),
            level,
            canDelete: level === 'edit' && Boolean(canDelete),
          };
        });
      const permissionDocsFound = await AdminPermission.find({ $or: filters }).select('_id');

      return findOrCreateRolePermission(
        role._id,
        permissionDocsFound.map(({ _id }) => _id),
      );
    }),
  );

  return ids;
};
