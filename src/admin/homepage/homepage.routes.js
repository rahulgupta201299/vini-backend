import { Router } from 'express';

import { requireAccess, requireAdmin } from '../login/login.middleware.js';

import allExamsRoutes from './allExams/allExams.routes.js';
import celebrationBannerRoutes from './celebrationBanners/celebrationBanner.routes.js';

/** Homepage sections, mounted at /api/admin/homepage. Web Managers and Editors (and Super Admins). */
const router = Router();

router.use(requireAdmin, requireAccess('webManager', 'editor'));
router.use('/all-exams', allExamsRoutes);
router.use('/celebration-banners', celebrationBannerRoutes);

export default router;
