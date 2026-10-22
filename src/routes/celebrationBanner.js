import { Router } from 'express';

import * as celebrationBannerController from '../controllers/celebrationBannerController.js';

/** Website (no sign-in): the banner live right now, mounted at /api/celebration-banner */
const router = Router();

router.get('/', celebrationBannerController.getLiveBanner);

export default router;
