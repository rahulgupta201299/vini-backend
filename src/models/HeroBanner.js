import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

/** Homepage → Hero slider: one slide. The website shows active slides in `order`. */
const heroBannerSchema = new mongoose.Schema(
  {
    // Also the image's alt text on the website
    title: { type: String, trim: true, required: true },
    webImageUrl: { type: String, required: true },
    // Optional phone artwork (16 : 9); used when every active slide has one
    mobileImageUrl: { type: String, default: '' },
    link: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminHeroBanners },
);

export default mongoose.model('HeroBanner', heroBannerSchema);
