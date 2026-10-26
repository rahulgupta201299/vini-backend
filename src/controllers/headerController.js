import mongoose from 'mongoose';

import HeaderSection, { HEADER_SECTIONS } from '../models/HeaderSection.js';
import ApiError from '../utils/ApiError.js';

/**
 * Header (Web → Header): the desktop menu after "All Exams", the mobile menu and the settings (Store link,
 * trending searches) — one document each, by `key`. "All Exams" comes from Homepage → All Exams.
 */

const byHeaderOrder = (a, b) => HEADER_SECTIONS.indexOf(a.key) - HEADER_SECTIONS.indexOf(b.key);

const assertText = (value, label) => {
  const isValid = typeof value === 'string' && value.trim();

  if (!isValid) throw new ApiError(400, `${label} is required.`);
};

const toLinks = (links, where) =>
  links.map(({ label = '', link = '' }, index) => {
    assertText(label, `${where}, item ${index + 1}: text`);
    assertText(link, `${where}, item ${index + 1}: link`);

    return { label: label.trim(), link: link.trim() };
  });

/** Checked fields for each part (anything else in the body is ignored). */
const PICKERS = {
  menus: ({ menus = [] }) => ({
    menus: menus.map(({ _id, label = '', link = '', badge = '', items = [] }, index) => {
      const where = `Menu ${index + 1}${label ? ` (${label})` : ''}`;

      assertText(label, `${where}: text`);
      assertText(link, `${where}: link`);

      const id = mongoose.isValidObjectId(_id) ? { _id } : {};

      return {
        ...id,
        label: label.trim(),
        link: link.trim(),
        badge: String(badge).trim(),
        items: toLinks(items, where),
      };
    }),
  }),
  mobileMenu: ({ mobileSections = [] }) => ({
    mobileSections: mobileSections.map(({ _id, title = '', items = [] }, index) => {
      const where = `Section ${index + 1}${title ? ` (${title})` : ''}`;

      assertText(title, `${where}: title`);

      const id = mongoose.isValidObjectId(_id) ? { _id } : {};
      const tiles = items.map(({ label = '', link = '', icon = '' }, itemIndex) => {
        assertText(label, `${where}, tile ${itemIndex + 1}: text`);
        assertText(link, `${where}, tile ${itemIndex + 1}: link`);

        return { label: label.trim(), link: link.trim(), icon: String(icon).trim() || 'FileText' };
      });

      return { ...id, title: title.trim(), items: tiles };
    }),
  }),
  settings: ({ storeLink = '', searchTrending = [] }) => {
    assertText(storeLink, 'Store link');

    if (!Array.isArray(searchTrending))
      throw new ApiError(400, 'Trending searches must be a list.');

    return {
      storeLink: storeLink.trim(),
      searchTrending: searchTrending.map((term) => String(term).trim()).filter(Boolean),
    };
  },
};

/* ---------- public (website) ---------- */

/**
 * GET /api/navigation — { navItems, mobileMenu, searchTrending, storeHref } (the website adds "All Exams").
 * navItems: [{ id, label, href, badge?, children?: [{ label, href }] }];
 * mobileMenu: [{ id, title, items: [{ label, href, icon }] }].
 */
export const getNavigation = async (_req, res) => {
  const sections = await HeaderSection.find({ key: { $in: HEADER_SECTIONS } }).lean();
  const byKey = Object.fromEntries(sections.map((section) => [section.key, section]));
  const { menus = [] } = byKey.menus || {};
  const { mobileSections = [] } = byKey.mobileMenu || {};
  const { storeLink = '', searchTrending = [] } = byKey.settings || {};

  const navItems = menus.map(({ _id, label, link, badge, items }) => ({
    id: String(_id),
    label,
    href: link,
    ...(badge && { badge }),
    ...(items.length && {
      children: items.map((item) => ({ label: item.label, href: item.link })),
    }),
  }));

  const mobileMenu = mobileSections.map(({ _id, title, items }) => ({
    id: String(_id),
    title,
    items: items.map(({ label, link, icon }) => ({ label, href: link, icon })),
  }));

  res.json({ navItems, mobileMenu, searchTrending, storeHref: storeLink });
};

/* ---------- admin ---------- */

/** GET /api/admin/header — every saved part, in header order */
export const getHeaderSections = async (_req, res) => {
  const sections = await HeaderSection.find({ key: { $in: HEADER_SECTIONS } }).lean();

  res.json(sections.sort(byHeaderOrder));
};

/** PUT /api/admin/header/:key — saves one whole part: menus { menus }, mobileMenu { mobileSections }, settings { storeLink, searchTrending } */
export const updateHeaderSection = async (req, res) => {
  const { key } = req.params;

  if (!HEADER_SECTIONS.includes(key)) throw new ApiError(404, 'Header section not found.');

  const fields = await PICKERS[key](req.body || {});
  const savedSection = await HeaderSection.findOne({ key });
  const section = savedSection || new HeaderSection({ key });

  section.set(fields);
  await section.save();

  res.json(section.toObject());
};
