import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

/** Site-wide settings, one document per `key`. */
export const SITE_SETTING_KEYS = ['contact'];

const siteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, enum: SITE_SETTING_KEYS, required: true, unique: true },
    // "contact": used by the help tab, callback forms, course pages, structured data…
    phone: { type: String, trim: true, match: [/^\d{10}$/, 'must be a 10-digit mobile number'] },
    whatsappMessage: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminSiteSettings },
);

export default mongoose.model('SiteSetting', siteSettingSchema);
