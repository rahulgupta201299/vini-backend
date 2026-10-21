import { Router } from 'express';

const router = Router();
import rateLimit from 'express-rate-limit';
import * as ctrl from './admin.controller.js';
import { requireAdmin, requireRole } from '../login/login.middleware.js';

const setupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

// First-run bootstrap (no auth): works only while the admins collection is empty.
router.post('/setup', setupLimiter, ctrl.setup);

// Any signed-in admin
router.patch('/me/password', requireAdmin, ctrl.changeOwnPassword);

// Superadmin only
router.use(requireAdmin, requireRole('superadmin'));
router.route('/').get(ctrl.list).post(ctrl.create);
router.route('/:id').get(ctrl.get).patch(ctrl.update).delete(ctrl.remove);

export default router;
