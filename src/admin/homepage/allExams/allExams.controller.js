import * as allExamsService from './allExams.service.js';

/* ---------- public (website) ---------- */

/** GET /api/exams */
export const listForSite = async (_req, res) => {
  res.json(await allExamsService.listForSite());
};

/** GET /api/exams/:slug */
export const getForSite = async (req, res) => {
  res.json(await allExamsService.getForSite(req.params.slug));
};

/* ---------- admin ---------- */

/** GET /api/admin/homepage/all-exams — categories with their sub categories */
export const listAll = async (_req, res) => {
  res.json(await allExamsService.listAll());
};

/** POST /api/admin/homepage/all-exams/categories { name } */
export const createCategory = async (req, res) => {
  res.status(201).json(await allExamsService.createCategory(req.body ?? {}));
};

/** PATCH /api/admin/homepage/all-exams/categories/:id { name?, isActive? } */
export const updateCategory = async (req, res) => {
  res.json(await allExamsService.updateCategory(req.params.id, req.body ?? {}));
};

/** PUT /api/admin/homepage/all-exams/categories/order { ids } — every category id, in the new order */
export const reorderCategories = async (req, res) => {
  res.json(await allExamsService.reorderCategories(req.body ?? {}));
};

/** GET /api/admin/homepage/all-exams/sub-categories/:id */
export const getSubCategory = async (req, res) => {
  res.json(await allExamsService.getSubCategory(req.params.id));
};

/** POST /api/admin/homepage/all-exams/sub-categories { category, name, isActive, menuIcon, details } */
export const createSubCategory = async (req, res) => {
  res.status(201).json(await allExamsService.createSubCategory(req.body ?? {}));
};

/** PUT /api/admin/homepage/all-exams/sub-categories/:id { category, name, isActive, menuIcon, details } */
export const updateSubCategory = async (req, res) => {
  res.json(await allExamsService.updateSubCategory(req.params.id, req.body ?? {}));
};

/** PATCH /api/admin/homepage/all-exams/sub-categories/:id { isActive } */
export const setSubCategoryStatus = async (req, res) => {
  res.json(await allExamsService.setSubCategoryStatus(req.params.id, req.body ?? {}));
};
