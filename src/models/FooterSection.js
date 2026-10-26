import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

const { Schema } = mongoose;

/**
 * The footer sections managed in the admin, in the order they appear: the columns next to the logo
 * ("company" — Company, Upcoming Centres, Connect with us, Quick Links, Our Products, Prep Resources…),
 * the Free Learning Resources block and the Our Ecosystem Brands row.
 */
export const FOOTER_SECTIONS = ['company', 'freeLearningResources', 'ecosystemBrands'];

/** Sections made of titled columns of links; "ecosystemBrands" is one list of links. */
export const SECTIONS_WITH_COLUMNS = ['company', 'freeLearningResources'];

/**
 * How a column's links look on the website (columns next to the logo):
 *   links     → plain links
 *   locations → each with a location pin (Upcoming Centres)
 *   contact   → by link: mailto: email, tel: Call button, wa.me WhatsApp button, anything else chat (Connect with us)
 */
export const COLUMN_STYLES = ['links', 'locations', 'contact'];

const linkSchema = new Schema(
  {
    text: { type: String, trim: true, required: true },
    link: { type: String, trim: true, required: true },
    // Optional small animated tag shown next to the link, e.g. "We are hiring" beside Careers
    badge: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const columnSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    style: { type: String, enum: COLUMN_STYLES, default: 'links' },
    links: { type: [linkSchema], default: [] },
  },
  { _id: false },
);

/** Footer → one section: a heading with titled columns of links, or (ecosystemBrands) one list of links. */
const footerSectionSchema = new Schema(
  {
    key: { type: String, enum: FOOTER_SECTIONS, required: true, unique: true },
    // Heading shown on the website, e.g. "Company"
    title: { type: String, trim: true, required: true },
    isActive: { type: Boolean, default: true },
    // "ecosystemBrands"
    links: { type: [linkSchema], default: [] },
    // "company" (e.g. "Upcoming Centres" → its links) and "freeLearningResources" (e.g. "Study Material" → its links)
    columns: { type: [columnSchema], default: [] },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminFooterSections },
);

export default mongoose.model('FooterSection', footerSectionSchema);
