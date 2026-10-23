import FreeResource from '../models/FreeResource.js';
import {
  assertBoolean,
  assertText,
  findByIdOrThrow,
  nextOrder,
  saveOrder,
} from '../utils/ordering.js';

/** Homepage → "Browse Our Free Resources" tiles. Switched active / inactive, never deleted. */

/** The fields an admin may set, checked. Anything else in the body is ignored. */
const pickResourceFields = ({
  title = '',
  icon = 'BookOpen',
  color = '#0284C7',
  link = '',
  isActive = true,
}) => {
  assertText(title, 'Title');
  assertText(link, 'Link');
  assertBoolean(isActive, 'isActive');

  return {
    title: title.trim(),
    icon: String(icon).trim(),
    color: String(color).trim(),
    link: link.trim(),
    isActive,
  };
};

const getAllResources = () => FreeResource.find().sort({ order: 1, createdAt: 1 }).lean();

/** GET /api/admin/homepage/free-resources — every tile (active and inactive), in order */
export const getFreeResources = async (_req, res) => {
  res.json(await getAllResources());
};

/** POST /api/admin/homepage/free-resources { title, icon, color, link, isActive } */
export const createFreeResource = async (req, res) => {
  const fields = pickResourceFields(req.body || {});
  const resource = await FreeResource.create({ ...fields, order: await nextOrder(FreeResource) });

  res.status(201).json(resource.toObject());
};

/** PUT /api/admin/homepage/free-resources/:id — saves the whole tile */
export const updateFreeResource = async (req, res) => {
  const resource = await findByIdOrThrow(FreeResource, req.params.id, 'Free resource');

  resource.set(pickResourceFields(req.body || {}));
  await resource.save();

  res.json(resource.toObject());
};

/** PATCH /api/admin/homepage/free-resources/:id { isActive } */
export const setFreeResourceStatus = async (req, res) => {
  const { isActive } = req.body || {};

  assertBoolean(isActive, 'isActive');

  const resource = await findByIdOrThrow(FreeResource, req.params.id, 'Free resource');

  resource.isActive = isActive;
  await resource.save();

  res.json(resource.toObject());
};

/** PUT /api/admin/homepage/free-resources/order { ids } — every tile id, first to last */
export const reorderFreeResources = async (req, res) => {
  const { ids = [] } = req.body || {};

  await saveOrder(FreeResource, ids);

  res.json(await getAllResources());
};
