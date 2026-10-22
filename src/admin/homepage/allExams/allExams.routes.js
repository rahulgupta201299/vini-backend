import { Router } from 'express';

import * as allExamsController from './allExams.controller.js';

/**
 * Admin routes, mounted at /api/admin/homepage/all-exams (signed-in admins only — see homepage.routes.js).
 * Nothing is deleted: categories and sub categories are switched active / inactive instead.
 */
const router = Router();

router.get('/', allExamsController.listAll);

router.post('/categories', allExamsController.createCategory);
router.put('/categories/order', allExamsController.reorderCategories);
router.patch('/categories/:id', allExamsController.updateCategory);

router.post('/sub-categories', allExamsController.createSubCategory);
router
  .route('/sub-categories/:id')
  .get(allExamsController.getSubCategory)
  .put(allExamsController.updateSubCategory)
  .patch(allExamsController.setSubCategoryStatus);

export default router;
