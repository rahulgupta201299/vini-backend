import ApiError from '../../common/utils/ApiError.js';
import { MIN_PASSWORD_LENGTH, isEmail, isPassword } from '../../common/utils/validators.js';

import Admin, { ROLES } from './admin.model.js';

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

const assertRole = (role) => {
  if (!ROLES.includes(role)) throw new ApiError(400, `Role must be one of: ${ROLES.join(', ')}.`);
};

/* ---------- helpers ---------- */

const findAdminOrThrow = async (id) => {
  const admin = await Admin.findById(id).catch(() => null);

  if (!admin) throw new ApiError(404, 'Admin not found.');

  return admin;
};

/** Makes sure removing this superadmin still leaves another active one. */
const assertAnotherActiveSuperadmin = async (adminId) => {
  const others = await Admin.countDocuments({
    _id: { $ne: adminId },
    role: 'superadmin',
    isActive: true,
  });

  if (!others) throw new ApiError(400, 'At least one active superadmin is required.');
};

const isActiveSuperadmin = ({ role, isActive }) => role === 'superadmin' && isActive;

/* ---------- actions ---------- */

export const list = async () => {
  const admins = await Admin.find().sort({ createdAt: 1 });

  return admins.map((admin) => admin.toPublic());
};

export const get = async (id) => {
  const admin = await findAdminOrThrow(id);

  return admin.toPublic();
};

export const create = async ({ email, password, name = 'Admin', role = 'admin' }) => {
  assertEmail(email);
  assertPassword(password);
  assertName(name);
  assertRole(role);

  const admin = new Admin({ email, name: name.trim(), role });

  await admin.setPassword(password);
  await admin.save(); // a duplicate email becomes a 409 in the error middleware

  return admin.toPublic();
};

/** First run only: creates the first superadmin while there are no admins yet. */
export const setup = async ({ email, password, name }) => {
  const hasAdmins = await Admin.exists({});

  if (hasAdmins) throw new ApiError(403, 'Setup is already done. Ask a superadmin to add you.');

  return create({ email, password, name, role: 'superadmin' });
};

/** Updates only the fields that were sent. */
export const update = async (id, changes, actor) => {
  const { email, name, role, password, isActive } = changes;

  if (email) assertEmail(email);
  if (name) assertName(name);
  if (role) assertRole(role);
  if (password) assertPassword(password);

  // isActive is a boolean, so `false` is a real value here — check its type instead of truthiness
  const hasIsActive = typeof isActive === 'boolean';

  if ('isActive' in changes && !hasIsActive) {
    throw new ApiError(400, 'isActive must be true or false.');
  }

  const admin = await findAdminOrThrow(id);
  const isDeactivating = isActive === false;
  const isDemoting = role && role !== 'superadmin';

  if (isDeactivating && admin._id.equals(actor._id)) {
    throw new ApiError(400, "You can't deactivate your own account.");
  }

  if (isActiveSuperadmin(admin) && (isDemoting || isDeactivating)) {
    await assertAnotherActiveSuperadmin(admin._id);
  }

  if (email) admin.email = email;
  if (name) admin.name = name.trim();
  if (role) admin.role = role;
  if (hasIsActive) admin.isActive = isActive;
  // A new password signs the admin out everywhere. Role and active status are checked
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

export const remove = async (id, actor) => {
  const admin = await findAdminOrThrow(id);

  if (admin._id.equals(actor._id)) throw new ApiError(400, "You can't delete your own account.");

  if (isActiveSuperadmin(admin)) await assertAnotherActiveSuperadmin(admin._id);

  await admin.deleteOne();
};
