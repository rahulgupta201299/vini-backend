import GoalCategory from '../models/GoalCategory.js';
import GoalExam from '../models/GoalExam.js';
import ApiError from '../utils/ApiError.js';
import {
  assertBoolean,
  assertText,
  findByIdOrThrow,
  nextOrder,
  saveOrder,
} from '../utils/ordering.js';

/**
 * Homepage → "Select Your Goal": category tabs (e.g. "UPSC") with their exam cards (e.g. "UPSC CSE").
 * Categories and exams are switched active / inactive and reordered — never deleted.
 */

const BY_ORDER = { order: 1, createdAt: 1 };

/* ---------- helpers ---------- */

/**
 * Categories with their exams joined in (MongoDB $lookup), both in display order.
 * `activeOnly` hides inactive categories and exams (for the website).
 */
const getCategoriesWithExams = ({ activeOnly = false, examFields }) => {
  const categoryFilter = activeOnly ? { isActive: true } : {};
  const examFilter = activeOnly ? { isActive: true } : {};

  return GoalCategory.aggregate()
    .match(categoryFilter)
    .sort(BY_ORDER)
    .lookup({
      from: GoalExam.collection.name,
      let: { categoryId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$category', '$$categoryId'] }, ...examFilter } },
        { $sort: BY_ORDER },
        { $project: examFields },
      ],
      as: 'exams',
    });
};

/** Every category (active and inactive) with every exam, for the admin. */
const getAdminList = () =>
  getCategoriesWithExams({ examFields: { name: 1, logo: 1, link: 1, isActive: 1, order: 1 } });

const assertCategoryNameIsFree = async (name, exceptId) => {
  const isTaken = await GoalCategory.exists({ name, _id: { $ne: exceptId } });

  if (isTaken) throw new ApiError(409, `A category named "${name}" already exists.`);
};

/** The exam fields an admin may set, checked. Anything else in the body is ignored. */
const pickExamFields = async ({ category, name = '', logo = '', link = '', isActive = true }) => {
  assertText(name, 'Exam name');
  assertBoolean(isActive, 'isActive');
  await findByIdOrThrow(GoalCategory, category, 'Category');

  return { category, name: name.trim(), logo: String(logo), link: String(link).trim(), isActive };
};

/* ---------- public (website) ---------- */

/** GET /api/select-your-goal — [{ category, subcategories: [{ name, logo, href? }] }], active only */
export const getSelectYourGoal = async (_req, res) => {
  const categories = await getCategoriesWithExams({
    activeOnly: true,
    examFields: { _id: 0, name: 1, logo: 1, link: 1 },
  });

  const goals = categories
    .filter(({ exams }) => exams.length)
    .map(({ name, exams }) => ({
      category: name,
      subcategories: exams.map(({ name: examName, logo, link }) => {
        if (link) return { name: examName, logo: logo || null, href: link };

        return { name: examName, logo: logo || null };
      }),
    }));

  res.json(goals);
};

/* ---------- admin ---------- */

/** GET /api/admin/homepage/select-your-goal — every category with its exams */
export const getGoals = async (_req, res) => {
  res.json(await getAdminList());
};

/** POST /api/admin/homepage/select-your-goal/categories { name } */
export const createCategory = async (req, res) => {
  const { name = '' } = req.body || {};

  assertText(name, 'Category name');
  await assertCategoryNameIsFree(name.trim());

  const category = await GoalCategory.create({
    name: name.trim(),
    order: await nextOrder(GoalCategory),
  });

  res.status(201).json(category.toObject());
};

/** PATCH /api/admin/homepage/select-your-goal/categories/:id { name?, isActive? } — only the fields sent change */
export const updateCategory = async (req, res) => {
  const changes = req.body || {};
  const { name, isActive } = changes;
  const category = await findByIdOrThrow(GoalCategory, req.params.id, 'Category');

  if ('name' in changes) {
    assertText(name, 'Category name');
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

/** PUT /api/admin/homepage/select-your-goal/categories/order { ids } — every category id, first to last */
export const reorderCategories = async (req, res) => {
  const { ids = [] } = req.body || {};

  await saveOrder(GoalCategory, ids);

  res.json(await getAdminList());
};

/** POST /api/admin/homepage/select-your-goal/exams { category, name, logo, link, isActive } */
export const createExam = async (req, res) => {
  const fields = await pickExamFields(req.body || {});
  const order = await nextOrder(GoalExam, { category: fields.category });
  const exam = await GoalExam.create({ ...fields, order });

  res.status(201).json(exam.toObject());
};

/** PUT /api/admin/homepage/select-your-goal/exams/:id — saves the whole exam card */
export const updateExam = async (req, res) => {
  const exam = await findByIdOrThrow(GoalExam, req.params.id, 'Exam');
  const fields = await pickExamFields(req.body || {});
  const isMovingCategory = String(fields.category) !== String(exam.category);

  // An exam moved to another category goes to the end of that category
  if (isMovingCategory) fields.order = await nextOrder(GoalExam, { category: fields.category });

  exam.set(fields);
  await exam.save();

  res.json(exam.toObject());
};

/** PATCH /api/admin/homepage/select-your-goal/exams/:id { isActive } */
export const setExamStatus = async (req, res) => {
  const { isActive } = req.body || {};

  assertBoolean(isActive, 'isActive');

  const exam = await findByIdOrThrow(GoalExam, req.params.id, 'Exam');

  exam.isActive = isActive;
  await exam.save();

  res.json(exam.toObject());
};

/** PUT /api/admin/homepage/select-your-goal/exams/order { category, ids } — every exam id in that category, first to last */
export const reorderExams = async (req, res) => {
  const { category, ids = [] } = req.body || {};

  await findByIdOrThrow(GoalCategory, category, 'Category');
  await saveOrder(GoalExam, ids, { category });

  res.json(await getAdminList());
};
