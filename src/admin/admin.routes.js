const router = require('express').Router();

/**
 * Admin API — /api/admin/*. One folder per admin section (MVC):
 *
 *   src/admin/<section>/
 *     <name>.model.js        Mongoose schema(s)          — M
 *     <name>.service.js      business logic / DB access
 *     <name>.controller.js   request → service → JSON    — C
 *     <name>.routes.js       URLs, rate limits, auth     — routing
 *     <name>.middleware.js   (optional) section-specific middleware
 *
 * Views are the Next.js admin pages in the Frontend (V).
 * Protect a section's routes with `requireAdmin` (and `requireRole(...)`) from ./login/login.middleware.
 */
router.use('/auth', require('./login/login.routes'));
router.use('/admins', require('./admins/admin.routes'));
// router.use('/homepage', require('./homepage/homepage.routes'));

module.exports = router;
