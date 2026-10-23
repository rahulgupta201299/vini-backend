import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

/** "Our Top Rankers" → one headline box, e.g. 1000+ / "70th BPSC & PCS कुल चयन" / "Highest In East India". */
const topRankersStatSchema = new mongoose.Schema(
  {
    // The big number or phrase, e.g. "1000+", "Rank 2"
    value: { type: String, trim: true, required: true },
    label: { type: String, trim: true, required: true },
    sublabel: { type: String, trim: true, default: '' },
    // A lucide icon name, e.g. "Trophy"
    icon: { type: String, trim: true, default: 'Trophy' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminTopRankersStats },
);

export default mongoose.model('TopRankersStat', topRankersStatSchema);
