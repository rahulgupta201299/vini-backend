import ApiError from '../../common/utils/ApiError.js';
import { MIN_PASSWORD_LENGTH, isEmail, isPassword } from '../../common/utils/validators.js';

import Admin from './admin.model.js';
import { ROLE_KEYS, ROLES, SUPER_ADMIN } from './admin.roles.js';

/* ---------- validation ---------- */

const assertEmail = (email) => {
  if (!isEmail(email)) throw new ApiError(400, 'Enter a valid email address.');
};

const assertPassword = (password) => {
  if (!isPassword(password)) {
    throw new ApiError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
};

const assertName = (name) => {
  if (typeof name !== 'string' || !name.trim() || name.length > 100) {
    throw new ApiError(400, 'Enter a valid name.');
  }
};

/** At least one valid role. Super Admin already opens everything, so it is stored alone. */
const toValidRoles = (roles) => {
  if (!Array.isArray(roles) || !roles.length) throw new ApiError(400, 'Choose at least one role.');

  const unknown = roles.filter((role) => !ROLE_KEYS.includes(role));

  if (unknown.length) throw new ApiError(400, `Unknown role: ${unknown.join(', ')}.`);

  return roles.includes(SUPER_ADMIN) ? [SUPER_ADMIN] : [...new Set(roles)];
};

/* ---------- helpers ---------- */

const findAdminOrThrow = async (id) => {
  const admin = await Admin.findById(id).catch(() => null);

  if (!admin) throw new ApiError(404, 'Admin not found.');

  return admin;
};

const isActiveSuperAdmin = ({ roles, isActive }) => isActive && roles.includes(SUPER_ADMIN);

/** Makes sure taking this Super Admin away still leaves another active one. */
const assertAnotherActiveSuperAdmin = async (adminId) => {
  const others = await Admin.countDocuments({
    _id: { $ne: adminId },
    roles: SUPER_ADMIN,
    isActive: true,
  });

  if (!others) throw new ApiError(400, 'At least one active Super Admin is required.');
};

/* ---------- actions ---------- */

/** Every role with its label and what it opens (for the admin users screen). */
export const listRoles = () => ROLE_KEYS.map((key) => ({ key, ...ROLES[key] }));

export const list = async () => {
  const admins = await Admin.find().sort({ createdAt: 1 });

  return admins.map((admin) => admin.toPublic());
};

export const get = async (id) => {
  const admin = await findAdminOrThrow(id);

  return admin.toPublic();
};

export const create = async ({ email, password, name = 'Admin', roles }) => {
  assertEmail(email);
  assertPassword(password);
  assertName(name);

  const admin = new Admin({ email, name: name.trim(), roles: toValidRoles(roles) });

  await admin.setPassword(password);
  await admin.save(); // a duplicate email becomes a 409 in the error middleware

  return admin.toPublic();
};

/** First run only: creates the first Super Admin while there are no admins yet. */
export const setup = async ({ email, password, name }) => {
  const hasAdmins = await Admin.exists({});

  if (hasAdmins) throw new ApiError(403, 'Setup is already done. Ask a Super Admin to add you.');

  return create({ email, password, name, roles: [SUPER_ADMIN] });
};

/** Updates only the fields that were sent. */
export const update = async (id, changes, actor) => {
  const { email, name, roles, password, isActive } = changes;

  if (email) assertEmail(email);
  if (name) assertName(name);
  if (password) assertPassword(password);

  const newRoles = 'roles' in changes ? toValidRoles(roles) : null;

  // isActive is a boolean, so `false` is a real value here — check its type instead of truthiness
  const hasIsActive = typeof isActive === 'boolean';

  if ('isActive' in changes && !hasIsActive) {
    throw new ApiError(400, 'isActive must be true or false.');
  }

  const admin = await findAdminOrThrow(id);
  const isSelf = admin._id.equals(actor._id);
  const isDeactivating = isActive === false;
  const isLosingSuperAdmin = newRoles && !newRoles.includes(SUPER_ADMIN);

  if (isSelf && isDeactivating) throw new ApiError(400, "You can't deactivate your own account.");

  if (isActiveSuperAdmin(admin) && (isLosingSuperAdmin || isDeactivating)) {
    await assertAnotherActiveSuperAdmin(admin._id);
  }

  if (email) admin.email = email;
  if (name) admin.name = name.trim();
  if (newRoles) admin.roles = newRoles;
  if (hasIsActive) admin.isActive = isActive;
  // A new password signs the admin out everywhere. Roles and active status are checked
  // against the database on every request, so those changes apply immediately.
  if (password) await admin.setPassword(password);

  await admin.save();

  return admin.toPublic();
};

/** The signed-in admin changes their own password (the current one is required). */
export const changeOwnPassword = async (actor, { currentPassword = '', newPassword }) => {
  const admin = await Admin.findById(actor._id).select('+passwordHash');
  const isCurrentCorrect = admin && (await admin.checkPassword(String(currentPassword)));

  if (!isCurrentCorrect) throw new ApiError(400, 'Current password is incorrect.');

  assertPassword(newPassword);

  await admin.setPassword(newPassword); // signs this admin out on every other device
  await admin.save();

  return { ok: true };
};
