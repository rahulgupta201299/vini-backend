import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

/** "Our Top Rankers" → a results tab (e.g. "UPSC", "State PCS"). Its banners are in TopRankersBanner. */
const topRankersCategorySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminTopRankersCategories },
);

export default mongoose.model('TopRankersCategory', topRankersCategorySchema);
