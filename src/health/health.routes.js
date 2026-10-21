import { Router } from 'express';

const router = Router();
import { getHealth } from './health.controller.js';

router.get('/', getHealth);

export default router;
