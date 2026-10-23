import { Router } from 'express';

import * as heroBannerController from '../controllers/heroBannerController.js';
import { requireAccess, requireAdmin } from '../middlewares/auth.js';

/** Admin: Homepage → Hero slider, mounted at /api/admin/homepage/hero-banners. Web Managers and Editors. */
const router = Router();

router.use(requireAdmin, requireAccess('webManager', 'editor'));

router.get('/', heroBannerController.getHeroBanners);
router.post('/', heroBannerController.createHeroBanner);
router.put('/order', heroBannerController.reorderHeroBanners);
router.put('/:id', heroBannerController.updateHeroBanner);
router.patch('/:id', heroBannerController.setHeroBannerStatus);

export default router;
