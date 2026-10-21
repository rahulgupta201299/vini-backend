const asyncHandler = require('../../common/utils/asyncHandler');
const service = require('./admin.service');

/** GET /api/admin/admins */
exports.list = asyncHandler(async (req, res) => res.json(await service.list()));

/** GET /api/admin/admins/:id */
exports.get = asyncHandler(async (req, res) => res.json(await service.get(req.params.id)));

/** POST /api/admin/admins { name, email, password, role? } */
exports.create = asyncHandler(async (req, res) => res.status(201).json(await service.create(req.body || {})));

/** POST /api/admin/admins/setup { name, email, password } — only while no admin exists yet */
exports.setup = asyncHandler(async (req, res) => res.status(201).json(await service.setup(req.body || {})));

/** PATCH /api/admin/admins/:id { name?, email?, password?, role?, isActive? } */
exports.update = asyncHandler(async (req, res) => res.json(await service.update(req.params.id, req.body, req.admin)));

/** PATCH /api/admin/admins/me/password { currentPassword, newPassword } */
exports.changeOwnPassword = asyncHandler(async (req, res) => res.json(await service.changeOwnPassword(req.admin, req.body || {})));

/** DELETE /api/admin/admins/:id */
exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.admin);
  res.status(204).send();
});
