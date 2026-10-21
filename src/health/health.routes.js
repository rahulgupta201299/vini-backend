const router = require('express').Router();
const { getHealth } = require('./health.controller');

router.get('/', getHealth);

module.exports = router;
