const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('./login.controller');
const { requireAdmin } = require('./login.middleware');

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

module.exports = router;
