import FooterSection, {
  COLUMN_STYLES,
  FOOTER_SECTIONS,
  SECTIONS_WITH_COLUMNS,
} from '../models/FooterSection.js';
import ApiError from '../utils/ApiError.js';
import { assertBoolean, assertText } from '../utils/ordering.js';

/**
 * Footer sections (one document each, by `key`): the columns next to the logo (company), Free Learning Resources
 * and Our Ecosystem Brands.
 * Edited and switched on / off; with Delete access a section is deleted for good (the website then leaves it out),
 * and saving it again creates it anew.
 */

const SECTION_FIELDS = 'key title isActive links columns updatedAt';

const byFooterOrder = (a, b) => FOOTER_SECTIONS.indexOf(a.key) - FOOTER_SECTIONS.indexOf(b.key);

const assertSectionKey = (key) => {
  if (!FOOTER_SECTIONS.includes(key)) throw new ApiError(404, 'Footer section not found.');
};

const toLinks = (links = []) =>
  links.map(({ text = '', link = '', badge = '' }) => ({
    text,
    link,
    badge: String(badge).trim(),
  }));

/** The fields an admin may set, checked. A section keeps either links or columns, by its kind. */
const pickSectionFields = (key, { title = '', isActive = true, links = [], columns = [] }) => {
  assertText(title, 'Heading');
  assertBoolean(isActive, 'isActive');

  const hasColumns = SECTIONS_WITH_COLUMNS.includes(key);

  if (hasColumns) {
    const cleanColumns = columns.map(
      ({ title: columnTitle = '', style = 'links', links: columnLinks = [] }) => ({
        title: columnTitle,
        style: COLUMN_STYLES.includes(style) ? style : 'links',
        links: toLinks(columnLinks),
      }),
    );

    return { title: title.trim(), isActive, columns: cleanColumns, links: [] };
  }

  return { title: title.trim(), isActive, links: toLinks(links), columns: [] };
};

/* ---------- public (website) ---------- */

/**
 * GET /api/footer — { company, freeLearningResources, ecosystemBrands }; a switched-off or deleted section is null.
 * company / freeLearningResources: { title, columns: [{ title, style, links: [{ text, link, badge }] }] };
 * ecosystemBrands: { title, links }.
 */
export const getFooter = async (_req, res) => {
  const sections = await FooterSection.find({ isActive: true, key: { $in: FOOTER_SECTIONS } })
    .select('-_id key title links columns')
    .lean();

  const footer = Object.fromEntries(FOOTER_SECTIONS.map((key) => [key, null]));

  sections.forEach(({ key, title, links, columns }) => {
    if (SECTIONS_WITH_COLUMNS.includes(key)) {
      footer[key] = { title, columns };

      return;
    }

    footer[key] = { title, links };
  });

  res.json(footer);
};

/* ---------- admin ---------- */

/** GET /api/admin/footer — every saved section, in footer order */
export const getFooterSections = async (_req, res) => {
  const sections = await FooterSection.find({ key: { $in: FOOTER_SECTIONS } })
    .select(SECTION_FIELDS)
    .lean();

  res.json(sections.sort(byFooterOrder));
};

/** PUT /api/admin/footer/:key { title, isActive, links | columns } — saves one whole section (creates a deleted one again) */
export const updateFooterSection = async (req, res) => {
  const { key } = req.params;

  assertSectionKey(key);

  const fields = pickSectionFields(key, req.body || {});
  const savedSection = await FooterSection.findOne({ key });
  const section = savedSection || new FooterSection({ key });

  section.set(fields);
  await section.save();

  res.json(section.toObject());
};

/** DELETE /api/admin/footer/:key — deletes a section for good (needs Delete access); the website leaves it out */
export const deleteFooterSection = async (req, res) => {
  const { key } = req.params;

  assertSectionKey(key);

  const section = await FooterSection.findOneAndDelete({ key });

  if (!section) throw new ApiError(404, 'Footer section not found.');

  res.json({ deleted: true, key });
};
