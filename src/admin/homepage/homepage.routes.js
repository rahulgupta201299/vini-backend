import { Router } from 'express';

import { requireAdmin } from '../login/login.middleware.js';

import allExamsRoutes from './allExams/allExams.routes.js';

/** Homepage sections, mounted at /api/admin/homepage. Any signed-in admin can edit content. */
const router = Router();

router.use(requireAdmin);
router.use('/all-exams', allExamsRoutes);

export default router;
