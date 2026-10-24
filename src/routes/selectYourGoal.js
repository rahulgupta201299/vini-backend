import { Router } from 'express';

import * as selectYourGoalController from '../controllers/selectYourGoalController.js';
import { requireAccess, requireAdmin } from '../middlewares/auth.js';

/** Admin: Homepage → Select Your Goal, mounted at /api/admin/homepage/select-your-goal. Web Managers and Editors. */
const router = Router();

router.use(requireAdmin, requireAccess('webManager', 'editor'));

router.get('/', selectYourGoalController.getGoals);

router.post('/categories', selectYourGoalController.createCategory);
router.put('/categories/order', selectYourGoalController.reorderCategories);
router.patch('/categories/:id', selectYourGoalController.updateCategory);

router.post('/exams', selectYourGoalController.createExam);
router.put('/exams/order', selectYourGoalController.reorderExams);
router.get('/exams/:id', selectYourGoalController.getExamById);
router.put('/exams/:id', selectYourGoalController.updateExam);
router.put('/exams/:id/details', selectYourGoalController.updateExamDetails);
router.put('/exams/:id/link', selectYourGoalController.linkExamDetails);
router.patch('/exams/:id', selectYourGoalController.setExamStatus);

export default router;
