import { Router } from 'express';

import * as selectYourGoalController from '../controllers/selectYourGoalController.js';
import { requireAdmin, requireSection } from '../middlewares/auth.js';

/** Admin: Homepage → Select Your Goal, mounted at /api/admin/homepage/select-your-goal. Needs Homepage access (view / edit / delete). */
const router = Router();

router.use(requireAdmin, requireSection('homepage'));

router.get('/', selectYourGoalController.getGoals);

router.post('/categories', selectYourGoalController.createCategory);
router.put('/categories/order', selectYourGoalController.reorderCategories);
router.patch('/categories/:id', selectYourGoalController.updateCategory);
router.delete('/categories/:id', selectYourGoalController.deleteCategory);

router.post('/exams', selectYourGoalController.createExam);
router.put('/exams/order', selectYourGoalController.reorderExams);
router.get('/exams/:id', selectYourGoalController.getExamById);
router.put('/exams/:id', selectYourGoalController.updateExam);
router.put('/exams/:id/details', selectYourGoalController.updateExamDetails);
router.put('/exams/:id/link', selectYourGoalController.linkExamDetails);
router.patch('/exams/:id', selectYourGoalController.setExamStatus);
router.delete('/exams/:id', selectYourGoalController.deleteExam);

export default router;
