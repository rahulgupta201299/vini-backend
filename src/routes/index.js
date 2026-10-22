import { Router } from 'express';

import { requireDatabase } from '../middlewares/database.js';

import admins from './admins.js';
import allExams from './allExams.js';
import auth from './auth.js';
import celebrationBanner from './celebrationBanner.js';
import celebrationBanners from './celebrationBanners.js';
import exams from './exams.js';
import health from './health.js';

/**
 * Every API route, mounted at /api. Each routes file maps URLs to its controller in ../controllers.
 * Admin routes check sign-in and roles inside their own routes file.
 */
const router = Router();

// Reports database problems itself, so it runs before the database check
router.use('/health', health);

router.use(requireDatabase);

// Website (no sign-in)
router.use('/exams', exams);
router.use('/celebration-banner', celebrationBanner);

// Admin panel
router.use('/admin/auth', auth);
router.use('/admin/admins', admins);
router.use('/admin/homepage/all-exams', allExams);
router.use('/admin/homepage/celebration-banners', celebrationBanners);

export default router;
