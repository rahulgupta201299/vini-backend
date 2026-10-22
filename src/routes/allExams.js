import { Router } from 'express';

import * as allExamsController from '../controllers/allExamsController.js';
import { requireAccess, requireAdmin } from '../middlewares/auth.js';

/**
 * Admin: Homepage → All Exams, mounted at /api/admin/homepage/all-exams.
 * Web Managers and Editors (and Super Admins). Nothing is deleted — items are switched active / inactive.
 */
const router = Router();

router.use(requireAdmin, requireAccess('webManager', 'editor'));

router.get('/', allExamsController.getAllExams);

router.post('/categories', allExamsController.createCategory);
router.put('/categories/order', allExamsController.reorderCategories);
router.patch('/categories/:id', allExamsController.updateCategory);

router.post('/sub-categories', allExamsController.createSubCategory);
router.get('/sub-categories/:id', allExamsController.getSubCategory);
router.put('/sub-categories/:id', allExamsController.updateSubCategory);
router.patch('/sub-categories/:id', allExamsController.setSubCategoryStatus);

export default router;
