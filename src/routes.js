import { Router } from 'express';
import adminRoutes from './admin/admin.routes.js';

const router = Router();

/**
 * Root API router — everything is served under /api (see app.js).
 * Each feature lives in its own folder with its model(s), service, controller and routes.
 */
router.use('/admin', adminRoutes);

export default router;
