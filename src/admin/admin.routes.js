import { Router } from 'express';

import adminsRoutes from './admins/admin.routes.js';
import homepageRoutes from './homepage/homepage.routes.js';
import loginRoutes from './login/login.routes.js';

/**
 * Admin API, mounted at /api/admin. One folder per admin section (MVC):
 *
 *   src/admin/<section>/
 *     <name>.model.js        Mongoose schema            (Model)
 *     <name>.service.js      business logic, DB access
 *     <name>.controller.js   request → service → JSON   (Controller)
 *     <name>.routes.js       URLs, rate limits, auth
 *
 * The views are the Next.js admin pages in the Frontend.
 * Protect routes with `requireAdmin` / `requireRole(...)` from ./login/login.middleware.js.
 */
const router = Router();

router.use('/auth', loginRoutes);
router.use('/admins', adminsRoutes);
router.use('/homepage', homepageRoutes);

export default router;
