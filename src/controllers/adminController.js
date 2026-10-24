import {
  ADMIN,
  ADMIN_ROLES,
  emptyPermissions,
  isLevelWithin,
  LEVELS,
  MEMBER,
  PRESETS,
  ROLE_KEYS,
  SECTION_KEYS,
  SECTIONS,
  SUPER_ADMIN,
} from '../config/permissions.js';
import Admin from '../models/Admin.js';
import { toRolePermissionIds } from '../utils/accessCatalogue.js';
import ApiError from '../utils/ApiError.js';
import { MIN_PASSWORD_LENGTH, isEmail, isPassword } from '../utils/validators.js';

/**
 * Admin users (Team → Admin users). Name, email and password live only in MongoDB.
 * Super Admins manage everyone and are the only ones who give Delete access; Admins manage Members only,
 * up to their own access. Users are never deleted — they are switched inactive instead.
 */

/* ---------- helpers ---------- */

const assertEmail = (email) => {
  if (!isEmail(email)) throw new ApiError(400, 'Enter a valid email address.');
};

const assertPassword = (password) => {
  if (!isPassword(password)) {
    throw new ApiError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
};

const assertName = (name) => {
  const isValid = typeof name === 'string' && name.trim() && name.length <= 100;

  if (!isValid) throw new ApiError(400, 'Enter a valid name.');
};

const assertRole = (role) => {
  if (!ROLE_KEYS.includes(role)) throw new ApiError(400, `Unknown role: ${role}.`);
};

/** Permissions from a request, checked: a level per section, Delete only with edit in a deletable section. */
const toValidPermissions = (input = {}) => {
  if (typeof input !== 'object') throw new ApiError(400, 'Send permissions per section.');

  return Object.fromEntries(
    SECTION_KEYS.map((section) => {
      const { level = 'none', canDelete = false } = input[section] || {};

      if (!LEVELS.includes(level))
        throw new ApiError(400, `${SECTIONS[section].label}: unknown access "${level}".`);
      if (typeof canDelete !== 'boolean')
        throw new ApiError(400, `${SECTIONS[section].label}: canDelete must be true or false.`);

      const isDeletable = SECTIONS[section].deletable !== false;

      return [section, { level, canDelete: canDelete && level === 'edit' && isDeletable }];
    }),
  );
};

/**
 * What an Admin (not Super Admin) may set on a Member: per section, only up to its own level — a section where
 * the Admin has less access than asked (or than the Member already has) keeps the Member's current value.
 * Delete access is never changed by an Admin (only Super Admins give it).
 */
const limitToAdmin = ({ requested, current, actor }) =>
  Object.fromEntries(
    SECTION_KEYS.map((section) => {
      const { level: actorLevel } = actor[section];
      const { level: currentLevel, canDelete } = current[section];
      const { level: requestedLevel } = requested[section];
      const isAllowed =
        isLevelWithin(requestedLevel, actorLevel) && isLevelWithin(currentLevel, actorLevel);
      const level = isAllowed ? requestedLevel : currentLevel;

      return [section, { level, canDelete: canDelete && level === 'edit' }];
    }),
  );

const findAdminOrThrow = async (id) => {
  const admin = await Admin.findById(id).catch(() => null);

  if (!admin) throw new ApiError(404, 'Admin not found.');

  return admin;
};

const isActiveSuperAdmin = (admin) => admin.isActive && admin.getAccess().role === SUPER_ADMIN;

/** Taking this Super Admin away must still leave another active one. */
const assertAnotherActiveSuperAdmin = async (adminId) => {
  const otherSuperAdmins = await Admin.countDocuments({
    type: SUPER_ADMIN,
    _id: { $ne: adminId },
    isActive: true,
  });

  if (!otherSuperAdmins) throw new ApiError(400, 'At least one active Super Admin is required.');
};

/** A role key (superAdmin / admin / member) and permissions object → the stored fields: type, rolePermissionIds. */
const toAccessFields = async ({ role, permissions }) => ({
  type: role,
  rolePermissionIds: await toRolePermissionIds({ type: role, permissions }),
});

const createAdmin = async ({
  email,
  password,
  name = 'Admin',
  role = MEMBER,
  permissions = emptyPermissions(),
}) => {
  assertEmail(email);
  assertPassword(password);
  assertName(name);
  assertRole(role);

  const admin = new Admin({
    email,
    name: name.trim(),
    ...(await toAccessFields({ role, permissions })),
  });

  await admin.setPassword(password);
  await admin.save(); // a duplicate email becomes a 409 in the error middleware
  await admin.loadAccess();

  return admin.toPublic();
};

/* ---------- routes ---------- */

/** The role and permissions `actor` may give: Admins only Members, within their own access, without Delete. */
const toGrantedAccess = ({ actor, role, permissions, current }) => {
  const { role: actorRole, permissions: actorPermissions } = actor.getAccess();
  const requested = toValidPermissions(permissions);

  if (actorRole === SUPER_ADMIN) return { role, permissions: requested };

  if (role !== MEMBER)
    throw new ApiError(403, 'Only a Super Admin can make someone a Super Admin or Admin.');

  return { role, permissions: limitToAdmin({ requested, current, actor: actorPermissions }) };
};

/** GET /api/admin/admins/access-options — roles, sections and presets for the users screen */
export const getAccessOptions = (_req, res) => {
  res.json({
    roles: ROLE_KEYS.map((key) => ({ key, ...ADMIN_ROLES[key] })),
    sections: SECTION_KEYS.map((key) => ({
      key,
      ...SECTIONS[key],
      deletable: SECTIONS[key].deletable !== false,
    })),
    presets: Object.entries(PRESETS).map(([key, preset]) => ({ key, ...preset })),
    levels: LEVELS,
  });
};

/** GET /api/admin/admins — every admin, oldest first */
export const getAdmins = async (_req, res) => {
  const admins = await Admin.find().sort({ createdAt: 1 });

  res.json(admins.map((admin) => admin.toPublic()));
};

/** GET /api/admin/admins/:id */
export const getAdminById = async (req, res) => {
  const admin = await findAdminOrThrow(req.params.id);

  res.json(admin.toPublic());
};

/** POST /api/admin/admins { name, email, password, role, permissions } */
export const addAdmin = async (req, res) => {
  const { role = MEMBER, permissions = {}, ...account } = req.body || {};

  assertRole(role);

  const access = toGrantedAccess({
    actor: req.admin,
    role,
    permissions,
    current: emptyPermissions(),
  });
  const admin = await createAdmin({ ...account, ...access });

  res.status(201).json(admin);
};

/** POST /api/admin/admins/setup { name, email, password } — first run only, while no admin exists yet */
export const setupFirstAdmin = async (req, res) => {
  const hasAdmins = await Admin.exists({});

  if (hasAdmins) throw new ApiError(403, 'Setup is already done. Ask a Super Admin to add you.');

  const { email, password, name } = req.body || {};
  const admin = await createAdmin({
    email,
    password,
    name,
    role: SUPER_ADMIN,
    permissions: emptyPermissions(),
  });

  res.status(201).json(admin);
};

/**
 * PATCH /api/admin/admins/:id { name?, email?, password?, role?, permissions?, isActive? } — only the fields sent
 * change. Admins can only change Members (and never give Delete access).
 */
export const updateAdmin = async (req, res) => {
  const changes = req.body || {};
  const { email, name, role, permissions, password, isActive } = changes;

  if (email) assertEmail(email);
  if (name) assertName(name);
  if (password) assertPassword(password);
  if (role) assertRole(role);

  // isActive is a boolean, so `false` is a real value — check whether it was sent, not whether it is truthy
  const hasIsActive = 'isActive' in changes;

  if (hasIsActive && typeof isActive !== 'boolean') {
    throw new ApiError(400, 'isActive must be true or false.');
  }

  const admin = await findAdminOrThrow(req.params.id);
  const current = admin.getAccess();
  const { role: actorRole } = req.admin.getAccess();
  const isSelf = admin._id.equals(req.admin._id);
  const isDeactivating = isActive === false;
  const isChangingAccess = Boolean(role || permissions);

  if (actorRole === ADMIN && current.role !== MEMBER) {
    throw new ApiError(403, 'Only a Super Admin can change Super Admins and Admins.');
  }

  if (isSelf && isDeactivating) throw new ApiError(400, "You can't deactivate your own account.");

  const access = isChangingAccess
    ? toGrantedAccess({
        actor: req.admin,
        role: role || current.role,
        permissions: permissions || current.permissions,
        current: current.permissions,
      })
    : current;
  const isLosingSuperAdmin = access.role !== SUPER_ADMIN;

  if (isActiveSuperAdmin(admin) && (isLosingSuperAdmin || isDeactivating)) {
    await assertAnotherActiveSuperAdmin(admin._id);
  }

  if (email) admin.email = email;
  if (name) admin.name = name.trim();
  if (isChangingAccess) admin.set(await toAccessFields(access));
  if (hasIsActive) admin.isActive = isActive;
  // A new password signs the admin out everywhere. Role and permissions are read from the
  // database on every request, so those changes apply straight away.
  if (password) await admin.setPassword(password);

  await admin.save();
  await admin.loadAccess();

  res.json(admin.toPublic());
};

/** PATCH /api/admin/admins/me/password { currentPassword, newPassword } — any signed-in admin */
export const changeOwnPassword = async (req, res) => {
  const { currentPassword = '', newPassword } = req.body || {};
  const admin = await Admin.findById(req.admin._id).select('+passwordHash');
  const isCurrentCorrect = admin && (await admin.checkPassword(String(currentPassword)));

  if (!isCurrentCorrect) throw new ApiError(400, 'Current password is incorrect.');

  assertPassword(newPassword);

  await admin.setPassword(newPassword); // signs this admin out on every other device
  await admin.save();

  res.json({ ok: true });
};
