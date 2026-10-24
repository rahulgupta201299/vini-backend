import { Router } from 'express';

import * as topRankersController from '../controllers/topRankersController.js';
import { requireAdmin, requireSection } from '../middlewares/auth.js';

/** Admin: Homepage → Top rankers, mounted at /api/admin/homepage/top-rankers. Needs Homepage access (view / edit / delete). */
const router = Router();

router.use(requireAdmin, requireSection('homepage'));

router.get('/', topRankersController.getTopRankersAdmin);

router.post('/stats', topRankersController.createStat);
router.put('/stats/order', topRankersController.reorderStats);
router.put('/stats/:id', topRankersController.updateStat);
router.patch('/stats/:id', topRankersController.setStatStatus);
router.delete('/stats/:id', topRankersController.deleteStat);

router.post('/categories', topRankersController.createCategory);
router.put('/categories/order', topRankersController.reorderCategories);
router.patch('/categories/:id', topRankersController.updateCategory);
router.delete('/categories/:id', topRankersController.deleteCategory);

router.post('/banners', topRankersController.createBanner);
router.put('/banners/order', topRankersController.reorderBanners);
router.put('/banners/:id', topRankersController.updateBanner);
router.patch('/banners/:id', topRankersController.setBannerStatus);
router.delete('/banners/:id', topRankersController.deleteBanner);

export default router;
