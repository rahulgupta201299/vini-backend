const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('./admin.controller');
const { requireAdmin, requireRole } = require('../login/login.middleware');

const setupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

// First-run bootstrap (no auth): works only while the admins collection is empty.
router.post('/setup', setupLimiter, ctrl.setup);

// Any signed-in admin
router.patch('/me/password', requireAdmin, ctrl.changeOwnPassword);

// Superadmin only
router.use(requireAdmin, requireRole('superadmin'));
router.route('/').get(ctrl.list).post(ctrl.create);
router.route('/:id').get(ctrl.get).patch(ctrl.update).delete(ctrl.remove);

module.exports = router;
