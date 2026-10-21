import { Router } from 'express';

import * as allExamsController from './allExams.controller.js';

/** Public routes for the website, mounted at /api/exams (no sign-in). */
const router = Router();

router.get('/', allExamsController.listForSite);
router.get('/:slug', allExamsController.getForSite);

export default router;
