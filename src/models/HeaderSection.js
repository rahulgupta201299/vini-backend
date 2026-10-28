import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

const { Schema } = mongoose;

/**
 * The header parts managed in the admin (Web → Header), one document each:
 *   menus      → the desktop menu items after "All Exams" (GS Foundation, Mentorship…), each with its dropdown
 *   mobileMenu → the mobile slide menu's titled sections of tiles (Free Resources, Study Material, Featured)
 *   settings   → the Store button's link and the trending searches in the search box
 * "All Exams" itself comes from Homepage → All Exams.
 */
export const HEADER_SECTIONS = ['menus', 'mobileMenu', 'settings'];

const linkSchema = new Schema(
  {
    label: { type: String, trim: true, required: true },
    link: { type: String, trim: true, required: true },
  },
  { _id: false },
);

/** A desktop menu item, with its dropdown. */
const menuSchema = new Schema({
  label: { type: String, trim: true, required: true },
  link: { type: String, trim: true, required: true },
  // Optional small tag next to the label
  badge: { type: String, trim: true, default: '' },
  // Its dropdown (none → a plain link)
  items: { type: [linkSchema], default: [] },
});

/** A mobile menu tile: icon, text and link. */
const mobileItemSchema = new Schema(
  {
    label: { type: String, trim: true, required: true },
    link: { type: String, trim: true, required: true },
    // A lucide icon name, e.g. "Landmark"
    icon: { type: String, trim: true, default: 'FileText' },
    // A desktop menu (its _id in "menus") whose dropdown items open under the tile; none → the tile is a link
    menu: { type: Schema.Types.ObjectId, default: null },
  },
  { _id: false },
);

const mobileSectionSchema = new Schema({
  title: { type: String, trim: true, required: true },
  items: { type: [mobileItemSchema], default: [] },
});

const headerSectionSchema = new Schema(
  {
    key: { type: String, enum: HEADER_SECTIONS, required: true, unique: true },
    // "menus"
    menus: { type: [menuSchema], default: undefined },
    // "mobileMenu"
    mobileSections: { type: [mobileSectionSchema], default: undefined },
    // "settings"
    storeLink: { type: String, trim: true },
    searchTrending: { type: [String], default: undefined },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminHeaderSections },
);

export default mongoose.model('HeaderSection', headerSectionSchema);
