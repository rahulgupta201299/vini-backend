const router = require('express').Router();

router.use('/health', require('./health.routes'));
router.use('/users', require('./user.routes'));

module.exports = router;
