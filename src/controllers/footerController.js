import FooterSection, { FOOTER_SECTIONS, SECTIONS_WITH_COLUMNS } from '../models/FooterSection.js';
import ApiError from '../utils/ApiError.js';
import { assertBoolean, assertText } from '../utils/ordering.js';

/**
 * Footer → Company, Free Learning Resources and Our Ecosystem Brands (one document each).
 * The three sections always exist; they are edited and switched on / off, never added or deleted.
 */

const SECTION_FIELDS = 'key title isActive links columns updatedAt';

const byFooterOrder = (a, b) => FOOTER_SECTIONS.indexOf(a.key) - FOOTER_SECTIONS.indexOf(b.key);

const assertSectionKey = (key) => {
  if (!FOOTER_SECTIONS.includes(key)) throw new ApiError(404, 'Footer section not found.');
};

const toLinks = (links = []) => links.map(({ text = '', link = '' }) => ({ text, link }));

/** The fields an admin may set, checked. A section keeps either links or columns, by its kind. */
const pickSectionFields = (key, { title = '', isActive = true, links = [], columns = [] }) => {
  assertText(title, 'Heading');
  assertBoolean(isActive, 'isActive');

  const hasColumns = SECTIONS_WITH_COLUMNS.includes(key);

  if (hasColumns) {
    const cleanColumns = columns.map(({ title: columnTitle = '', links: columnLinks = [] }) => ({
      title: columnTitle,
      links: toLinks(columnLinks),
    }));

    return { title: title.trim(), isActive, columns: cleanColumns, links: [] };
  }

  return { title: title.trim(), isActive, links: toLinks(links), columns: [] };
};

/* ---------- public (website) ---------- */

/**
 * GET /api/footer — { company, freeLearningResources, ecosystemBrands }; a switched-off section is null.
 * company / ecosystemBrands: { title, links: [{ text, link }] }; freeLearningResources: { title, columns }.
 */
export const getFooter = async (_req, res) => {
  const sections = await FooterSection.find({ isActive: true })
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

/** GET /api/admin/homepage/footer — the three sections, in footer order */
export const getFooterSections = async (_req, res) => {
  const sections = await FooterSection.find().select(SECTION_FIELDS).lean();

  res.json(sections.sort(byFooterOrder));
};

/** PUT /api/admin/homepage/footer/:key { title, isActive, links | columns } — saves one whole section */
export const updateFooterSection = async (req, res) => {
  const { key } = req.params;

  assertSectionKey(key);

  const fields = pickSectionFields(key, req.body || {});
  const section = await FooterSection.findOne({ key });

  if (!section) throw new ApiError(404, 'Footer section not found.');

  section.set(fields);
  await section.save();

  res.json(section.toObject());
};
