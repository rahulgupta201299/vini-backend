import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as loginController from './login.controller.js';
import { requireAdmin } from './login.middleware.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait and try again.' },
});

const router = Router();

router.post('/login', loginLimiter, loginController.login);
router.post('/send-otp', loginLimiter, loginController.sendOtp);
router.post('/verify-otp', loginLimiter, loginController.verifyOtp);
router.get('/me', requireAdmin, loginController.me);
router.post('/logout', loginController.logout);

export default router;
