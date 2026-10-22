import { Router } from 'express';

import adminRoutes from './admin/admin.routes.js';
import examsPublicRoutes from './admin/homepage/allExams/allExams.public.routes.js';
import celebrationBannerPublicRoutes from './admin/homepage/celebrationBanners/celebrationBanner.public.routes.js';

/** Root API router, mounted at /api. Each feature folder has its own model, service, controller and routes. */
const router = Router();

router.use('/admin', adminRoutes);
router.use('/exams', examsPublicRoutes);
router.use('/celebration-banner', celebrationBannerPublicRoutes);

export default router;
