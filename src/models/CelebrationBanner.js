import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

const { Schema } = mongoose;

const HEX_COLOR = /^#[\da-f]{6}$/i;

const color = (fallback) => ({
  type: String,
  trim: true,
  default: fallback,
  match: [HEX_COLOR, 'must be a colour like #A8323E'],
});

/** One of the three offer cards at the bottom, e.g. "All Online Batches Offers · Starting @ ₹999". */
const offerSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    priceLabel: { type: String, trim: true, default: 'Starting @' },
    price: { type: Number, min: 0, required: true },
    // Colour of the price strip at the bottom of the card
    color: color('#A8323E'),
    link: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

/**
 * Homepage → Celebration banner: a festival sale banner shown under the hero slider (e.g. "Happy Diwali").
 * It shows on the website only while it is active AND between `startsAt` and `endsAt`.
 * Once `endsAt` passes it is switched to inactive automatically.
 */
const celebrationBannerSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    // Empty → the website counts down to `endsAt` ("Sale ends in 3 days", "Sale ending today")
    subtitle: { type: String, trim: true, default: '' },
    // Illustration above the offers. Empty → the website's built-in festive lamps artwork.
    imageUrl: { type: String, default: '' },
    alt: { type: String, trim: true, default: '' },
    theme: {
      titleColor: color('#8B1E2D'),
      accentColor: color('#E07B24'),
      background: color('#FFF8EF'),
    },
    offers: {
      type: [offerSchema],
      validate: [(offers) => offers.length === 3, 'needs exactly 3 offers'],
    },
    // [S3 SNAPSHOT] The whole banner (title, artwork, offers, colours) as one final image, made in the admin
    // on save and uploaded to S3 — e.g. for app screens, emails or social posts. Enable with the frontend's
    // captureBannerSnapshot() (src/lib/bannerSnapshot.ts).
    // snapshotUrl: { type: String, default: '' },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: COLLECTIONS.adminCelebrationBanners },
);

celebrationBannerSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });

export default mongoose.model('CelebrationBanner', celebrationBannerSchema);
