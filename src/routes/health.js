import { Router } from 'express';

import * as healthController from '../controllers/healthController.js';

/** Server and database status, mounted at /api/health */
const router = Router();

router.get('/', healthController.getHealth);

export default router;
