import { Router } from 'express';

import * as siteSettingController from '../controllers/siteSettingController.js';
import { requireAdmin, requireSection } from '../middlewares/auth.js';

/** Admin: Contact Info, mounted at /api/admin/contact. Needs Contact Info access (view / edit). */
const router = Router();

router.use(requireAdmin, requireSection('contact'));

router.get('/', siteSettingController.getContact);
router.put('/', siteSettingController.updateContact);

export default router;
