import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

export const PLACEMENTS = ['first', 'second'];

/**
 * Homepage → marketing banners. `placement` says where it shows:
 *   first  — under "Browse Our Free Resources"
 *   second — under "Select Your Goal"
 * Several active banners in one place turn into a slider.
 */
const marketingBannerSchema = new mongoose.Schema(
  {
    placement: { type: String, enum: PLACEMENTS, required: true },
    // Also the image's alt text on the website
    title: { type: String, trim: true, required: true },
    webImageUrl: { type: String, required: true },
    mobileImageUrl: { type: String, default: '' },
    link: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.marketingBanners },
);

export default mongoose.model('MarketingBanner', marketingBannerSchema);
