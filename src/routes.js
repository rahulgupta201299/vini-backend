import { Router } from 'express';

import adminRoutes from './admin/admin.routes.js';

/** Root API router, mounted at /api. Each feature folder has its own model, service, controller and routes. */
const router = Router();

router.use('/admin', adminRoutes);

export default router;
