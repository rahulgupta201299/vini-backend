import TopRankersBanner from '../models/TopRankersBanner.js';
import TopRankersCategory from '../models/TopRankersCategory.js';
import TopRankersStat from '../models/TopRankersStat.js';
import ApiError from '../utils/ApiError.js';
import {
  assertBoolean,
  assertNoItems,
  assertText,
  deleteByIdOrThrow,
  findByIdOrThrow,
  nextOrder,
  plural,
  saveOrder,
} from '../utils/ordering.js';
import slugify from '../utils/slugify.js';

/**
 * "Our Top Rankers" (homepage and course pages): headline boxes, plus result banners in tabs
 * (UPSC, State PCS, Other Exams). Everything is switched active / inactive and reordered, or deleted for good with Delete access (a tab only once it has no banners).
 */

const BY_ORDER = { order: 1, createdAt: 1 };

/* ---------- helpers ---------- */

const getStats = (filter = {}) => TopRankersStat.find(filter).sort(BY_ORDER).lean();

/**
 * Tabs with their banners joined in (MongoDB $lookup), both in display order.
 * `activeOnly` hides inactive tabs and banners (for the website).
 */
const getCategoriesWithBanners = ({ activeOnly = false, bannerFields }) => {
  const categoryFilter = activeOnly ? { isActive: true } : {};
  const bannerFilter = activeOnly ? { isActive: true } : {};

  return TopRankersCategory.aggregate()
    .match(categoryFilter)
    .sort(BY_ORDER)
    .lookup({
      from: TopRankersBanner.collection.name,
      let: { categoryId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$category', '$$categoryId'] }, ...bannerFilter } },
        { $sort: BY_ORDER },
        { $project: bannerFields },
      ],
      as: 'banners',
    });
};

/** Everything (active and inactive), for the admin screen. */
const getAdminData = async () => {
  const [stats, categories] = await Promise.all([
    getStats(),
    getCategoriesWithBanners({
      bannerFields: { title: 1, webImageUrl: 1, mobileImageUrl: 1, link: 1, isActive: 1, order: 1 },
    }),
  ]);

  return { stats, categories };
};

/** The headline box fields an admin may set, checked. Anything else in the body is ignored. */
const pickStatFields = ({
  value = '',
  label = '',
  sublabel = '',
  icon = 'Trophy',
  isActive = true,
}) => {
  assertText(value, 'Value');
  assertText(label, 'Label');
  assertBoolean(isActive, 'isActive');

  return {
    value: value.trim(),
    label: label.trim(),
    sublabel: String(sublabel).trim(),
    icon: String(icon).trim(),
    isActive,
  };
};

const assertCategoryNameIsFree = async (name, exceptId) => {
  const isTaken = await TopRankersCategory.exists({ name, _id: { $ne: exceptId } });

  if (isTaken) throw new ApiError(409, `A tab named "${name}" already exists.`);
};

/** The banner fields an admin may set, checked. A banner needs at least one image. */
const pickBannerFields = async ({
  category,
  title = '',
  webImageUrl = '',
  mobileImageUrl = '',
  link = '',
  isActive = true,
}) => {
  assertText(title, 'Title');
  assertBoolean(isActive, 'isActive');

  if (!webImageUrl && !mobileImageUrl) {
    throw new ApiError(400, 'Upload a web image, a phone image, or both.');
  }

  await findByIdOrThrow(TopRankersCategory, category, 'Tab');

  return {
    category,
    title: title.trim(),
    webImageUrl,
    mobileImageUrl,
    link: String(link).trim(),
    isActive,
  };
};

/* ---------- public (website) ---------- */

/**
 * GET /api/top-rankers — active only, in order:
 * { stats: [{ value, label, sublabel, icon }], tabs: [{ id, label, banners: [{ title, webImageUrl, mobileImageUrl, link }] }] }
 */
export const getTopRankers = async (_req, res) => {
  const [stats, categories] = await Promise.all([
    TopRankersStat.find({ isActive: true })
      .sort(BY_ORDER)
      .select('-_id value label sublabel icon')
      .lean(),
    getCategoriesWithBanners({
      activeOnly: true,
      bannerFields: { _id: 0, title: 1, webImageUrl: 1, mobileImageUrl: 1, link: 1 },
    }),
  ]);

  const tabs = categories
    .filter(({ banners }) => banners.length)
    .map(({ name, banners }) => ({ id: slugify(name), label: name, banners }));

  res.json({ stats, tabs });
};

/* ---------- admin: overview ---------- */

/** GET /api/admin/homepage/top-rankers — { stats, categories (with banners) } */
export const getTopRankersAdmin = async (_req, res) => {
  res.json(await getAdminData());
};

/* ---------- admin: headline boxes ---------- */

/** POST /api/admin/homepage/top-rankers/stats { value, label, sublabel, icon, isActive } */
export const createStat = async (req, res) => {
  const fields = pickStatFields(req.body || {});
  const stat = await TopRankersStat.create({ ...fields, order: await nextOrder(TopRankersStat) });

  res.status(201).json(stat.toObject());
};

/** PUT /api/admin/homepage/top-rankers/stats/:id — saves the whole box */
export const updateStat = async (req, res) => {
  const stat = await findByIdOrThrow(TopRankersStat, req.params.id, 'Box');

  stat.set(pickStatFields(req.body || {}));
  await stat.save();

  res.json(stat.toObject());
};

/** PATCH /api/admin/homepage/top-rankers/stats/:id { isActive } */
export const setStatStatus = async (req, res) => {
  const { isActive } = req.body || {};

  assertBoolean(isActive, 'isActive');

  const stat = await findByIdOrThrow(TopRankersStat, req.params.id, 'Box');

  stat.isActive = isActive;
  await stat.save();

  res.json(stat.toObject());
};

/** PUT /api/admin/homepage/top-rankers/stats/order { ids } — every box id, first to last */
export const reorderStats = async (req, res) => {
  const { ids = [] } = req.body || {};

  await saveOrder(TopRankersStat, ids);

  res.json(await getStats());
};

/* ---------- admin: tabs ---------- */

/** POST /api/admin/homepage/top-rankers/categories { name } */
export const createCategory = async (req, res) => {
  const { name = '' } = req.body || {};

  assertText(name, 'Tab name');
  await assertCategoryNameIsFree(name.trim());

  const category = await TopRankersCategory.create({
    name: name.trim(),
    order: await nextOrder(TopRankersCategory),
  });

  res.status(201).json(category.toObject());
};

/** PATCH /api/admin/homepage/top-rankers/categories/:id { name?, isActive? } — only the fields sent change */
export const updateCategory = async (req, res) => {
  const changes = req.body || {};
  const { name, isActive } = changes;
  const category = await findByIdOrThrow(TopRankersCategory, req.params.id, 'Tab');

  if ('name' in changes) {
    assertText(name, 'Tab name');
    await assertCategoryNameIsFree(name.trim(), category._id);
    category.name = name.trim();
  }

  if ('isActive' in changes) {
    assertBoolean(isActive, 'isActive');
    category.isActive = isActive;
  }

  await category.save();

  res.json(category.toObject());
};

/** PUT /api/admin/homepage/top-rankers/categories/order { ids } — every tab id, first to last */
export const reorderCategories = async (req, res) => {
  const { ids = [] } = req.body || {};

  await saveOrder(TopRankersCategory, ids);

  res.json(await getAdminData());
};

/* ---------- admin: banners ---------- */

/** POST /api/admin/homepage/top-rankers/banners { category, title, webImageUrl, mobileImageUrl, link, isActive } */
export const createBanner = async (req, res) => {
  const fields = await pickBannerFields(req.body || {});
  const order = await nextOrder(TopRankersBanner, { category: fields.category });
  const banner = await TopRankersBanner.create({ ...fields, order });

  res.status(201).json(banner.toObject());
};

/** PUT /api/admin/homepage/top-rankers/banners/:id — saves the whole banner (can move it to another tab) */
export const updateBanner = async (req, res) => {
  const banner = await findByIdOrThrow(TopRankersBanner, req.params.id, 'Banner');
  const fields = await pickBannerFields(req.body || {});
  const isMovingTab = String(fields.category) !== String(banner.category);

  // A banner moved to another tab goes to the end of that tab
  if (isMovingTab) fields.order = await nextOrder(TopRankersBanner, { category: fields.category });

  banner.set(fields);
  await banner.save();

  res.json(banner.toObject());
};

/** PATCH /api/admin/homepage/top-rankers/banners/:id { isActive } */
export const setBannerStatus = async (req, res) => {
  const { isActive } = req.body || {};

  assertBoolean(isActive, 'isActive');

  const banner = await findByIdOrThrow(TopRankersBanner, req.params.id, 'Banner');

  banner.isActive = isActive;
  await banner.save();

  res.json(banner.toObject());
};

/** PUT /api/admin/homepage/top-rankers/banners/order { category, ids } — every banner id in that tab, first to last */
export const reorderBanners = async (req, res) => {
  const { category, ids = [] } = req.body || {};

  await findByIdOrThrow(TopRankersCategory, category, 'Tab');
  await saveOrder(TopRankersBanner, ids, { category });

  res.json(await getAdminData());
};

/** DELETE /api/admin/homepage/top-rankers/stats/:id — removes a headline box for good */
export const deleteStat = async (req, res) => {
  const { _id } = await deleteByIdOrThrow(TopRankersStat, req.params.id, 'Box');

  res.json({ deleted: true, _id });
};

/** DELETE /api/admin/homepage/top-rankers/categories/:id — removes a tab for good, once it has no banners */
export const deleteCategory = async (req, res) => {
  const category = await findByIdOrThrow(TopRankersCategory, req.params.id, 'Tab');

  await assertNoItems(
    TopRankersBanner,
    { category: category._id },
    (count) => `Delete or move its ${plural(count, 'banner')} first.`,
  );
  await category.deleteOne();

  res.json({ deleted: true, _id: category._id });
};

/** DELETE /api/admin/homepage/top-rankers/banners/:id — removes a result banner for good */
export const deleteBanner = async (req, res) => {
  const { _id } = await deleteByIdOrThrow(TopRankersBanner, req.params.id, 'Banner');

  res.json({ deleted: true, _id });
};
