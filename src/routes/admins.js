import { Router } from 'express';

import * as adminController from '../controllers/adminController.js';
import { requireAccess, requireAdmin } from '../middlewares/auth.js';
import { setupLimiter } from '../middlewares/rateLimit.js';

/** Admin users, mounted at /api/admin/admins */
const router = Router();

// First run (no sign-in needed): only works while there are no admins
router.post('/setup', setupLimiter, adminController.setupFirstAdmin);

// Any signed-in admin
router.patch('/me/password', requireAdmin, adminController.changeOwnPassword);

// Super Admin only. Admins are never deleted — they are switched inactive instead.
router.use(requireAdmin, requireAccess('superAdmin'));

router.get('/roles', adminController.getRoles);
router.get('/', adminController.getAdmins);
router.post('/', adminController.addAdmin);
router.get('/:id', adminController.getAdminById);
router.patch('/:id', adminController.updateAdmin);

export default router;
