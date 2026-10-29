import { actionForMethod, can } from '../config/permissions.js';
import CoursePage, { COURSE_SECTION_ACCESS, COURSE_SECTIONS } from '../models/CoursePage.js';
import ApiError from '../utils/ApiError.js';
import { DAY_PATTERN, formatDay, formatMonth, MONTH_PATTERN } from '../utils/courseFormat.js';
import { assertText, findByIdOrThrow } from '../utils/ordering.js';

/**
 * Course pages (/courses/<section>/<slug>), e.g. GS Foundation → Beginner's Kit, Foundation Batch 2027/29,
 * Mentorship → 1:1 Mentorship 2028/29. The admin edits a page part by part; parts not listed for a layout
 * can't be changed from the admin. Each course section needs its own admin access (COURSE_SECTION_ACCESS).
 */

/* ---------- checks ---------- */

const LINK_PATTERN = /^(\/|#|https?:\/\/)/i;
// A YouTube video page: youtube.com/watch?v=…, /shorts/…, /live/…, /embed/… or youtu.be/…
const YOUTUBE_PATTERN =
  /^https:\/\/((www|m)\.)?(youtube\.com\/(watch\?(.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)[\w-]{6,}/i;
const INLINE_FILE_PATTERN = /^data:(image\/[\w.+-]+|application\/pdf);base64,/i;
// ~3 MB file → ~4 MB as a data URL (until S3 is connected)
const MAX_INLINE_FILE_LENGTH = 4.2 * 1024 * 1024;

const text = (value) => String(value || '').trim();

const assertLink = (value, label) => {
  const link = text(value);

  if (link && !LINK_PATTERN.test(link))
    throw new ApiError(400, `${label} must start with /, # or https://`);

  return link;
};

const assertList = (value, label) => {
  if (!Array.isArray(value)) throw new ApiError(400, `${label} must be a list.`);

  return value;
};

const toTextList = (value, label) => assertList(value, label).map(text).filter(Boolean);

const toDay = (value, label) => {
  const day = text(value);

  if (!DAY_PATTERN.test(day)) throw new ApiError(400, `${label} is required.`);

  return day;
};

const toCta = (name, cta) => {
  const { label = '', link = '' } = cta || {};

  assertText(label, `${name} button text`);

  return { label: label.trim(), link: assertLink(link, `${name} link`) };
};

const toFaqs = (faqs) =>
  assertList(faqs, 'FAQs').map((faq, index) => {
    const { q = '', a = '' } = faq || {};

    assertText(q, `FAQ ${index + 1}: question`);
    assertText(a, `FAQ ${index + 1}: answer`);

    return { q: q.trim(), a: a.trim() };
  });

const toFile = (value) => {
  const file = String(value || '');

  if (!file) return '';

  if (INLINE_FILE_PATTERN.test(file)) {
    if (file.length > MAX_INLINE_FILE_LENGTH)
      throw new ApiError(413, 'The syllabus file is too big — please use one under 3 MB.');

    return file;
  }

  return assertLink(file, 'Syllabus file');
};

/** Edits the same number of items as saved, by position (only the given fields change). */
const editByPosition = (saved, edits, label, edit) => {
  assertList(edits, label);

  if (edits.length !== saved.length)
    throw new ApiError(400, `${label} has changed. Reload the page and try again.`);

  return saved.map((item, index) => ({ ...item, ...edit(edits[index] || {}, index) }));
};

/** "4 Stages Of" + red "Preparation" */
const toHighlightTitle = ({ text: before = '', highlight = '' }, label) => {
  assertText(highlight, `${label}: red words`);

  return { text: text(before), highlight: highlight.trim() };
};

/** "Choose the" + red "Plan That Fits" + "Your Preparation", and the line under it */
const toPlansTitle = ({ before = '', highlight = '', after = '', subtitle = '' }) => {
  assertText(highlight, 'Plans heading: red words');

  return {
    before: text(before),
    highlight: highlight.trim(),
    after: text(after),
    subtitle: text(subtitle),
  };
};

/* ---------- editable parts per layout ---------- */

const intro = ({ title = '', summary = '', startDate = '' }) => {
  assertText(title, 'Title');
  assertText(summary, 'Description');

  return {
    title: title.trim(),
    summary: summary.trim(),
    startDate: toDay(startDate, 'Start date'),
  };
};

const ctas = ({ details, enroll }) => ({
  ctas: { details: toCta('Course Details', details), enroll: toCta('Enroll', enroll) },
});

const faqs = ({ faqs: items = [] }) => ({ faqs: toFaqs(items) });

const GUIDE_PARTS = {
  intro: (body) => {
    assertText(body.priceLabel, 'Price text');

    return { ...intro(body), priceLabel: body.priceLabel.trim() };
  },
  ctas,
  syllabus: ({ title = '', buttonLabel = '', file = '', fileName = '' }) => {
    assertText(title, 'Syllabus title');
    assertText(buttonLabel, 'Syllabus button text');

    return {
      syllabus: {
        title: title.trim(),
        buttonLabel: buttonLabel.trim(),
        file: toFile(file),
        fileName: text(fileName),
      },
    };
  },
  overview: ({ guide = {}, headings = {}, whatIs = [], learn = [] }, page) => {
    assertText(guide.heading, 'Guide heading');
    assertText(guide.text, 'Guide text');
    assertText(headings.whatIs, '“What is” heading');
    assertText(headings.learn, '“What will you learn” heading');

    return {
      guide: { heading: guide.heading.trim(), text: guide.text.trim() },
      headings: { ...page.headings, whatIs: headings.whatIs.trim(), learn: headings.learn.trim() },
      whatIs: toTextList(whatIs, '“What is” points'),
      learn: assertList(learn, '“What will you learn” cards').map((card, index) => {
        const { title = '', icon = '' } = card || {};

        assertText(title, `Learn card ${index + 1}: title`);

        return { title: title.trim(), icon: text(icon) || 'BookOpen' };
      }),
    };
  },
  fit: ({ headings = {}, whyJoin = [], bestFor = [] }, page) => {
    assertText(headings.whyJoin, '“Why should you join” heading');
    assertText(headings.bestFor, '“Best for” heading');

    return {
      headings: {
        ...page.headings,
        whyJoin: headings.whyJoin.trim(),
        bestFor: headings.bestFor.trim(),
      },
      whyJoin: toTextList(whyJoin, '“Why should you join” points'),
      bestFor: toTextList(bestFor, '“Best for” points'),
    };
  },
  faqs,
};

const BATCH_PARTS = {
  intro: (body, page) => {
    const fields = intro(body);
    const highlight = text(body.highlight);

    if (highlight && !fields.title.includes(highlight))
      throw new ApiError(400, 'The red part of the title must be words from the title.');

    return { ...fields, batch: { ...page.batch, highlight } };
  },
  plans: ({ plans = [] }, page) => ({
    batch: {
      ...page.batch,
      plans: editByPosition(page.batch.plans, plans, 'Plans', ({ name = '', price }, index) => {
        assertText(name, `Plan ${index + 1}: name`);

        const amount = Number(price);

        if (!Number.isFinite(amount) || amount < 0)
          throw new ApiError(400, `Plan ${index + 1}: price must be a number.`);

        return { name: name.trim(), price: Math.round(amount) };
      }),
    },
  }),
  ctas,
  banner: ({ image = '', alt = '' }, page) => {
    const file = toFile(image);

    if (!file) throw new ApiError(400, 'Add the banner image.');

    if (file.startsWith('data:application/pdf'))
      throw new ApiError(400, 'The banner must be an image.');

    return { batch: { ...page.batch, banner: { image: file, alt: text(alt) } } };
  },
  stages: ({ stagesTitle = {}, stages = [] }, page) => ({
    batch: {
      ...page.batch,
      stagesTitle: toHighlightTitle(stagesTitle, 'Stages heading'),
      stages: editByPosition(
        page.batch.stages,
        stages,
        'Stages',
        ({ from = '', to = '' }, index) => {
          const where = `Stage ${index + 1}`;

          if (!MONTH_PATTERN.test(from) || !MONTH_PATTERN.test(to))
            throw new ApiError(400, `${where}: choose both months of the timeline.`);

          if (from > to)
            throw new ApiError(400, `${where}: the timeline must end after it starts.`);

          return { from, to };
        },
      ),
    },
  }),
  planButtons: ({ plansTitle = {}, plans = [] }, page) => ({
    batch: {
      ...page.batch,
      plansTitle: toPlansTitle(plansTitle),
      plans: editByPosition(
        page.batch.plans,
        plans,
        'Plans',
        ({ buyLabel = '', buyLink = '' }, index) => {
          assertText(buyLabel, `Plan ${index + 1}: button text`);

          return {
            buyLabel: buyLabel.trim(),
            buyLink: assertLink(buyLink, `Plan ${index + 1}: link`),
          };
        },
      ),
    },
  }),
  faqs,
};

/** "34999" → "₹34,999" */
const formatRupees = (amount) => `₹${amount.toLocaleString('en-IN')}`;

/** A part that only some mentorship pages have (the form offer, the timeline). */
const mentorshipBlock = (page, key, label) => {
  const block = page.mentorship?.[key];

  if (!block) throw new ApiError(404, `This page has no ${label}.`);

  return block;
};

const MENTORSHIP_PARTS = {
  // Title, description, start date and — on paid pages — the price
  intro: (body, page) => {
    const fields = intro(body);

    if (page.isFree) return fields;

    const price = Number(body.price);

    if (body.price === '' || !Number.isFinite(price) || price < 0)
      throw new ApiError(400, 'Price must be a number.');

    const amount = Math.round(price);

    return {
      ...fields,
      priceLabel: formatRupees(amount),
      mentorship: { ...page.mentorship, price: amount },
    };
  },
  video: ({ url = '' }, page) => {
    const link = text(url);

    if (!YOUTUBE_PATTERN.test(link))
      throw new ApiError(400, 'Add a YouTube video link, e.g. https://www.youtube.com/watch?v=…');

    return { mentorship: { ...page.mentorship, video: { ...page.mentorship.video, url: link } } };
  },
  offer: ({ link = '' }, page) => {
    const offer = mentorshipBlock(page, 'offer', 'form offer');

    assertText(link, 'Form link');

    return {
      mentorship: { ...page.mentorship, offer: { ...offer, link: assertLink(link, 'Form link') } },
    };
  },
  ctas,
  timeline: ({ phases = [] }, page) => {
    const timeline = mentorshipBlock(page, 'timeline', 'timeline');

    return {
      mentorship: {
        ...page.mentorship,
        timeline: {
          ...timeline,
          phases: editByPosition(
            timeline.phases,
            phases,
            'Phases',
            ({ from = '', to = '' }, index) => {
              const where = `Phase ${index + 1}`;

              if (!MONTH_PATTERN.test(from))
                throw new ApiError(400, `${where}: choose the start month.`);

              if (to && !MONTH_PATTERN.test(to))
                throw new ApiError(400, `${where}: choose the end month.`);

              if (to && from > to)
                throw new ApiError(400, `${where}: the dates must end after they start.`);

              return { from, to: text(to) };
            },
          ),
        },
      },
    };
  },
  faqs,
};

const PARTS = { guide: GUIDE_PARTS, batch: BATCH_PARTS, mentorship: MENTORSHIP_PARTS };

/* ---------- website shape ---------- */

const isInlineFile = (file) => INLINE_FILE_PATTERN.test(file);

/** Where the syllabus button goes: the file itself, or (uploaded files) the website's download route. */
const syllabusFor = ({ section, slug, syllabus, updatedAt }) => {
  const { title, buttonLabel, file } = syllabus || {};

  if (!file) return undefined;

  // The version changes with every save, so a newly uploaded file is never served from an old cache
  const version = new Date(updatedAt).getTime();
  const href = isInlineFile(file) ? `/courses/${section}/${slug}/syllabus?v=${version}` : file;

  return { title, buttonLabel, href };
};

const batchFor = (page) => {
  const { batch, title, summary, startDate } = page;
  const { banner, stages, plans, ...rest } = batch;

  return {
    ...rest,
    hero: {
      liveLabel: batch.liveLabel,
      batchLabel: batch.batchLabel,
      title,
      highlight: batch.highlight,
      description: summary,
      highlights: batch.highlights,
      startDate: formatDay(startDate),
      image: { src: banner.image, alt: banner.alt || title },
    },
    stages: stages.map(({ title: stageTitle, from, to, groups, goal }) => ({
      title: stageTitle,
      timeline: `${formatMonth(from)} - ${formatMonth(to)}`,
      groups,
      goal,
    })),
    plans: plans.map(({ key, ...plan }) => ({ id: key, ...plan })),
  };
};

/** "December 2026 - December 2027", or "May 2028 Onward" without an end month */
const periodOf = ({ from, to }) =>
  to ? `${formatMonth(from)} - ${formatMonth(to)}` : `${formatMonth(from)} Onward`;

const mentorshipFor = ({ mentorship, title }) => {
  const { priceNote, batchLabel, video, offer, timeline, content } = mentorship;

  return {
    ...content,
    ...(priceNote && { priceNote }),
    ...(batchLabel && { batchLabel }),
    media: {
      image: video.image,
      alt: video.alt || title,
      caption: video.caption,
      videoUrl: video.url,
    },
    ...(offer && { offer }),
    ...(timeline && {
      timeline: {
        title: timeline.title,
        subtitle: timeline.subtitle,
        phases: timeline.phases.map(({ phase, title: phaseTitle, from, to }) => ({
          phase,
          title: phaseTitle,
          period: periodOf({ from, to }),
        })),
      },
    }),
  };
};

/** Card headings, defaulting to the old wording built from the title */
const headingsFor = ({ title, headings = {} }) => ({
  whatIs: headings.whatIs || `What is The ${title}?`,
  learn: headings.learn || `What will you learn from The ${title}?`,
  whyJoin: headings.whyJoin || `Why should you join The ${title}?`,
  bestFor: headings.bestFor || `Who is The ${title} best for?`,
});

/** A page as the website renders it (the shape of FreeResourcePage in the website code). */
const toPublicPage = (page) => {
  const {
    slug,
    label,
    title,
    summary,
    priceLabel,
    isFree,
    startDate,
    ctas: pageCtas,
    layout,
  } = page;
  const startDay = formatDay(startDate);

  return {
    slug,
    label,
    title,
    summary,
    priceLabel,
    isFree,
    startInfo: startDay ? `Starting from ${startDay}` : '',
    ctas: pageCtas,
    syllabus: syllabusFor(page),
    guide: page.guide || { heading: '', text: '' },
    headings: headingsFor(page),
    whatIs: page.whatIs || [],
    learn: page.learn || [],
    whyJoin: page.whyJoin || [],
    bestFor: page.bestFor || [],
    faqs: page.faqs,
    ...(layout === 'batch' && { batch: batchFor(page) }),
    ...(layout === 'mentorship' && { mentorship: mentorshipFor(page) }),
  };
};

const findPublicPage = async ({ section, slug }) => {
  if (!COURSE_SECTIONS.includes(section)) throw new ApiError(404, 'Course page not found.');

  const page = await CoursePage.findOne({ section, slug }).lean();

  if (!page) throw new ApiError(404, 'Course page not found.');

  return page;
};

/* ---------- public (website) ---------- */

/** GET /api/courses/:section/:slug — the page for the website */
export const getCoursePage = async (req, res) => {
  res.json(toPublicPage(await findPublicPage(req.params)));
};

/** GET /api/courses/:section/:slug/syllabus — the uploaded syllabus { file, fileName } (the website streams it) */
export const getCourseSyllabus = async (req, res) => {
  const { syllabus } = await findPublicPage(req.params);
  const { file = '', fileName = '' } = syllabus || {};

  if (!isInlineFile(file)) throw new ApiError(404, 'No uploaded syllabus.');

  res.json({ file, fileName });
};

/* ---------- admin ---------- */

/** Throws unless the admin has the access this request needs in the page's course section (e.g. Mentorship). */
const assertCourseAccess = (req, section) => {
  const action = actionForMethod(req.method);

  if (can(req.admin, COURSE_SECTION_ACCESS[section], action)) return;

  if (action === 'edit') throw new ApiError(403, 'You can only view this section.');

  throw new ApiError(403, "You don't have access to this section.");
};

/** GET /api/admin/courses — the pages (without their content) of the sections this admin can view, in menu order */
export const getCoursePages = async (req, res) => {
  const sections = COURSE_SECTIONS.filter((section) =>
    can(req.admin, COURSE_SECTION_ACCESS[section], 'view'),
  );
  const pages = await CoursePage.find({ section: { $in: sections } })
    .select('section slug label layout title updatedAt')
    .sort({ section: 1, order: 1 })
    .lean();

  res.json(pages);
};

/** GET /api/admin/courses/:id — one page with everything the admin edits */
export const getCoursePageById = async (req, res) => {
  const page = (await findByIdOrThrow(CoursePage, req.params.id, 'Course page')).toObject();

  assertCourseAccess(req, page.section);

  const headings = page.layout === 'guide' ? { headings: headingsFor(page) } : {};

  res.json({ ...page, ...headings });
};

/** PUT /api/admin/courses/:id/:part — saves one part of a page (the parts depend on its layout) */
export const updateCoursePagePart = async (req, res) => {
  const page = await findByIdOrThrow(CoursePage, req.params.id, 'Course page');

  assertCourseAccess(req, page.section);

  const pickPart = PARTS[page.layout][req.params.part];

  if (!pickPart) throw new ApiError(404, 'This part of the page can’t be edited.');

  page.set(pickPart(req.body || {}, page.toObject()));
  await page.save();

  const saved = page.toObject();
  const headings = saved.layout === 'guide' ? { headings: headingsFor(saved) } : {};

  res.json({ ...saved, ...headings });
};
