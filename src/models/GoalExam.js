import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

/**
 * Homepage → "Select Your Goal": one exam card inside a category (e.g. "UPSC CSE" in "UPSC").
 * Empty `link` → the website links to the exam's goal page (/goal/<name>).
 * `details` holds the id of its page content in ExamDetails (adminExamDetails) — null until an admin saves the page.
 */
const goalExamSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoalCategory',
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true },
    logo: { type: String, default: '' },
    link: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    // The page content: id of the ExamDetails document (adminExamDetails)
    details: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamDetails', default: null },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminSelectYourGoalExams },
);

export default mongoose.model('GoalExam', goalExamSchema);
