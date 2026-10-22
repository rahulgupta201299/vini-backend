import { Router } from 'express';

import * as celebrationBannerController from './celebrationBanner.controller.js';

/** Public route for the website, mounted at /api/celebration-banner (no sign-in). */
const router = Router();

router.get('/', celebrationBannerController.getLive);

export default router;
