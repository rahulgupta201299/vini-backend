import HeroBanner from '../models/HeroBanner.js';
import {
  assertBoolean,
  assertText,
  findByIdOrThrow,
  nextOrder,
  saveOrder,
} from '../utils/ordering.js';

/** Homepage → Hero slider. Slides are switched active / inactive, never deleted. */

/** The fields an admin may set, checked. Anything else in the body is ignored. */
const pickBannerFields = ({
  title = '',
  webImageUrl = '',
  mobileImageUrl = '',
  link = '',
  isActive = true,
}) => {
  assertText(title, 'Title');
  assertText(webImageUrl, 'Web image');
  assertBoolean(isActive, 'isActive');

  return { title: title.trim(), webImageUrl, mobileImageUrl, link: String(link).trim(), isActive };
};

const getAllBanners = () => HeroBanner.find().sort({ order: 1, createdAt: 1 }).lean();

/** GET /api/admin/homepage/hero-banners — every slide (active and inactive), in order */
export const getHeroBanners = async (_req, res) => {
  res.json(await getAllBanners());
};

/** POST /api/admin/homepage/hero-banners { title, webImageUrl, mobileImageUrl, link, isActive } */
export const createHeroBanner = async (req, res) => {
  const fields = pickBannerFields(req.body || {});
  const banner = await HeroBanner.create({ ...fields, order: await nextOrder(HeroBanner) });

  res.status(201).json(banner.toObject());
};

/** PUT /api/admin/homepage/hero-banners/:id — saves the whole slide */
export const updateHeroBanner = async (req, res) => {
  const banner = await findByIdOrThrow(HeroBanner, req.params.id, 'Hero banner');

  banner.set(pickBannerFields(req.body || {}));
  await banner.save();

  res.json(banner.toObject());
};

/** PATCH /api/admin/homepage/hero-banners/:id { isActive } */
export const setHeroBannerStatus = async (req, res) => {
  const { isActive } = req.body || {};

  assertBoolean(isActive, 'isActive');

  const banner = await findByIdOrThrow(HeroBanner, req.params.id, 'Hero banner');

  banner.isActive = isActive;
  await banner.save();

  res.json(banner.toObject());
};

/** PUT /api/admin/homepage/hero-banners/order { ids } — every slide id, first to last */
export const reorderHeroBanners = async (req, res) => {
  const { ids = [] } = req.body || {};

  await saveOrder(HeroBanner, ids);

  res.json(await getAllBanners());
};
