import ApiError from '../../../common/utils/ApiError.js';
import slugify from '../../../common/utils/slugify.js';

import AllExamsCategory from './allExamsCategory.model.js';
import AllExamsSubCategory from './allExamsSubCategory.model.js';

const BY_ORDER = { order: 1, createdAt: 1 };

/* ---------- helpers ---------- */

const assertName = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, `${label} is required.`);
};

const assertBoolean = (value, label) => {
  if (typeof value !== 'boolean') throw new ApiError(400, `${label} must be true or false.`);
};

const findOrThrow = async (Model, id, label) => {
  const doc = await Model.findById(id).catch(() => null);

  if (!doc) throw new ApiError(404, `${label} not found.`);

  return doc;
};

const nextOrder = async (Model, filter = {}) => {
  const last = await Model.findOne(filter).sort({ order: -1 }).select('order').lean();

  return (last?.order ?? -1) + 1;
};

/** Categories with their sub categories joined in (MongoDB $lookup). `activeOnly` hides inactive ones. */
const categoriesWithSubCategories = ({ activeOnly, subCategoryFields }) =>
  AllExamsCategory.aggregate([
    { $match: activeOnly ? { isActive: true } : {} },
    { $sort: BY_ORDER },
    {
      $lookup: {
        from: AllExamsSubCategory.collection.name,
        let: { categoryId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$category', '$$categoryId'] },
              ...(activeOnly && { isActive: true }),
            },
          },
          { $sort: BY_ORDER },
          { $project: subCategoryFields },
        ],
        as: 'subCategories',
      },
    },
  ]);

/* ---------- public (website) — only active categories and sub categories ---------- */

/** GET /api/exams — the header "All Exams" menu: [{ category, subCategories: [{ subCategory, slug, menuIcon }] }] */
export const listForSite = async () => {
  const categories = await categoriesWithSubCategories({
    activeOnly: true,
    subCategoryFields: { _id: 0, subCategory: '$name', slug: 1, menuIcon: 1 },
  });

  return categories
    .filter(({ subCategories }) => subCategories.length)
    .map(({ name, subCategories }) => ({ category: name, subCategories }));
};

/** GET /api/exams/:slug — one exam page: { category, subCategory, slug, menuIcon, details } */
export const getForSite = async (slug) => {
  const subCategory = await AllExamsSubCategory.findOne({ slug, isActive: true })
    .populate('category', 'name isActive')
    .lean();

  if (!subCategory?.category?.isActive) throw new ApiError(404, 'Exam not found.');

  const { category, name, menuIcon, details } = subCategory;

  return { category: category.name, subCategory: name, slug, menuIcon, details };
};

/* ---------- admin: overview ---------- */

/** GET — every category (active and inactive) with its sub categories, without their details. */
export const listAll = () =>
  categoriesWithSubCategories({
    activeOnly: false,
    subCategoryFields: { name: 1, slug: 1, isActive: 1, menuIcon: 1, updatedAt: 1 },
  });

/* ---------- admin: categories ---------- */

const assertCategoryNameIsFree = async (name, exceptId) => {
  const taken = await AllExamsCategory.exists({ name, _id: { $ne: exceptId } });

  if (taken) throw new ApiError(409, `A category named "${name}" already exists.`);
};

export const createCategory = async ({ name }) => {
  assertName(name, 'Category name');

  const trimmed = name.trim();

  await assertCategoryNameIsFree(trimmed);

  const category = await AllExamsCategory.create({
    name: trimmed,
    order: await nextOrder(AllExamsCategory),
  });

  return category.toObject();
};

/** Rename and / or activate / deactivate a category. Only the fields that were sent change. */
export const updateCategory = async (id, changes) => {
  const { name, isActive } = changes;
  const category = await findOrThrow(AllExamsCategory, id, 'Category');

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

  return category.toObject();
};

/* ---------- admin: sub categories ---------- */

/** Fields an admin may set on a sub category. Anything else in the body is ignored. */
const pickSubCategoryFields = ({
  category,
  name,
  isActive = true,
  menuIcon = {},
  details = {},
}) => ({
  category,
  name: name?.trim(),
  isActive,
  menuIcon,
  details,
});

const assertSlugIsFree = async (slug, exceptId) => {
  const taken = await AllExamsSubCategory.exists({ slug, _id: { $ne: exceptId } });

  if (taken) throw new ApiError(409, 'A sub category with this name already exists.');
};

const validateSubCategory = async (fields) => {
  assertName(fields.name, 'Sub category name');
  assertBoolean(fields.isActive, 'isActive');
  await findOrThrow(AllExamsCategory, fields.category, 'Category');

  const slug = slugify(fields.name);

  if (!slug) throw new ApiError(400, 'Sub category name needs letters or numbers.');

  return slug;
};

export const getSubCategory = async (id) => {
  const subCategory = await AllExamsSubCategory.findById(id)
    .populate('category', 'name isActive')
    .lean()
    .catch(() => null);

  if (!subCategory) throw new ApiError(404, 'Sub category not found.');

  return subCategory;
};

export const createSubCategory = async (body) => {
  const fields = pickSubCategoryFields(body);
  const slug = await validateSubCategory(fields);

  await assertSlugIsFree(slug);

  const order = await nextOrder(AllExamsSubCategory, { category: fields.category });
  const { _id } = await AllExamsSubCategory.create({ ...fields, slug, order });

  return getSubCategory(_id);
};

/** Saves the whole sub category (category, name, status, menu icon and details). */
export const updateSubCategory = async (id, body) => {
  const subCategory = await findOrThrow(AllExamsSubCategory, id, 'Sub category');
  const fields = pickSubCategoryFields(body);
  const slug = await validateSubCategory(fields);

  await assertSlugIsFree(slug, subCategory._id);

  subCategory.set({ ...fields, slug });
  await subCategory.save();

  return getSubCategory(id);
};

/** Activate / deactivate a sub category. */
export const setSubCategoryStatus = async (id, { isActive }) => {
  assertBoolean(isActive, 'isActive');

  const subCategory = await findOrThrow(AllExamsSubCategory, id, 'Sub category');

  subCategory.isActive = isActive;
  await subCategory.save();

  return getSubCategory(id);
};
