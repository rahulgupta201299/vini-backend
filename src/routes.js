const router = require('express').Router();

/**
 * Root API router — everything is served under /api (see app.js).
 * Each feature lives in its own folder with its model(s), service, controller and routes.
 */
router.use('/admin', require('./admin/admin.routes'));

module.exports = router;
