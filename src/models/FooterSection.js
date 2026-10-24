import mongoose from 'mongoose';

import { COLLECTIONS } from '../config/collections.js';

const { Schema } = mongoose;

/** The footer sections managed in the admin, in the order they appear. */
export const FOOTER_SECTIONS = ['company', 'freeLearningResources', 'ecosystemBrands'];

/** Sections that are one list of links; "freeLearningResources" has titled columns of links instead. */
export const SECTIONS_WITH_COLUMNS = ['freeLearningResources'];

const linkSchema = new Schema(
  {
    text: { type: String, trim: true, required: true },
    link: { type: String, trim: true, required: true },
  },
  { _id: false },
);

const columnSchema = new Schema(
  {
    title: { type: String, trim: true, required: true },
    links: { type: [linkSchema], default: [] },
  },
  { _id: false },
);

/**
 * Footer → one section (heading + links). The rest of the footer (centres, contact, quick links, products)
 * is fixed content in the frontend.
 */
const footerSectionSchema = new Schema(
  {
    key: { type: String, enum: FOOTER_SECTIONS, required: true, unique: true },
    // Heading shown on the website, e.g. "Company"
    title: { type: String, trim: true, required: true },
    isActive: { type: Boolean, default: true },
    // "company" and "ecosystemBrands"
    links: { type: [linkSchema], default: [] },
    // "freeLearningResources": e.g. "Study Material" → its links
    columns: { type: [columnSchema], default: [] },
  },
  { timestamps: true, versionKey: false, collection: COLLECTIONS.adminFooterSections },
);

export default mongoose.model('FooterSection', footerSectionSchema);
