import { Router } from 'express';

import * as freeResourceController from '../controllers/freeResourceController.js';
import { requireAdmin, requireSection } from '../middlewares/auth.js';

/** Admin: Homepage → Free resources, mounted at /api/admin/homepage/free-resources. Needs Homepage access (view / edit / delete). */
const router = Router();

router.use(requireAdmin, requireSection('homepage'));

router.get('/', freeResourceController.getFreeResources);
router.post('/', freeResourceController.createFreeResource);
router.put('/order', freeResourceController.reorderFreeResources);
router.put('/:id', freeResourceController.updateFreeResource);
router.patch('/:id', freeResourceController.setFreeResourceStatus);
router.delete('/:id', freeResourceController.deleteFreeResource);

export default router;
