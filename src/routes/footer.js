import { Router } from 'express';

import * as footerController from '../controllers/footerController.js';
import { requireAccess, requireAdmin } from '../middlewares/auth.js';

/** Admin: Footer sections, mounted at /api/admin/footer. Web Managers and Editors. */
const router = Router();

router.use(requireAdmin, requireAccess('webManager', 'editor'));

router.get('/', footerController.getFooterSections);
router.put('/:key', footerController.updateFooterSection);

export default router;
