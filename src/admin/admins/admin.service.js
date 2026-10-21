const Admin = require('./admin.model');
const ApiError = require('../../common/utils/ApiError');

const MIN_PASSWORD = 8;
const isEmail = (v) => typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

function validate({ email, password, name, role }, { partial = false } = {}) {
  if ((!partial || email !== undefined) && !isEmail(email)) throw new ApiError(400, 'Enter a valid email address.');
  if ((!partial || password !== undefined) && (typeof password !== 'string' || password.length < MIN_PASSWORD || password.length > 200)) {
    throw new ApiError(400, `Password must be at least ${MIN_PASSWORD} characters.`);
  }
  if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 100)) throw new ApiError(400, 'Enter a valid name.');
  if (role !== undefined && !Admin.ROLES.includes(role)) throw new ApiError(400, `Role must be one of: ${Admin.ROLES.join(', ')}.`);
}

async function findOr404(id) {
  const admin = await Admin.findById(id).catch(() => null);
  if (!admin) throw new ApiError(404, 'Admin not found.');
  return admin;
}

/** Superadmins that are still active, excluding `exceptId` — used to never lock everyone out. */
const otherActiveSuperadmins = (exceptId) => Admin.countDocuments({ _id: { $ne: exceptId }, role: 'superadmin', isActive: true });

exports.list = async () => (await Admin.find().sort({ createdAt: 1 })).map((a) => a.toPublic());

exports.get = async (id) => (await findOr404(id)).toPublic();

exports.create = async ({ email, password, name, role = 'admin' }) => {
  validate({ email, password, name, role });
  const admin = new Admin({ email, name: name?.trim() || 'Admin', role });
  await admin.setPassword(password);
  await admin.save(); // duplicate email → 409 from the error handler
  return admin.toPublic();
};

/** First-run only: creates the first superadmin while the admins collection is empty. */
exports.setup = async ({ email, password, name }) => {
  if (await Admin.exists({})) throw new ApiError(403, 'Setup is already done. Ask a superadmin to add you.');
  return exports.create({ email, password, name, role: 'superadmin' });
};

exports.update = async (id, body, actor) => {
  const { email, name, role, isActive, password } = body || {};
  validate({ email, name, role, password }, { partial: true });
  if (isActive !== undefined && typeof isActive !== 'boolean') throw new ApiError(400, 'isActive must be true or false.');

  const admin = await findOr404(id);
  const isSelf = admin._id.equals(actor._id);
  const losingSuperadmin = admin.role === 'superadmin' && admin.isActive && ((role && role !== 'superadmin') || isActive === false);
  if (losingSuperadmin && !(await otherActiveSuperadmins(admin._id))) throw new ApiError(400, 'At least one active superadmin is required.');
  if (isSelf && isActive === false) throw new ApiError(400, "You can't deactivate your own account.");

  if (email !== undefined) admin.email = email;
  if (name !== undefined) admin.name = name.trim();
  if (role !== undefined) admin.role = role;
  if (isActive !== undefined) admin.isActive = isActive;
  if (password !== undefined) await admin.setPassword(password);
  // password change, deactivation or role change → sign the admin out everywhere
  if (password !== undefined || isActive === false || role !== undefined) admin.tokenVersion += 1;
  await admin.save();
  return admin.toPublic();
};

/** Signed-in admin changes their own password (needs the current one). */
exports.changeOwnPassword = async (actor, { currentPassword, newPassword }) => {
  const admin = await Admin.findById(actor._id).select('+passwordHash');
  if (!admin || !(await admin.checkPassword(String(currentPassword || '')))) throw new ApiError(400, 'Current password is incorrect.');
  validate({ password: newPassword }, { partial: true });
  await admin.setPassword(newPassword);
  admin.tokenVersion += 1;
  await admin.save();
  return { ok: true };
};

exports.remove = async (id, actor) => {
  const admin = await findOr404(id);
  if (admin._id.equals(actor._id)) throw new ApiError(400, "You can't delete your own account.");
  if (admin.role === 'superadmin' && admin.isActive && !(await otherActiveSuperadmins(admin._id))) {
    throw new ApiError(400, 'At least one active superadmin is required.');
  }
  await admin.deleteOne();
};
