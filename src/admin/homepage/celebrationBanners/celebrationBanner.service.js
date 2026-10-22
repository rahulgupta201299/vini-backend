import ApiError from '../../../common/utils/ApiError.js';

import CelebrationBanner from './celebrationBanner.model.js';

/* ---------- helpers ---------- */

const findOrThrow = async (id) => {
  const banner = await CelebrationBanner.findById(id).catch(() => null);

  if (!banner) throw new ApiError(404, 'Celebration banner not found.');

  return banner;
};

const toDate = (value, label) => {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) throw new ApiError(400, `${label} is required.`);

  return date;
};

/** Banners whose end date has passed are switched off, so "inactive" always includes expired ones. */
const switchOffExpired = () =>
  CelebrationBanner.updateMany(
    { isActive: true, endsAt: { $lte: new Date() } },
    { $set: { isActive: false } },
  );

/** Fields an admin may set. Anything else in the body is ignored. */
const pickFields = ({
  title,
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

  if (isActive && ends <= new Date()) {
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

const SITE_TIME_ZONE = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar day in India as a UTC timestamp, so two dates can be compared by whole days. */
const indianDay = (date) => {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TIME_ZONE })
    .format(date)
    .split('-')
    .map(Number);

  return Date.UTC(year, month - 1, day);
};

/** "Sale ending today" / "Sale ends tomorrow" / "Sale ends in 4 days", counted in Indian days. */
const countdownText = (endsAt, now = new Date()) => {
  const days = Math.round((indianDay(endsAt) - indianDay(now)) / DAY_MS);

  if (days <= 0) return 'Sale ending today';
  if (days === 1) return 'Sale ends tomorrow';

  return `Sale ends in ${days} days`;
};

/**
 * GET /api/celebration-banner — the banner live right now (newest first), or null.
 * `tagline` is the line under the title: the admin's text, or the countdown when it is empty.
 */
export const getLive = async () => {
  await switchOffExpired();

  const now = new Date();
  const banner = await CelebrationBanner.findOne({
    isActive: true,
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  })
    .sort({ startsAt: -1 })
    .select('title subtitle imageUrl alt theme offers startsAt endsAt')
    // [S3 SNAPSHOT] .select('… snapshotUrl') — the final image made in the admin (see the model)
    .lean();

  if (!banner) return { banner: null };

  return { banner: { ...banner, tagline: banner.subtitle || countdownText(banner.endsAt, now) } };
};

/* ---------- admin ---------- */

export const list = async () => {
  await switchOffExpired();

  return CelebrationBanner.find().select('-imageUrl').sort({ startsAt: -1 }).lean();
};

export const get = async (id) => {
  await switchOffExpired();

  return (await findOrThrow(id)).toObject();
};

export const create = async (body) => {
  const banner = await CelebrationBanner.create(pickFields(body));

  return banner.toObject();
};

/** Saves the whole banner. */
export const update = async (id, body) => {
  const banner = await findOrThrow(id);

  banner.set(pickFields(body));
  await banner.save();

  return banner.toObject();
};

/** Switch a banner on or off. An expired banner needs a later end date before it can go back on. */
export const setStatus = async (id, { isActive }) => {
  if (typeof isActive !== 'boolean') throw new ApiError(400, 'isActive must be true or false.');

  const banner = await findOrThrow(id);

  if (isActive && banner.endsAt <= new Date()) {
    throw new ApiError(400, 'This banner has ended. Open it and choose a later end date first.');
  }

  banner.isActive = isActive;
  await banner.save();

  return banner.toObject();
};
