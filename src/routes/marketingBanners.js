import { Router } from 'express';

import * as marketingBannerController from '../controllers/marketingBannerController.js';
import { requireAdmin, requireSection } from '../middlewares/auth.js';

/** Admin: Homepage → 1st and 2nd marketing banner, mounted at /api/admin/homepage/marketing-banners. */
const router = Router();

router.use(requireAdmin, requireSection('homepage'));

router.get('/', marketingBannerController.getMarketingBanners);
router.post('/', marketingBannerController.createMarketingBanner);
router.put('/order', marketingBannerController.reorderMarketingBanners);
router.put('/:id', marketingBannerController.updateMarketingBanner);
router.patch('/:id', marketingBannerController.setMarketingBannerStatus);
router.delete('/:id', marketingBannerController.deleteMarketingBanner);

export default router;
