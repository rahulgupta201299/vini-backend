import { Router } from 'express';

import * as footerController from '../controllers/footerController.js';
import { requireAdmin, requireSection } from '../middlewares/auth.js';

/** Admin: Footer sections, mounted at /api/admin/footer. Needs Footer access (view / edit / delete). */
const router = Router();

router.use(requireAdmin, requireSection('footer'));

router.get('/', footerController.getFooterSections);
router.put('/:key', footerController.updateFooterSection);
router.delete('/:key', footerController.deleteFooterSection);

export default router;
