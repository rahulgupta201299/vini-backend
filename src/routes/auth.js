import { Router } from 'express';

import * as authController from '../controllers/authController.js';
import { requireAdmin } from '../middlewares/auth.js';
import { loginLimiter } from '../middlewares/rateLimit.js';

/** Admin sign-in, mounted at /api/admin/auth */
const router = Router();

router.post('/login', loginLimiter, authController.login);
router.post('/send-otp', loginLimiter, authController.sendOtp);
router.post('/verify-otp', loginLimiter, authController.verifyOtp);
router.get('/me', requireAdmin, authController.getMe);
router.post('/logout', authController.logout);

export default router;
