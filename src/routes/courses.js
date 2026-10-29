import { Router } from 'express';

import * as coursePageController from '../controllers/coursePageController.js';
import { requireAdmin } from '../middlewares/auth.js';

/**
 * Admin: course pages (GS Foundation, Mentorship), mounted at /api/admin/courses.
 * Each page needs the access of its own course section (view / edit) — checked in the controller.
 */
const router = Router();

router.use(requireAdmin);

router.get('/', coursePageController.getCoursePages);
router.get('/:id', coursePageController.getCoursePageById);
router.put('/:id/:part', coursePageController.updateCoursePagePart);

export default router;
