import { Router } from 'express';

const router = Router();
import rateLimit from 'express-rate-limit';
import * as ctrl from './login.controller.js';
import { requireAdmin } from './login.middleware.js';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait and try again.' },
});

router.post('/login', limiter, ctrl.login);
router.post('/send-otp', limiter, ctrl.sendOtp);
router.post('/verify-otp', limiter, ctrl.verifyOtp);
router.get('/me', requireAdmin, ctrl.me);
router.post('/logout', ctrl.logout);

export default router;
