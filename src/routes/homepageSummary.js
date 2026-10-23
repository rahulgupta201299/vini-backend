import { Router } from 'express';

import * as homepageController from '../controllers/homepageController.js';
import { requireAccess, requireAdmin } from '../middlewares/auth.js';

/** Admin: item counts for the Homepage screen, mounted at /api/admin/homepage/summary. */
const router = Router();

router.use(requireAdmin, requireAccess('webManager', 'editor'));

router.get('/', homepageController.getSummary);

export default router;
