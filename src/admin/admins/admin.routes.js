import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { requireAdmin, requireRole } from '../login/login.middleware.js';

import * as adminController from './admin.controller.js';

const setupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

const router = Router();

// First-run bootstrap (no sign-in needed): only works while there are no admins
router.post('/setup', setupLimiter, adminController.setup);

// Any signed-in admin
router.patch('/me/password', requireAdmin, adminController.changeOwnPassword);

// Superadmin only
router.use(requireAdmin, requireRole('superadmin'));
router.route('/').get(adminController.list).post(adminController.create);
router
  .route('/:id')
  .get(adminController.get)
  .patch(adminController.update)
  .delete(adminController.remove);

export default router;
