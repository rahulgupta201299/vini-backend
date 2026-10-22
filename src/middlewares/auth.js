import { SESSION_COOKIE, TOKEN_TYPE } from '../config/constants.js';
import { hasAccess } from '../config/roles.js';
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
 * Use after requireAdmin. Lets through admins with any of the given roles (Super Admin always passes),
 * e.g. requireAccess('webManager', 'editor').
 */
export const requireAccess =
  (...roles) =>
  (req, _res, next) => {
    if (!req.admin) throw new ApiError(401, 'Not signed in.');
    if (!hasAccess(req.admin, roles))
      throw new ApiError(403, "You don't have access to this section.");

    next();
  };
