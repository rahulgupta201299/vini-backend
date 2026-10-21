const ApiError = require('../../common/utils/ApiError');
const asyncHandler = require('../../common/utils/asyncHandler');
const { getAdminFromSession } = require('./login.service');

const SESSION_COOKIE = 'vini_admin_session';

/** Session token from `Authorization: Bearer <token>` (used by the Next.js frontend) or the session cookie. */
const getSessionToken = (req) => {
  const header = req.get('authorization') || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return req.cookies?.[SESSION_COOKIE];
};

/** Protects admin routes: sets req.admin or responds 401. */
const requireAdmin = asyncHandler(async (req, res, next) => {
  const admin = await getAdminFromSession(getSessionToken(req));
  if (!admin) throw new ApiError(401, 'Not signed in.');
  req.admin = admin;
  next();
});

/** Use after requireAdmin: only lets the listed roles through, e.g. requireRole('superadmin'). */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.admin || !roles.includes(req.admin.role)) return next(new ApiError(403, 'You do not have permission to do this.'));
  next();
};

module.exports = { requireAdmin, requireRole, getSessionToken, SESSION_COOKIE };
