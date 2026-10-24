import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

const { Schema } = mongoose;

export const EXAM_SOURCES = ['allExams', 'selectYourGoal'];

/* Nested pieces of an exam page. `_id: false` keeps the stored arrays clean (they are edited as a whole). */

/** A banner with separate art for web (wide) and mobile (tall). Used for hero banners and top rankers. */
const bannerSchema = new Schema(
  {
    title: { type: String, trim: true, default: '' },
    alt: { type: String, trim: true, default: '' },
    webImageUrl: { type: String, default: '' },
    mobileImageUrl: { type: String, default: '' },
    link: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

/** "Watch Free Online Classes" card. With a youtubeId the video plays on the page, otherwise `link` opens. */
const freeClassSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    educator: { type: String, trim: true, default: '' },
    duration: { type: String, trim: true, default: '' },
    youtubeId: { type: String, trim: true, default: '' },
    link: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

/** "Recommended Batches For You" card. */
const batchSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    thumbnail: { type: String, default: '' },
    language: { type: String, trim: true, default: '' },
    mode: { type: String, trim: true, default: '' },
    startDate: { type: String, trim: true, default: '' },
    price: { type: Number, min: 0, default: 0 },
    mrp: { type: Number, min: 0, default: 0 },
    tag: { type: String, trim: true, default: '' },
    link: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const highlightSchema = new Schema(
  {
    label: { type: String, trim: true, required: true },
    value: { type: String, trim: true, required: true },
  },
  { _id: false },
);

const faqSchema = new Schema(
  {
    question: { type: String, trim: true, required: true },
    answer: { type: String, trim: true, required: true },
  },
  { _id: false },
);

/**
 * The content of one exam page (/goal/<slug>). The exam points here with `details` (this document's id), and
 * `exam` points back to the exam's id:
 *   source "allExams"       → adminAllExamsSubCategories
 *   source "selectYourGoal" → adminSelectYourGoalExams
 */
const examDetailsSchema = new Schema(
  {
    exam: { type: Schema.Types.ObjectId, required: true, unique: true },
    source: { type: String, enum: EXAM_SOURCES, required: true },
    subTitle: { type: String, trim: true, default: '' },
    banners: { type: [bannerSchema], default: [] },
    freeClasses: { type: [freeClassSchema], default: [] },
    batches: { type: [batchSchema], default: [] },
    topRankers: { type: [bannerSchema], default: [] },
    aboutExam: {
      // Empty title → the site shows "All About <sub category> Exam"
      title: { type: String, trim: true, default: '' },
      highlights: { type: [highlightSchema], default: [] },
      // Rich text (HTML from the admin editor, cleaned on save): headings, lists, tables, links…
      content: { type: String, default: '' },
    },
    faqs: { type: [faqSchema], default: [] },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminExamDetails },
);

/** The page fields (everything except the join fields), in the order the editor shows them. */
export const DETAIL_FIELDS = [
  'subTitle',
  'banners',
  'freeClasses',
  'batches',
  'topRankers',
  'aboutExam',
  'faqs',
];

export default mongoose.model('ExamDetails', examDetailsSchema);
