import AllExamsCategory from '../models/AllExamsCategory.js';
import AllExamsSubCategory from '../models/AllExamsSubCategory.js';
import ApiError from '../utils/ApiError.js';
import sanitizeRichText from '../utils/sanitizeRichText.js';
import { nextOrder, saveOrder } from '../utils/ordering.js';
import slugify from '../utils/slugify.js';

/**
 * Homepage → All Exams: categories (e.g. "Only IAS") and their sub categories (e.g. "UPSC CSE 2026/27"),
 * each with its own page at /goal/<slug>. Nothing is deleted — items are switched active / inactive.
 */

const BY_ORDER = { order: 1, createdAt: 1 };

/* ---------- helpers ---------- */

const assertName = (value, label) => {
  const isValid = typeof value === 'string' && value.trim();

  if (!isValid) throw new ApiError(400, `${label} is required.`);
};

const assertBoolean = (value, label) => {
  if (typeof value !== 'boolean') throw new ApiError(400, `${label} must be true or false.`);
};

const findCategoryOrThrow = async (id) => {
  const category = await AllExamsCategory.findById(id).catch(() => null);

  if (!category) throw new ApiError(404, 'Category not found.');

  return category;
};

const findSubCategoryOrThrow = async (id) => {
  const subCategory = await AllExamsSubCategory.findById(id).catch(() => null);

  if (!subCategory) throw new ApiError(404, 'Sub category not found.');

  return subCategory;
};

/**
 * Categories with their sub categories joined in (MongoDB $lookup), both in display order.
 * `activeOnly` hides inactive categories and sub categories (for the website).
 */
const getCategoriesWithSubCategories = ({ activeOnly = false, subCategoryFields }) => {
  const categoryFilter = activeOnly ? { isActive: true } : {};
  const subCategoryFilter = activeOnly ? { isActive: true } : {};

  return AllExamsCategory.aggregate()
    .match(categoryFilter)
    .sort(BY_ORDER)
    .lookup({
      from: AllExamsSubCategory.collection.name,
      let: { categoryId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$category', '$$categoryId'] }, ...subCategoryFilter } },
        { $sort: BY_ORDER },
        { $project: subCategoryFields },
      ],
      as: 'subCategories',
    });
};

/** Every category (active and inactive) with its sub categories, without their page details. */
const getAdminList = () =>
  getCategoriesWithSubCategories({
    subCategoryFields: { name: 1, slug: 1, isActive: 1, menuIcon: 1, updatedAt: 1 },
  });

const assertCategoryNameIsFree = async (name, exceptId) => {
  const isTaken = await AllExamsCategory.exists({ name, _id: { $ne: exceptId } });

  if (isTaken) throw new ApiError(409, `A category named "${name}" already exists.`);
};

const assertSlugIsFree = async (slug, exceptId) => {
  const isTaken = await AllExamsSubCategory.exists({ slug, _id: { $ne: exceptId } });

  if (isTaken) throw new ApiError(409, 'A sub category with this name already exists.');
};

/** Alt text for every banner, written from its title and the exam name (admins don't type it). */
const withAltText = ({ banners = [], examName, kind }) =>
  banners.map((banner, index) => {
    const { title } = banner;

    if (title) return { ...banner, alt: `${title} — ${examName}` };

    return { ...banner, alt: `${examName} ${kind} ${index + 1}` };
  });

/** The fields an admin may set on a sub category. Anything else in the body is ignored. */
const pickSubCategoryFields = ({
  category,
  name = '',
  isActive = true,
  menuIcon = {},
  details = {},
}) => {
  const examName = String(name).trim();
  const { banners = [], topRankers = [], aboutExam = {} } = details;

  return {
    category,
    name: examName,
    isActive,
    menuIcon,
    details: {
      ...details,
      banners: withAltText({ banners, examName, kind: 'banner' }),
      topRankers: withAltText({ banners: topRankers, examName, kind: 'top rankers' }),
      aboutExam: { ...aboutExam, content: sanitizeRichText(aboutExam.content) },
    },
  };
};

/** Checks a sub category before saving and returns its page address (slug). */
const validateSubCategory = async ({ name, isActive, category }) => {
  assertName(name, 'Sub category name');
  assertBoolean(isActive, 'isActive');
  await findCategoryOrThrow(category);

  const slug = slugify(name);

  if (!slug) throw new ApiError(400, 'Sub category name needs letters or numbers.');

  return slug;
};

/** One sub category with its category's name and status joined in. */
const getSubCategoryWithCategory = async (id) => {
  const subCategory = await AllExamsSubCategory.findById(id)
    .populate('category', 'name isActive')
    .lean()
    .catch(() => null);

  if (!subCategory) throw new ApiError(404, 'Sub category not found.');

  return subCategory;
};

/* ---------- public (website) — only active categories and sub categories ---------- */

/** GET /api/exams — the header "All Exams" menu: [{ category, subCategories: [{ subCategory, slug, menuIcon }] }] */
export const getExamMenu = async (_req, res) => {
  const categories = await getCategoriesWithSubCategories({
    activeOnly: true,
    subCategoryFields: { _id: 0, subCategory: '$name', slug: 1, menuIcon: 1 },
  });

  const menu = categories
    .filter(({ subCategories }) => subCategories.length)
    .map(({ name, subCategories }) => ({ category: name, subCategories }));

  res.json(menu);
};

/** GET /api/exams/:slug — one exam page: { category, subCategory, slug, menuIcon, details } */
export const getExamBySlug = async (req, res) => {
  const { slug } = req.params;

  const subCategory = await AllExamsSubCategory.findOne({ slug, isActive: true })
    .populate('category', 'name isActive')
    .lean();

  if (!subCategory?.category?.isActive) throw new ApiError(404, 'Exam not found.');

  const { category, name, menuIcon, details } = subCategory;

  res.json({ category: category.name, subCategory: name, slug, menuIcon, details });
};

/* ---------- admin: overview ---------- */

/** GET /api/admin/homepage/all-exams — every category with its sub categories (without details) */
export const getAllExams = async (_req, res) => {
  res.json(await getAdminList());
};

/* ---------- admin: categories ---------- */

/** POST /api/admin/homepage/all-exams/categories { name } */
export const createCategory = async (req, res) => {
  const { name } = req.body || {};

  assertName(name, 'Category name');

  const trimmedName = name.trim();

  await assertCategoryNameIsFree(trimmedName);

  const category = await AllExamsCategory.create({
    name: trimmedName,
    order: await nextOrder(AllExamsCategory),
  });

  res.status(201).json(category.toObject());
};

/** PATCH /api/admin/homepage/all-exams/categories/:id { name?, isActive? } — only the fields sent change */
export const updateCategory = async (req, res) => {
  const changes = req.body || {};
  const { name, isActive } = changes;
  const category = await findCategoryOrThrow(req.params.id);

  if ('name' in changes) {
    assertName(name, 'Category name');
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

/**
 * PUT /api/admin/homepage/all-exams/categories/order { ids } — every category id, first to last.
 * The header "All Exams" menu follows this order. `ids` must list every category exactly once,
 * so an out-of-date screen can't scramble the order.
 */
export const reorderCategories = async (req, res) => {
  const { ids = [] } = req.body || {};

  await saveOrder(AllExamsCategory, ids);

  res.json(await getAdminList());
};

/* ---------- admin: sub categories ---------- */

/** GET /api/admin/homepage/all-exams/sub-categories/:id — one sub category with all its details */
export const getSubCategory = async (req, res) => {
  res.json(await getSubCategoryWithCategory(req.params.id));
};

/** POST /api/admin/homepage/all-exams/sub-categories { category, name, isActive, menuIcon, details } */
export const createSubCategory = async (req, res) => {
  const fields = pickSubCategoryFields(req.body || {});
  const slug = await validateSubCategory(fields);

  await assertSlugIsFree(slug);

  const order = await nextOrder(AllExamsSubCategory, { category: fields.category });
  const { _id } = await AllExamsSubCategory.create({ ...fields, slug, order });

  res.status(201).json(await getSubCategoryWithCategory(_id));
};

/** PUT /api/admin/homepage/all-exams/sub-categories/:id — saves the whole sub category */
export const updateSubCategory = async (req, res) => {
  const subCategory = await findSubCategoryOrThrow(req.params.id);
  const fields = pickSubCategoryFields(req.body || {});
  const slug = await validateSubCategory(fields);

  await assertSlugIsFree(slug, subCategory._id);

  subCategory.set({ ...fields, slug });
  await subCategory.save();

  res.json(await getSubCategoryWithCategory(subCategory._id));
};

/** PATCH /api/admin/homepage/all-exams/sub-categories/:id { isActive } — switch on or off */
export const setSubCategoryStatus = async (req, res) => {
  const { isActive } = req.body || {};

  assertBoolean(isActive, 'isActive');

  const subCategory = await findSubCategoryOrThrow(req.params.id);

  subCategory.isActive = isActive;
  await subCategory.save();

  res.json(await getSubCategoryWithCategory(subCategory._id));
};
