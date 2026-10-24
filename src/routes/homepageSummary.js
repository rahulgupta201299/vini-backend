import { Router } from 'express';

import * as homepageController from '../controllers/homepageController.js';
import { requireAdmin, requireSection } from '../middlewares/auth.js';

/** Admin: item counts for the Homepage screen, mounted at /api/admin/homepage/summary. */
const router = Router();

router.use(requireAdmin, requireSection('homepage'));

router.get('/', homepageController.getSummary);

export default router;
