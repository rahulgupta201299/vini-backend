import { Router } from 'express';

import * as coursePageController from '../controllers/coursePageController.js';
import * as footerController from '../controllers/footerController.js';
import * as headerController from '../controllers/headerController.js';
import * as homepageController from '../controllers/homepageController.js';
import * as selectYourGoalController from '../controllers/selectYourGoalController.js';
import * as siteSettingController from '../controllers/siteSettingController.js';
import * as topRankersController from '../controllers/topRankersController.js';

/** Website (no sign-in): content from the admin panel, mounted at /api */
const router = Router();

router.get('/homepage', homepageController.getHomepage);
router.get('/select-your-goal', selectYourGoalController.getSelectYourGoal);
router.get('/select-your-goal/:slug', selectYourGoalController.getGoalExamBySlug);
router.get('/top-rankers', topRankersController.getTopRankers);
router.get('/footer', footerController.getFooter);
router.get('/navigation', headerController.getNavigation);
router.get('/site-config', siteSettingController.getSiteConfig);
router.get('/courses/:section/:slug', coursePageController.getCoursePage);
router.get('/courses/:section/:slug/syllabus', coursePageController.getCourseSyllabus);

export default router;
