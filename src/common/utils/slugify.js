/** "UPSC CSE 2026/27" → "upsc-cse-2026-27". Must match slugify() in the Frontend (src/utils/slug.ts). */
const slugify = (text) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default slugify;
