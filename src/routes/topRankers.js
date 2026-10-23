import { Router } from 'express';

import * as topRankersController from '../controllers/topRankersController.js';
import { requireAccess, requireAdmin } from '../middlewares/auth.js';

/** Admin: Homepage → Top rankers, mounted at /api/admin/homepage/top-rankers. Web Managers and Editors. */
const router = Router();

router.use(requireAdmin, requireAccess('webManager', 'editor'));

router.get('/', topRankersController.getTopRankersAdmin);

router.post('/stats', topRankersController.createStat);
router.put('/stats/order', topRankersController.reorderStats);
router.put('/stats/:id', topRankersController.updateStat);
router.patch('/stats/:id', topRankersController.setStatStatus);

router.post('/categories', topRankersController.createCategory);
router.put('/categories/order', topRankersController.reorderCategories);
router.patch('/categories/:id', topRankersController.updateCategory);

router.post('/banners', topRankersController.createBanner);
router.put('/banners/order', topRankersController.reorderBanners);
router.put('/banners/:id', topRankersController.updateBanner);
router.patch('/banners/:id', topRankersController.setBannerStatus);

export default router;
