import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

const { Schema } = mongoose;

/** Course sections that have admin-managed pages (/courses/<section>/<slug>). */
export const COURSE_SECTIONS = ['gs-foundation'];

/**
 * Page layouts:
 *   guide → course intro, syllabus download, guide / "What is" / "What will you learn", why join / best for, FAQs
 *           (e.g. Beginner's Kit for UPSC)
 *   batch → live batch hero with plans, stages of preparation, plan comparison, FAQs
 *           (e.g. Foundation Batch 2027/29)
 */
export const COURSE_LAYOUTS = ['guide', 'batch'];

const ctaSchema = new Schema(
  {
    label: { type: String, trim: true, required: true },
    // Empty → the default action (Course Details scrolls to the details, Enroll opens the sign-up popup)
    link: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const faqSchema = new Schema(
  {
    q: { type: String, trim: true, required: true },
    a: { type: String, trim: true, required: true },
  },
  { _id: false },
);

const iconItemSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    text: { type: String, trim: true, default: '' },
    // A lucide icon name, e.g. "Compass"
    icon: { type: String, trim: true, default: 'BookOpen' },
  },
  { _id: false },
);

/** Syllabus download: an uploaded image / PDF (data URL until S3) or a link to one. */
const syllabusSchema = new Schema(
  {
    title: { type: String, trim: true, default: '' },
    buttonLabel: { type: String, trim: true, default: '' },
    file: { type: String, default: '' },
    fileName: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const planSchema = new Schema(
  {
    key: { type: String, trim: true, required: true },
    name: { type: String, trim: true, required: true },
    price: { type: Number, min: 0, required: true },
    color: { type: String, trim: true, default: '#13294B' },
    tint: { type: String, trim: true, default: '#F1F5FB' },
    buyLabel: { type: String, trim: true, default: 'Buy Now' },
    buyLink: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const stageSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    // Active timeline as months, "YYYY-MM"
    from: { type: String, trim: true, required: true },
    to: { type: String, trim: true, required: true },
    groups: { type: [{ _id: false, title: String, items: [String] }], default: [] },
    goal: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const batchSchema = new Schema(
  {
    liveLabel: { type: String, trim: true, default: '' },
    batchLabel: { type: String, trim: true, default: '' },
    // Part of the title shown in red
    highlight: { type: String, trim: true, default: '' },
    highlights: { type: [iconItemSchema], default: [] },
    // Small banner on the right of the hero
    banner: {
      image: { type: String, default: '' },
      alt: { type: String, trim: true, default: '' },
    },
    stats: { type: [{ _id: false, value: String, label: String, icon: String }], default: [] },
    stagesTitle: { text: String, highlight: String },
    journey: { title: String, subtitle: String },
    stages: { type: [stageSchema], default: [] },
    plansTitle: { before: String, highlight: String, after: String, subtitle: String },
    plans: { type: [planSchema], default: [] },
    // Comparison rows; `plans` lists the plan keys that include the feature
    features: { type: [{ _id: false, label: String, icon: String, plans: [String] }], default: [] },
    expert: { title: String, highlight: String, text: String, ctaLabel: String },
  },
  { _id: false },
);

const coursePageSchema = new Schema(
  {
    section: { type: String, enum: COURSE_SECTIONS, required: true },
    slug: { type: String, trim: true, required: true },
    // Short name as in the menu, e.g. "Beginner's Kit For UPSC"
    label: { type: String, trim: true, required: true },
    layout: { type: String, enum: COURSE_LAYOUTS, required: true },
    order: { type: Number, default: 0 },

    title: { type: String, trim: true, required: true },
    summary: { type: String, trim: true, default: '' },
    // "FREE Course" (guide layout)
    priceLabel: { type: String, trim: true, default: '' },
    isFree: { type: Boolean, default: false },
    // "YYYY-MM-DD"
    startDate: { type: String, trim: true, default: '' },
    ctas: {
      details: { type: ctaSchema, default: () => ({ label: 'Course Details' }) },
      enroll: { type: ctaSchema, default: () => ({ label: 'Enroll Now' }) },
    },
    faqs: { type: [faqSchema], default: [] },

    // guide layout
    syllabus: { type: syllabusSchema, default: () => ({}) },
    guide: { heading: { type: String, trim: true }, text: { type: String, trim: true } },
    // Card headings, e.g. whatIs: "What is The Beginners' Kit for UPSC CSE 2027/28?"
    headings: {
      whatIs: { type: String, trim: true },
      learn: { type: String, trim: true },
      whyJoin: { type: String, trim: true },
      bestFor: { type: String, trim: true },
    },
    whatIs: { type: [String], default: undefined },
    learn: { type: [iconItemSchema], default: undefined },
    whyJoin: { type: [String], default: undefined },
    bestFor: { type: [String], default: undefined },

    // batch layout
    batch: { type: batchSchema, default: undefined },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminCoursePages },
);

coursePageSchema.index({ section: 1, slug: 1 }, { unique: true });

export default mongoose.model('CoursePage', coursePageSchema);
