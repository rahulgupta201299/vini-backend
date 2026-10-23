import { Router } from 'express';

import * as homepageController from '../controllers/homepageController.js';
import * as selectYourGoalController from '../controllers/selectYourGoalController.js';

/** Website (no sign-in): homepage sections from the admin panel, mounted at /api */
const router = Router();

router.get('/homepage', homepageController.getHomepage);
router.get('/select-your-goal', selectYourGoalController.getSelectYourGoal);

export default router;
