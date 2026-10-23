import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

/** Homepage → "Browse Our Free Resources": one tile (icon, title, link). */
const freeResourceSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    // A lucide icon name, e.g. "Newspaper"
    icon: { type: String, trim: true, default: 'BookOpen' },
    // Icon colour; the tile's soft background is made from it
    color: {
      type: String,
      trim: true,
      default: '#0284C7',
      match: [/^#[\da-f]{6}$/i, 'must be a colour like #0284C7'],
    },
    link: { type: String, trim: true, required: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminFreeResources },
);

export default mongoose.model('FreeResource', freeResourceSchema);
