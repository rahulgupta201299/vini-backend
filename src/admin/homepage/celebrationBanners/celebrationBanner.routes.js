import { Router } from 'express';

import * as celebrationBannerController from './celebrationBanner.controller.js';

/**
 * Admin routes, mounted at /api/admin/homepage/celebration-banners (signed-in admins only — see homepage.routes.js).
 * Nothing is deleted: banners are switched active / inactive, and expire on their end date.
 */
const router = Router();

router.route('/').get(celebrationBannerController.list).post(celebrationBannerController.create);
router
  .route('/:id')
  .get(celebrationBannerController.get)
  .put(celebrationBannerController.update)
  .patch(celebrationBannerController.setStatus);

export default router;
