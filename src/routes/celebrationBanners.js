import { Router } from 'express';

import * as celebrationBannerController from '../controllers/celebrationBannerController.js';
import { requireAccess, requireAdmin } from '../middlewares/auth.js';

/**
 * Admin: Homepage → Celebration banner, mounted at /api/admin/homepage/celebration-banners.
 * Web Managers and Editors (and Super Admins). Banners are switched off, never deleted.
 */
const router = Router();

router.use(requireAdmin, requireAccess('webManager', 'editor'));

router.get('/', celebrationBannerController.getBanners);
router.post('/', celebrationBannerController.createBanner);
router.get('/:id', celebrationBannerController.getBannerById);
router.put('/:id', celebrationBannerController.updateBanner);
router.patch('/:id', celebrationBannerController.setBannerStatus);

export default router;
