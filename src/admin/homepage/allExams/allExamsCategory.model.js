import mongoose from 'mongoose';

import { COLLECTIONS } from '../../../config/collections.js';

/**
 * Homepage → All Exams → categories (e.g. "Only IAS"). Each category has many sub categories
 * (see allExamsSubCategory.model.js). Inactive categories are hidden on the website with all their sub categories.
 */
const allExamsCategorySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    // Display order in the header "All Exams" menu
    order: { type: Number, default: 0 },
  },
  { timestamps: true, collection: COLLECTIONS.allExamsCategories },
);

export default mongoose.model('AllExamsCategory', allExamsCategorySchema);
