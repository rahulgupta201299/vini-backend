import { Router } from 'express';

import * as heroBannerController from '../controllers/heroBannerController.js';
import { requireAdmin, requireSection } from '../middlewares/auth.js';

/** Admin: Homepage → Hero slider, mounted at /api/admin/homepage/hero-banners. Needs Homepage access (view / edit / delete). */
const router = Router();

router.use(requireAdmin, requireSection('homepage'));

router.get('/', heroBannerController.getHeroBanners);
router.post('/', heroBannerController.createHeroBanner);
router.put('/order', heroBannerController.reorderHeroBanners);
router.put('/:id', heroBannerController.updateHeroBanner);
router.patch('/:id', heroBannerController.setHeroBannerStatus);
router.delete('/:id', heroBannerController.deleteHeroBanner);

export default router;
