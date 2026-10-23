import { Router } from 'express';

import * as freeResourceController from '../controllers/freeResourceController.js';
import { requireAccess, requireAdmin } from '../middlewares/auth.js';

/** Admin: Homepage → Free resources, mounted at /api/admin/homepage/free-resources. Web Managers and Editors. */
const router = Router();

router.use(requireAdmin, requireAccess('webManager', 'editor'));

router.get('/', freeResourceController.getFreeResources);
router.post('/', freeResourceController.createFreeResource);
router.put('/order', freeResourceController.reorderFreeResources);
router.put('/:id', freeResourceController.updateFreeResource);
router.patch('/:id', freeResourceController.setFreeResourceStatus);

export default router;
