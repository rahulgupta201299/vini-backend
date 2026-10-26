import { Router } from 'express';

import * as headerController from '../controllers/headerController.js';
import { requireAdmin, requireSection } from '../middlewares/auth.js';

/** Admin: Header (menus, mobile menu, settings), mounted at /api/admin/header. Needs Header access (view / edit). */
const router = Router();

router.use(requireAdmin, requireSection('header'));

router.get('/', headerController.getHeaderSections);
router.put('/:key', headerController.updateHeaderSection);

export default router;
