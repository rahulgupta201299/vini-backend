import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

/** Homepage → "Select Your Goal": a category tab (e.g. "UPSC", "SSC"). Its exams are in GoalExam. */
const goalCategorySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.goalCategories },
);

export default mongoose.model('GoalCategory', goalCategorySchema);
