import ApiError from '../../common/utils/ApiError.js';

import { SESSION_COOKIE } from './login.constants.js';
import { getAdminFromSession } from './login.service.js';

/** Session token from `Authorization: Bearer <token>` (sent by the Next.js frontend) or the session cookie. */
export const getSessionToken = (req) => {
  const header = req.get('authorization') ?? '';

  if (header.startsWith('Bearer ')) return header.slice('Bearer '.length).trim();

  return req.cookies?.[SESSION_COOKIE];
};

/** Protects admin routes: sets `req.admin`, or responds 401. */
export const requireAdmin = async (req, _res, next) => {
  const admin = await getAdminFromSession(getSessionToken(req));

  if (!admin) throw new ApiError(401, 'Not signed in.');

  req.admin = admin;
  next();
};

/** Use after requireAdmin. Lets only the given roles through, e.g. requireRole('superadmin'). */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.admin?.role)) {
      throw new ApiError(403, 'You do not have permission to do this.');
    }

    next();
  };
