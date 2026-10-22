import { ROLE_KEYS, ROLES, SUPER_ADMIN } from '../config/roles.js';
import Admin from '../models/Admin.js';
import ApiError from '../utils/ApiError.js';
import { MIN_PASSWORD_LENGTH, isEmail, isPassword } from '../utils/validators.js';

/**
 * Admin users (Team → Admin users, Super Admin only). Name, email and password live only in MongoDB.
 * Admins are never deleted — they are switched inactive instead.
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

/** At least one known role. Super Admin already opens everything, so it is stored alone. */
const toValidRoles = (roles) => {
  if (!Array.isArray(roles) || !roles.length) throw new ApiError(400, 'Choose at least one role.');

  const unknownRoles = roles.filter((role) => !ROLE_KEYS.includes(role));

  if (unknownRoles.length) throw new ApiError(400, `Unknown role: ${unknownRoles.join(', ')}.`);

  if (roles.includes(SUPER_ADMIN)) return [SUPER_ADMIN];

  return [...new Set(roles)];
};

const findAdminOrThrow = async (id) => {
  const admin = await Admin.findById(id).catch(() => null);

  if (!admin) throw new ApiError(404, 'Admin not found.');

  return admin;
};

const isActiveSuperAdmin = ({ roles, isActive }) => isActive && roles.includes(SUPER_ADMIN);

/** Taking this Super Admin away must still leave another active one. */
const assertAnotherActiveSuperAdmin = async (adminId) => {
  const otherSuperAdmins = await Admin.countDocuments({
    _id: { $ne: adminId },
    roles: SUPER_ADMIN,
    isActive: true,
  });

  if (!otherSuperAdmins) throw new ApiError(400, 'At least one active Super Admin is required.');
};

const createAdmin = async ({ email, password, name = 'Admin', roles }) => {
  assertEmail(email);
  assertPassword(password);
  assertName(name);

  const admin = new Admin({ email, name: name.trim(), roles: toValidRoles(roles) });

  await admin.setPassword(password);
  await admin.save(); // a duplicate email becomes a 409 in the error middleware

  return admin.toPublic();
};

/* ---------- routes ---------- */

/** GET /api/admin/admins/roles — every role with its label and what it opens */
export const getRoles = (_req, res) => {
  res.json(ROLE_KEYS.map((key) => ({ key, ...ROLES[key] })));
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

/** POST /api/admin/admins { name, email, password, roles } */
export const addAdmin = async (req, res) => {
  const admin = await createAdmin(req.body || {});

  res.status(201).json(admin);
};

/** POST /api/admin/admins/setup { name, email, password } — first run only, while no admin exists yet */
export const setupFirstAdmin = async (req, res) => {
  const hasAdmins = await Admin.exists({});

  if (hasAdmins) throw new ApiError(403, 'Setup is already done. Ask a Super Admin to add you.');

  const { email, password, name } = req.body || {};
  const admin = await createAdmin({ email, password, name, roles: [SUPER_ADMIN] });

  res.status(201).json(admin);
};

/** PATCH /api/admin/admins/:id { name?, email?, password?, roles?, isActive? } — only the fields sent change */
export const updateAdmin = async (req, res) => {
  const changes = req.body || {};
  const { email, name, roles, password, isActive } = changes;

  if (email) assertEmail(email);
  if (name) assertName(name);
  if (password) assertPassword(password);

  // isActive is a boolean, so `false` is a real value — check whether it was sent, not whether it is truthy
  const hasIsActive = 'isActive' in changes;

  if (hasIsActive && typeof isActive !== 'boolean') {
    throw new ApiError(400, 'isActive must be true or false.');
  }

  const hasRoles = 'roles' in changes;
  const newRoles = hasRoles && toValidRoles(roles);

  const admin = await findAdminOrThrow(req.params.id);
  const isSelf = admin._id.equals(req.admin._id);
  const isDeactivating = isActive === false;
  const isLosingSuperAdmin = hasRoles && !newRoles.includes(SUPER_ADMIN);

  if (isSelf && isDeactivating) throw new ApiError(400, "You can't deactivate your own account.");

  if (isActiveSuperAdmin(admin) && (isLosingSuperAdmin || isDeactivating)) {
    await assertAnotherActiveSuperAdmin(admin._id);
  }

  if (email) admin.email = email;
  if (name) admin.name = name.trim();
  if (hasRoles) admin.roles = newRoles;
  if (hasIsActive) admin.isActive = isActive;
  // A new password signs the admin out everywhere. Roles and active status are read from the
  // database on every request, so those changes apply straight away.
  if (password) await admin.setPassword(password);

  await admin.save();

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
