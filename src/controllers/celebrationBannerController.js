import CelebrationBanner from '../models/CelebrationBanner.js';
import ApiError from '../utils/ApiError.js';
import { countdownText, toDate } from '../utils/dates.js';
import { deleteByIdOrThrow } from '../utils/ordering.js';

/**
 * Homepage → Celebration banner: a festival sale banner under the hero slider (e.g. "Happy Diwali").
 * The website shows it only while it is active AND between `startsAt` and `endsAt`.
 * Banners are switched off (and switch off by themselves after `endsAt`), or deleted for good with Delete access.
 */

const WEBSITE_FIELDS = 'title subtitle imageUrl alt theme offers startsAt endsAt';
// [S3 SNAPSHOT] add ' snapshotUrl' — the final image made in the admin (see the model)

/* ---------- helpers ---------- */

const findBannerOrThrow = async (id) => {
  const banner = await CelebrationBanner.findById(id).catch(() => null);

  if (!banner) throw new ApiError(404, 'Celebration banner not found.');

  return banner;
};

/**
 * Switches off every banner whose end date has passed, so "inactive" always includes expired ones.
 * Runs before banners are read. Usually it matches nothing and writes nothing.
 */
const switchOffExpiredBanners = () =>
  CelebrationBanner.updateMany(
    { isActive: true, endsAt: { $lte: new Date() } },
    { $set: { isActive: false } },
  );

/** The fields an admin may set, checked. Anything else in the body is ignored. */
const pickBannerFields = ({
  title = '',
  subtitle = '',
  imageUrl = '',
  theme = {},
  offers = [],
  startsAt,
  endsAt,
  isActive = true,
  // [S3 SNAPSHOT] snapshotUrl = '',
}) => {
  const starts = toDate(startsAt, 'Start date');
  const ends = toDate(endsAt, 'End date');

  if (ends <= starts) throw new ApiError(400, 'The end date must be after the start date.');

  const hasEnded = ends <= new Date();

  if (isActive && hasEnded) {
    throw new ApiError(
      400,
      'This end date has already passed. Choose a later end date to make it active.',
    );
  }

  return {
    title,
    subtitle,
    imageUrl,
    // Admins don't type alt text — it is written from the title
    alt: title ? `${title} offers` : '',
    theme,
    offers,
    startsAt: starts,
    endsAt: ends,
    isActive,
    // [S3 SNAPSHOT] snapshotUrl,
  };
};

/* ---------- public (website) ---------- */

/**
 * GET /api/celebration-banner — { banner }: the banner live right now (the newest one if several), or null.
 * `tagline` is the line under the title: the admin's text, or a countdown when it is empty.
 */
export const getLiveBanner = async (_req, res) => {
  await switchOffExpiredBanners();

  const now = new Date();

  const banner = await CelebrationBanner.findOne({ isActive: true })
    .where('startsAt')
    .lte(now)
    .where('endsAt')
    .gt(now)
    .sort({ startsAt: -1 })
    .select(WEBSITE_FIELDS)
    .lean();

  if (!banner) return res.json({ banner: null });

  const tagline = banner.subtitle || countdownText(banner.endsAt, now);

  res.json({ banner: { ...banner, tagline } });
};

/* ---------- admin ---------- */

/** GET /api/admin/homepage/celebration-banners — every banner (without its image), newest first */
export const getBanners = async (_req, res) => {
  await switchOffExpiredBanners();

  const banners = await CelebrationBanner.find().select('-imageUrl').sort({ startsAt: -1 }).lean();

  res.json(banners);
};

/** GET /api/admin/homepage/celebration-banners/:id */
export const getBannerById = async (req, res) => {
  await switchOffExpiredBanners();

  const banner = await findBannerOrThrow(req.params.id);

  res.json(banner.toObject());
};

/** POST /api/admin/homepage/celebration-banners { title, subtitle, imageUrl, theme, offers, startsAt, endsAt, isActive } */
export const createBanner = async (req, res) => {
  const banner = await CelebrationBanner.create(pickBannerFields(req.body || {}));

  res.status(201).json(banner.toObject());
};

/** PUT /api/admin/homepage/celebration-banners/:id — saves the whole banner */
export const updateBanner = async (req, res) => {
  const banner = await findBannerOrThrow(req.params.id);

  banner.set(pickBannerFields(req.body || {}));
  await banner.save();

  res.json(banner.toObject());
};

/** PATCH /api/admin/homepage/celebration-banners/:id { isActive } — an ended banner needs a later end date first */
export const setBannerStatus = async (req, res) => {
  const { isActive } = req.body || {};

  if (typeof isActive !== 'boolean') throw new ApiError(400, 'isActive must be true or false.');

  const banner = await findBannerOrThrow(req.params.id);
  const hasEnded = banner.endsAt <= new Date();

  if (isActive && hasEnded) {
    throw new ApiError(400, 'This banner has ended. Open it and choose a later end date first.');
  }

  banner.isActive = isActive;
  await banner.save();

  res.json(banner.toObject());
};

/** DELETE /api/admin/homepage/celebration-banners/:id — removes the banner for good (needs Delete access) */
export const deleteBanner = async (req, res) => {
  const { _id } = await deleteByIdOrThrow(CelebrationBanner, req.params.id, 'Banner');

  res.json({ deleted: true, _id });
};
