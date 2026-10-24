import AllExamsCategory from '../models/AllExamsCategory.js';
import AllExamsSubCategory from '../models/AllExamsSubCategory.js';
import GoalCategory from '../models/GoalCategory.js';
import GoalExam from '../models/GoalExam.js';
import ApiError from '../utils/ApiError.js';
import {
  buildExamDetails,
  examDetailsLookup,
  toDetails,
  toObjectIdOrThrow,
} from '../utils/examDetails.js';
import {
  assertBoolean,
  assertText,
  findByIdOrThrow,
  nextOrder,
  saveOrder,
} from '../utils/ordering.js';
import slugify from '../utils/slugify.js';

/**
 * Homepage → "Select Your Goal": category tabs (e.g. "UPSC") with their exam cards (e.g. "UPSC CSE").
 * Categories and exams are switched active / inactive and reordered — never deleted.
 * An exam's page content (/goal/<slug>) lives in adminExamDetails; its `details` holds that document's id —
 * either its own content, or linked to an All Exams sub category's page (the same document, so it stays in sync).
 * Exams without details get an auto-generated page on the website.
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

/** Exams with their category and page details joined in (MongoDB $lookup on ids). */
const findExamsWithDetails = (filter) =>
  GoalExam.aggregate()
    .match(filter)
    .lookup({
      from: GoalCategory.collection.name,
      localField: 'category',
      foreignField: '_id',
      as: 'category',
    })
    .unwind('$category')
    .lookup(examDetailsLookup());

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

/**
 * GET /api/select-your-goal/:slug — one exam's page: { category, name, slug, details }.
 * `details` is null until an admin saves the page, so the website shows its generated page instead.
 */
export const getGoalExamBySlug = async (req, res) => {
  const { slug } = req.params;
  const exams = await findExamsWithDetails({ isActive: true });
  const exam = exams.find(({ name, category }) => category.isActive && slugify(name) === slug);

  if (!exam) throw new ApiError(404, 'Exam not found.');

  const { name, category, examDetails } = exam;
  const [savedDetails] = examDetails;

  res.json({
    category: category.name,
    name,
    slug,
    details: savedDetails ? toDetails(savedDetails) : null,
  });
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

/** The All Exams sub category a details document belongs to (when the goal exam is linked to it), or null. */
const findLinkedSubCategory = async (detailsDoc) => {
  if (detailsDoc?.source !== 'allExams') return null;

  const [subCategory] = await AllExamsSubCategory.aggregate()
    .match({ _id: detailsDoc.exam })
    .lookup({
      from: AllExamsCategory.collection.name,
      localField: 'category',
      foreignField: '_id',
      as: 'category',
    })
    .unwind('$category')
    .project({ name: 1, slug: 1, isActive: 1, category: { _id: 1, name: 1 } });

  return subCategory || null;
};

/**
 * One exam for the admin editor: its category, its page details, and `linkedTo` — the All Exams sub category
 * whose page it shows (null when it has its own content or none yet).
 */
const getAdminExam = async (id) => {
  const _id = toObjectIdOrThrow(id, 'Exam');
  const [exam] = await findExamsWithDetails({ _id });

  if (!exam) throw new ApiError(404, 'Exam not found.');

  const { category, examDetails, ...rest } = exam;
  const { name, isActive } = category;
  const [savedDetails] = examDetails;

  return {
    ...rest,
    category: { _id: category._id, name, isActive },
    hasDetails: Boolean(savedDetails),
    linkedTo: await findLinkedSubCategory(savedDetails),
    details: toDetails(savedDetails),
  };
};

/** GET /api/admin/homepage/select-your-goal/exams/:id — one exam with its category and page details */
export const getExamById = async (req, res) => {
  res.json(await getAdminExam(req.params.id));
};

/**
 * PUT /api/admin/homepage/select-your-goal/exams/:id/details { details } — saves the exam's own page content.
 * A linked exam gets its own copy from now on (the All Exams page is left as it is).
 */
export const updateExamDetails = async (req, res) => {
  const exam = await findByIdOrThrow(GoalExam, req.params.id, 'Exam');
  const { details = {} } = req.body || {};
  const detailsDoc = await buildExamDetails({ exam, source: 'selectYourGoal', details });

  await exam.validate();
  await detailsDoc.save();
  await exam.save();

  res.json(await getAdminExam(exam._id));
};

/**
 * PUT /api/admin/homepage/select-your-goal/exams/:id/link { subCategory } — links the exam's page to an All Exams
 * sub category's page: `details` points at that page's adminExamDetails document, so edits there show here too.
 */
export const linkExamDetails = async (req, res) => {
  const exam = await findByIdOrThrow(GoalExam, req.params.id, 'Exam');
  const { subCategory: subCategoryId } = req.body || {};
  const subCategory = await findByIdOrThrow(
    AllExamsSubCategory,
    subCategoryId,
    'All Exams sub category',
  );

  if (!subCategory.details)
    throw new ApiError(400, `${subCategory.name} has no page content to link yet.`);

  exam.set({ details: subCategory.details });
  await exam.save();

  res.json(await getAdminExam(exam._id));
};
