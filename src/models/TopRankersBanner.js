import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

/**
 * "Our Top Rankers" → one result banner inside a tab. Web art ≈ 2.9 : 1, phone art ≈ 0.73 : 1.
 * A banner may have only one of them — it then shows only on that screen size.
 */
const topRankersBannerSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TopRankersCategory',
      required: true,
      index: true,
    },
    // Also the image's alt text on the website
    title: { type: String, trim: true, required: true },
    webImageUrl: { type: String, default: '' },
    mobileImageUrl: { type: String, default: '' },
    link: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminTopRankersBanners },
);

export default mongoose.model('TopRankersBanner', topRankersBannerSchema);
