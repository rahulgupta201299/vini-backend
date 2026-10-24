import mongoose from 'mongoose';

import ExamDetails, { DETAIL_FIELDS } from '../models/ExamDetails.js';

import ApiError from './ApiError.js';
import sanitizeRichText from './sanitizeRichText.js';

/**
 * Exam page content (adminExamDetails), shared by All Exams and Select Your Goal.
 * An exam's `details` holds the id of its details document; the details document's `exam` points back.
 */

/** What an exam without saved details returns. */
export const EMPTY_DETAILS = {
  subTitle: '',
  banners: [],
  freeClasses: [],
  batches: [],
  topRankers: [],
  aboutExam: { title: '', highlights: [], content: '' },
  faqs: [],
};

/**
 * MongoDB $lookup that joins an exam's details by its `details` id (use in an aggregation of exams).
 * A Select Your Goal exam linked to an All Exams page points at that sub category's details document.
 */
export const examDetailsLookup = (as = 'examDetails') => ({
  from: ExamDetails.collection.name,
  localField: 'details',
  foreignField: '_id',
  as,
});

/** A joined details document → the `details` object the API sends (empty when none is saved yet). */
export const toDetails = (detailsDoc) => {
  if (!detailsDoc) return EMPTY_DETAILS;

  const details = Object.fromEntries(DETAIL_FIELDS.map((field) => [field, detailsDoc[field]]));

  return { ...EMPTY_DETAILS, ...details };
};

/** Turns an id from a request into an ObjectId, or responds 404 with "<label> not found." */
export const toObjectIdOrThrow = (id, label) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, `${label} not found.`);

  return new mongoose.Types.ObjectId(String(id));
};

/** Alt text for every banner, written from its title and the exam name (admins don't type it). */
const withAltText = ({ banners = [], examName, kind }) =>
  banners.map((banner, index) => {
    const { title } = banner;

    if (title) return { ...banner, alt: `${title} — ${examName}` };

    return { ...banner, alt: `${examName} ${kind} ${index + 1}` };
  });

/** The page fields an admin may set, cleaned: alt text written, rich text sanitised. */
const pickExamDetails = (details = {}, examName = '') => {
  const {
    subTitle = '',
    banners = [],
    freeClasses = [],
    batches = [],
    topRankers = [],
    aboutExam = {},
    faqs = [],
  } = details;

  return {
    subTitle,
    banners: withAltText({ banners, examName, kind: 'banner' }),
    freeClasses,
    batches,
    topRankers: withAltText({ banners: topRankers, examName, kind: 'top rankers' }),
    aboutExam: { ...aboutExam, content: sanitizeRichText(aboutExam.content) },
    faqs,
  };
};

/**
 * Builds and checks an exam's own details document (new, or the saved one updated — found by `exam`, so never a
 * linked All Exams page) without saving it, and points the exam's `details` at it — so the exam and its details can both be checked before either is written.
 */
export const buildExamDetails = async ({ exam, source, details }) => {
  const { _id, name } = exam;
  const savedDetails = await ExamDetails.findOne({ exam: _id });
  const detailsDoc = savedDetails || new ExamDetails({ exam: _id, source });

  detailsDoc.set({ source, ...pickExamDetails(details, name) });
  await detailsDoc.validate();
  exam.set({ details: detailsDoc._id });

  return detailsDoc;
};
