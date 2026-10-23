import MarketingBanner, { PLACEMENTS } from '../models/MarketingBanner.js';
import ApiError from '../utils/ApiError.js';
import {
  assertBoolean,
  assertText,
  findByIdOrThrow,
  nextOrder,
  saveOrder,
} from '../utils/ordering.js';

/**
 * Homepage → 1st and 2nd marketing banner (`placement`: first / second).
 * Banners are switched active / inactive, never deleted.
 */

const assertPlacement = (placement) => {
  if (!PLACEMENTS.includes(placement)) {
    throw new ApiError(400, `placement must be one of: ${PLACEMENTS.join(', ')}.`);
  }
};

/** The fields an admin may set, checked. The placement can't change after creating. */
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

const getBannersIn = (placement) =>
  MarketingBanner.find({ placement }).sort({ order: 1, createdAt: 1 }).lean();

/** GET /api/admin/homepage/marketing-banners?placement=first — every banner in that place, in order */
export const getMarketingBanners = async (req, res) => {
  const { placement = '' } = req.query;

  assertPlacement(placement);

  res.json(await getBannersIn(placement));
};

/** POST /api/admin/homepage/marketing-banners { placement, title, webImageUrl, mobileImageUrl, link, isActive } */
export const createMarketingBanner = async (req, res) => {
  const body = req.body || {};
  const { placement = '' } = body;

  assertPlacement(placement);

  const fields = pickBannerFields(body);
  const order = await nextOrder(MarketingBanner, { placement });
  const banner = await MarketingBanner.create({ ...fields, placement, order });

  res.status(201).json(banner.toObject());
};

/** PUT /api/admin/homepage/marketing-banners/:id — saves the whole banner */
export const updateMarketingBanner = async (req, res) => {
  const banner = await findByIdOrThrow(MarketingBanner, req.params.id, 'Marketing banner');

  banner.set(pickBannerFields(req.body || {}));
  await banner.save();

  res.json(banner.toObject());
};

/** PATCH /api/admin/homepage/marketing-banners/:id { isActive } */
export const setMarketingBannerStatus = async (req, res) => {
  const { isActive } = req.body || {};

  assertBoolean(isActive, 'isActive');

  const banner = await findByIdOrThrow(MarketingBanner, req.params.id, 'Marketing banner');

  banner.isActive = isActive;
  await banner.save();

  res.json(banner.toObject());
};

/** PUT /api/admin/homepage/marketing-banners/order { placement, ids } — every banner id in that place, first to last */
export const reorderMarketingBanners = async (req, res) => {
  const { placement = '', ids = [] } = req.body || {};

  assertPlacement(placement);

  await saveOrder(MarketingBanner, ids, { placement });

  res.json(await getBannersIn(placement));
};
