import { Router } from 'express';

import * as adminController from '../controllers/adminController.js';
import { requireAdmin, requireUserManager } from '../middlewares/auth.js';
import { setupLimiter } from '../middlewares/rateLimit.js';

/** Admin users, mounted at /api/admin/admins */
const router = Router();

// First run (no sign-in needed): only works while there are no admins
router.post('/setup', setupLimiter, adminController.setupFirstAdmin);

// Any signed-in admin
router.patch('/me/password', requireAdmin, adminController.changeOwnPassword);

// Super Admins and Admins (Admins manage Members only — checked in the controller).
// Users are never deleted — they are switched inactive instead.
router.use(requireAdmin, requireUserManager);

router.get('/access-options', adminController.getAccessOptions);
router.get('/', adminController.getAdmins);
router.post('/', adminController.addAdmin);
router.get('/:id', adminController.getAdminById);
router.patch('/:id', adminController.updateAdmin);

export default router;
