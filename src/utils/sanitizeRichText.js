import sanitizeHtml from 'sanitize-html';

/**
 * Cleans HTML from the admin rich text editor before it is saved, so only formatting reaches the website
 * (no scripts, event handlers, iframes or inline styles other than text alignment).
 */
const OPTIONS = {
  allowedTags: [
    'p',
    'br',
    'h2',
    'h3',
    'h4',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'mark',
    'sub',
    'sup',
    'code',
    'blockquote',
    'ul',
    'ol',
    'li',
    'a',
    'hr',
    'table',
    'colgroup',
    'col',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    th: ['colspan', 'rowspan', 'colwidth'],
    td: ['colspan', 'rowspan', 'colwidth'],
    col: ['style'],
    '*': ['style'],
  },
  allowedStyles: {
    '*': { 'text-align': [/^(left|right|center|justify)$/] },
    col: { width: [/^\d+px$/], 'min-width': [/^\d+px$/] },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  // Links to other sites open in a new tab, safely
  transformTags: {
    a: (tagName, attribs) => {
      const isExternal = /^https?:\/\//i.test(attribs.href || '');

      return {
        tagName,
        attribs: isExternal
          ? { ...attribs, target: '_blank', rel: 'noopener noreferrer' }
          : attribs,
      };
    },
  },
};

const sanitizeRichText = (html) =>
  typeof html === 'string' ? sanitizeHtml(html, OPTIONS).trim() : '';

export default sanitizeRichText;
