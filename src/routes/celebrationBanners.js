import { Router } from 'express';

import * as celebrationBannerController from '../controllers/celebrationBannerController.js';
import { requireAdmin, requireSection } from '../middlewares/auth.js';

/**
 * Admin: Homepage → Celebration banner, mounted at /api/admin/homepage/celebration-banners.
 * Needs Homepage access (view to read, edit to change, delete to delete). Banners can also be deleted for good.
 */
const router = Router();

router.use(requireAdmin, requireSection('homepage'));

router.get('/', celebrationBannerController.getBanners);
router.post('/', celebrationBannerController.createBanner);
router.get('/:id', celebrationBannerController.getBannerById);
router.put('/:id', celebrationBannerController.updateBanner);
router.patch('/:id', celebrationBannerController.setBannerStatus);
router.delete('/:id', celebrationBannerController.deleteBanner);

export default router;
