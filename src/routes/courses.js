import { Router } from 'express';

import * as coursePageController from '../controllers/coursePageController.js';
import { requireAdmin, requireSection } from '../middlewares/auth.js';

/** Admin: course pages (GS Foundation), mounted at /api/admin/courses. Needs GS Foundation access (view / edit). */
const router = Router();

router.use(requireAdmin, requireSection('gsFoundation'));

router.get('/', coursePageController.getCoursePages);
router.get('/:id', coursePageController.getCoursePageById);
router.put('/:id/:part', coursePageController.updateCoursePagePart);

export default router;
