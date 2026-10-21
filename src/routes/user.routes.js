const router = require('express').Router();
const ctrl = require('../controllers/user.controller');

router.route('/').get(ctrl.getUsers).post(ctrl.createUser);
router.route('/:id').get(ctrl.getUserById).put(ctrl.updateUser).delete(ctrl.deleteUser);

module.exports = router;
