import { SESSION_COOKIE, TOKEN_TYPE } from '../config/constants.js';
import { ADMIN, actionForMethod, can, SUPER_ADMIN } from '../config/permissions.js';
import Admin from '../models/Admin.js';
import ApiError from '../utils/ApiError.js';
import { isTokenForAdmin, readToken } from '../utils/token.js';

/** Session token from `Authorization: Bearer <token>` (sent by the Next.js frontend) or the session cookie. */
export const getSessionToken = (req) => {
  const header = req.get('authorization') || '';

  if (header.startsWith('Bearer ')) return header.slice('Bearer '.length).trim();

  return req.cookies?.[SESSION_COOKIE];
};

/** The signed-in admin for a session token, or null. */
export const getAdminFromSession = async (token) => {
  const session = readToken(token, TOKEN_TYPE.session);

  if (!session) return null;

  const admin = await Admin.findById(session.sub).select('+passwordHash');

  if (!admin?.isActive) return null;
  if (!isTokenForAdmin(session, admin)) return null;

  return admin;
};

/** Protects admin routes: sets `req.admin`, or responds 401. */
export const requireAdmin = async (req, _res, next) => {
  const admin = await getAdminFromSession(getSessionToken(req));

  if (!admin) throw new ApiError(401, 'Not signed in.');

  req.admin = admin;
  next();
};

/**
 * Use after requireAdmin. Lets a request through when the admin may do it in `section`: GET needs view,
 * DELETE needs delete, anything else needs edit (Super Admin always passes). e.g. requireSection('homepage').
 */
export const requireSection = (section) => (req, _res, next) => {
  if (!req.admin) throw new ApiError(401, 'Not signed in.');

  const action = actionForMethod(req.method);

  if (can(req.admin, section, action)) return next();

  if (action === 'delete') throw new ApiError(403, "You don't have Delete access in this section.");
  if (action === 'edit') throw new ApiError(403, 'You can only view this section.');

  throw new ApiError(403, "You don't have access to this section.");
};

/** Use after requireAdmin. Only Super Admins and Admins (who manage the other users). */
export const requireUserManager = (req, _res, next) => {
  if (!req.admin) throw new ApiError(401, 'Not signed in.');

  const { role } = req.admin.getAccess();

  if (role === SUPER_ADMIN || role === ADMIN) return next();

  throw new ApiError(403, 'Only Super Admins and Admins manage users.');
};
