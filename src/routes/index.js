import { Router } from 'express';

import { requireDatabase } from '../middlewares/database.js';

import admins from './admins.js';
import allExams from './allExams.js';
import auth from './auth.js';
import celebrationBanner from './celebrationBanner.js';
import celebrationBanners from './celebrationBanners.js';
import exams from './exams.js';
import footer from './footer.js';
import freeResources from './freeResources.js';
import health from './health.js';
import heroBanners from './heroBanners.js';
import homepage from './homepage.js';
import homepageSummary from './homepageSummary.js';
import marketingBanners from './marketingBanners.js';
import selectYourGoal from './selectYourGoal.js';
import topRankers from './topRankers.js';

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
router.use('/', homepage); // /homepage, /select-your-goal, /top-rankers and /footer

// Admin panel
router.use('/admin/auth', auth);
router.use('/admin/admins', admins);
router.use('/admin/homepage/all-exams', allExams);
router.use('/admin/homepage/celebration-banners', celebrationBanners);
router.use('/admin/homepage/hero-banners', heroBanners);
router.use('/admin/homepage/free-resources', freeResources);
router.use('/admin/homepage/marketing-banners', marketingBanners);
router.use('/admin/homepage/select-your-goal', selectYourGoal);
router.use('/admin/homepage/top-rankers', topRankers);
router.use('/admin/footer', footer);
router.use('/admin/homepage/summary', homepageSummary);

export default router;
