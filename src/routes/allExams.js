import { Router } from 'express';

import * as allExamsController from '../controllers/allExamsController.js';
import { requireAdmin, requireSection } from '../middlewares/auth.js';

/**
 * Admin: Homepage → All Exams, mounted at /api/admin/homepage/all-exams.
 * Needs All Exams access (view to read, edit to change, delete to delete). Items are switched active / inactive, or deleted with Delete access.
 */
const router = Router();

router.use(requireAdmin, requireSection('allExams'));

router.get('/', allExamsController.getAllExams);

router.post('/categories', allExamsController.createCategory);
router.put('/categories/order', allExamsController.reorderCategories);
router.patch('/categories/:id', allExamsController.updateCategory);
router.delete('/categories/:id', allExamsController.deleteCategory);

router.post('/sub-categories', allExamsController.createSubCategory);
router.get('/sub-categories/:id', allExamsController.getSubCategory);
router.put('/sub-categories/:id', allExamsController.updateSubCategory);
router.patch('/sub-categories/:id', allExamsController.setSubCategoryStatus);
router.delete('/sub-categories/:id', allExamsController.deleteSubCategory);

export default router;
