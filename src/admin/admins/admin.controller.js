import asyncHandler from '../../common/utils/asyncHandler.js';
import * as service from './admin.service.js';

/** GET /api/admin/admins */
export const list = asyncHandler(async (req, res) => res.json(await service.list()));

/** GET /api/admin/admins/:id */
export const get = asyncHandler(async (req, res) => res.json(await service.get(req.params.id)));

/** POST /api/admin/admins { name, email, password, role? } */
export const create = asyncHandler(async (req, res) => res.status(201).json(await service.create(req.body || {})));

/** POST /api/admin/admins/setup { name, email, password } — only while no admin exists yet */
export const setup = asyncHandler(async (req, res) => res.status(201).json(await service.setup(req.body || {})));

/** PATCH /api/admin/admins/:id { name?, email?, password?, role?, isActive? } */
export const update = asyncHandler(async (req, res) => res.json(await service.update(req.params.id, req.body, req.admin)));

/** PATCH /api/admin/admins/me/password { currentPassword, newPassword } */
export const changeOwnPassword = asyncHandler(async (req, res) => res.json(await service.changeOwnPassword(req.admin, req.body || {})));

/** DELETE /api/admin/admins/:id */
export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.admin);
  res.status(204).send();
});
