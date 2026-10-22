import { Router } from 'express';

import * as allExamsController from '../controllers/allExamsController.js';

/** Website (no sign-in): the "All Exams" menu and exam pages, mounted at /api/exams */
const router = Router();

router.get('/', allExamsController.getExamMenu);
router.get('/:slug', allExamsController.getExamBySlug);

export default router;
