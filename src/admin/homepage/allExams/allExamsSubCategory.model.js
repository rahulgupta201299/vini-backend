import mongoose from 'mongoose';

import { COLLECTIONS } from '../../../config/collections.js';

const { Schema } = mongoose;

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

const detailsSchema = new Schema(
  {
    subTitle: { type: String, trim: true, default: '' },
    banners: { type: [bannerSchema], default: [] },
    freeClasses: { type: [freeClassSchema], default: [] },
    batches: { type: [batchSchema], default: [] },
    topRankers: { type: [bannerSchema], default: [] },
    aboutExam: {
      // Empty title → the site shows "All About <sub category> Exam"
      title: { type: String, trim: true, default: '' },
      highlights: { type: [highlightSchema], default: [] },
      paragraphs: { type: [String], default: [] },
    },
    faqs: { type: [faqSchema], default: [] },
  },
  { _id: false },
);

/**
 * Homepage → All Exams → sub categories (e.g. "UPSC CSE 2026/27" in category "Only IAS"), joined to their
 * category by `category`. Each one has its page at /goal/<slug> and an entry in the header "All Exams" menu.
 */
const allExamsSubCategorySchema = new Schema(
  {
    category: { type: Schema.Types.ObjectId, ref: 'AllExamsCategory', required: true, index: true },
    name: { type: String, trim: true, required: true },
    // Page address (/goal/<slug>), made from the name
    slug: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    // Icon in the header "All Exams" menu (a lucide icon name and colours)
    menuIcon: {
      name: { type: String, trim: true, default: 'BookOpen' },
      color: { type: String, trim: true, default: '' },
      background: { type: String, trim: true, default: '' },
    },
    details: { type: detailsSchema, default: () => ({}) },
  },
  { timestamps: true, collection: COLLECTIONS.allExamsSubCategories },
);

export default mongoose.model('AllExamsSubCategory', allExamsSubCategorySchema);
