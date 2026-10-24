import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

const { Schema } = mongoose;

/**
 * Homepage → All Exams → sub categories (e.g. "UPSC CSE 2026/27" in category "Only IAS"), joined to their
 * category by `category`. Each one has its page at /goal/<slug> and an entry in the header "All Exams" menu.
 * The page content (banners, classes, batches, about, FAQs) is in ExamDetails (adminExamDetails) — `details`
 * holds that document's id.
 */
const allExamsSubCategorySchema = new Schema(
  {
    category: { type: Schema.Types.ObjectId, ref: 'AllExamsCategory', required: true, index: true },
    name: { type: String, trim: true, required: true },
    // Page address (/goal/<slug>), made from the name
    slug: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    // Optional: where the header menu item goes (a page or URL). Empty → the exam's page /goal/<slug>
    link: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0 },
    // Icon in the header "All Exams" menu (a lucide icon name and colours)
    menuIcon: {
      name: { type: String, trim: true, default: 'BookOpen' },
      color: { type: String, trim: true, default: '' },
      background: { type: String, trim: true, default: '' },
    },
    // The page content: id of the ExamDetails document (adminExamDetails)
    details: { type: Schema.Types.ObjectId, ref: 'ExamDetails', default: null },
  },
  { timestamps: true, collection: COLLECTIONS.adminAllExamsSubCategories },
);

export default mongoose.model('AllExamsSubCategory', allExamsSubCategorySchema);
