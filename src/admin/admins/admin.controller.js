import * as adminService from './admin.service.js';

/** GET /api/admin/admins */
export const list = async (_req, res) => {
  res.json(await adminService.list());
};

/** GET /api/admin/admins/:id */
export const get = async (req, res) => {
  res.json(await adminService.get(req.params.id));
};

/** POST /api/admin/admins { name, email, password, role? } */
export const create = async (req, res) => {
  res.status(201).json(await adminService.create(req.body ?? {}));
};

/** POST /api/admin/admins/setup { name, email, password } — only while no admin exists yet */
export const setup = async (req, res) => {
  res.status(201).json(await adminService.setup(req.body ?? {}));
};

/** PATCH /api/admin/admins/:id { name?, email?, password?, role?, isActive? } */
export const update = async (req, res) => {
  res.json(await adminService.update(req.params.id, req.body ?? {}, req.admin));
};

/** PATCH /api/admin/admins/me/password { currentPassword, newPassword } */
export const changeOwnPassword = async (req, res) => {
  res.json(await adminService.changeOwnPassword(req.admin, req.body ?? {}));
};

/** DELETE /api/admin/admins/:id */
export const remove = async (req, res) => {
  await adminService.remove(req.params.id, req.admin);
  res.status(204).send();
};
