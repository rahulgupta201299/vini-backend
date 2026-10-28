/**
 * One-off: moves the GS Foundation pages (Beginner's Kit, Foundation Batch 2027/29) and the contact details
 * from the website code into the database, and fixes the menu link to the Foundation Batch page.
 *
 *   npm run db:seed-gs-foundation -- --dry-run   # report only, writes nothing
 *   npm run db:seed-gs-foundation
 *
 * Insert-only: a page or contact document that already exists is left as it is, so it's safe to run again.
 * The header menus are saved to backups/header-menus-<time>.json before the link is changed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import mongoose from 'mongoose';

import { dbName, mongoUri } from '../src/config/env.js';
import CoursePage from '../src/models/CoursePage.js';
import HeaderSection from '../src/models/HeaderSection.js';
import SiteSetting from '../src/models/SiteSetting.js';

const dryRun = process.argv.includes('--dry-run');
const SECTION = 'gs-foundation';
const OLD_BATCH_LINK = `/courses/${SECTION}/foundation-batch-2028`;
const BATCH_LINK = `/courses/${SECTION}/foundation-batch-2027-29`;

const BEGINNERS_KIT = {
  section: SECTION,
  slug: 'beginners-kit-for-upsc',
  label: "Beginner's Kit For UPSC",
  layout: 'guide',
  order: 0,
  title: "Beginners' Kit for UPSC CSE 2027/28",
  summary:
    'This program is designed to give you clarity and direction for your UPSC preparation, from the very beginning to a complete strategy — practical, proven approaches that actually work.',
  priceLabel: 'FREE Course',
  isFree: true,
  startDate: '2026-05-29',
  ctas: {
    details: { label: 'Course Details', link: '#course-details' },
    enroll: { label: 'Enroll Now', link: '' },
  },
  syllabus: {
    title: 'Complete UPSC Topic-Wise Syllabus',
    buttonLabel: 'DOWNLOAD HERE',
    file: '/#resources',
    fileName: '',
  },
  guide: {
    heading: "Beginner's Guide for UPSC Preparation",
    text: "The Beginners' Kit for UPSC CSE 2027/28 is a starter strategy course designed for first-time aspirants. It helps you build a clear preparation roadmap by understanding the UPSC syllabus, planning your time effectively, choosing the right resources, and avoiding common mistakes. This course gives you clarity, confidence, and direction to begin your UPSC journey the right way.",
  },
  headings: {
    whatIs: "What is The Beginners' Kit for UPSC CSE 2027/28?",
    learn: "What will you learn from The Beginners' Kit for UPSC CSE 2027/28?",
    whyJoin: "Why should you join The Beginners' Kit for UPSC CSE 2027/28?",
    bestFor: "Who is The Beginners' Kit for UPSC CSE 2027/28 best for?",
  },
  whatIs: [
    'A strategy-based starter course for UPSC beginners.',
    'Designed especially for first-time aspirants targeting CSE 2027/28.',
    'Helps you build a clear and structured preparation roadmap.',
    'Focuses on planning, not rote learning.',
    'Ideal for college students, working professionals, and fresh aspirants.',
  ],
  learn: [
    { title: 'Complete UPSC CSE 2027 Strategy', icon: 'Compass' },
    { title: 'Time Management Techniques', icon: 'Clock' },
    { title: 'Resource Planning', icon: 'Library' },
    { title: 'Subject Wise Strategy', icon: 'Layers' },
    { title: 'Revision Strategy', icon: 'RotateCcw' },
    { title: 'Mistakes to Avoid During Preparation', icon: 'ShieldAlert' },
  ],
  whyJoin: [
    'Removes confusion and saves months of trial and error.',
    'Gives you a realistic and practical study plan.',
    'Helps you prepare with clarity, confidence, and direction.',
    "Ensures you don't waste time on unnecessary books or courses.",
  ],
  bestFor: [
    'Beginners to UPSC.',
    'Aspirants planning for UPSC CSE 2027/28 seriously.',
    "Students who feel overwhelmed and don't know where to start.",
    'Aspirants who want to prepare smart, not blindly.',
  ],
  faqs: [
    {
      q: 'Who is this course for?',
      a: 'This course is specially designed for beginners and first-time UPSC aspirants who are targeting UPSC CSE 2027/28 and want a clear roadmap before diving into preparation.',
    },
    {
      q: 'I am completely new to UPSC. Can I join this?',
      a: 'Yes, absolutely. In fact, this course is made for absolute beginners who are confused about where to start, what to study, and how to plan.',
    },
    {
      q: 'Will this course cover the full syllabus?',
      a: 'This is a strategy and planning course, not a subject-teaching course. It will help you understand: the complete UPSC syllabus, how to approach each subject, and what resources to use and what to avoid.',
    },
    {
      q: 'Will I get recordings of the live sessions?',
      a: 'Yes. All live sessions will be recorded and shared with enrolled students for revision and future reference.',
    },
    {
      q: 'Do I need to buy books before joining this course?',
      a: 'No. This course will first help you understand which books are actually required and which ones you can safely ignore.',
    },
    {
      q: 'Will this help me make a daily study plan?',
      a: 'Yes. You will learn how to create a realistic daily and weekly schedule, and balance GS, CSAT, current affairs, and revision.',
    },
  ],
};

const BOTH_PLANS = ['foundation', 'foundation-plus'];
const PLUS_ONLY = ['foundation-plus'];

const FOUNDATION_BATCH = {
  section: SECTION,
  slug: 'foundation-batch-2027-29',
  label: 'Foundation Batch 2027/29',
  layout: 'batch',
  order: 2,
  title: 'Live GS Foundation Course for UPSC 2027/29 – Batch 1',
  summary:
    'A complete foundation program to build your concepts, answer writing, and exam temperament from the ground up.',
  priceLabel: '₹24,999',
  isFree: false,
  startDate: '2026-11-16',
  ctas: {
    details: { label: 'Course Details', link: '#course-details' },
    enroll: { label: 'Enroll Now', link: '' },
  },
  batch: {
    liveLabel: 'LIVE BATCH',
    batchLabel: 'Batch 1',
    highlight: 'UPSC 2027/29 –',
    highlights: [
      { title: '700+', text: 'Hours of Live Classes', icon: 'Clock' },
      { title: '1:1', text: 'Mentorship', icon: 'UserRound' },
      { title: 'PYQ coverage', text: 'Learning', icon: 'FileCheck2' },
      { title: 'Answer Writing', text: '& Evaluation', icon: 'PenLine' },
      { title: 'Revision', text: 'Modules', icon: 'RotateCcw' },
      { title: 'MCQ practice', text: 'Learning', icon: 'ListChecks' },
    ],
    banner: {
      image: '/images/banners/banner-upsc-foundation-2027-28.webp',
      alt: 'UPSC Foundation Batch — Hindi & English medium',
    },
    stats: [
      { value: '1000+', label: 'Final Selections', icon: 'Trophy' },
      { value: '1L+', label: 'App Downloads', icon: 'Smartphone' },
      { value: '10,000+', label: 'Doubts Solved', icon: 'MessageCircleQuestion' },
      { value: '10L+', label: 'Students Guided', icon: 'Users' },
    ],
    stagesTitle: { text: '4 Stages Of', highlight: 'Preparation' },
    journey: { title: 'UPSC JOURNEY', subtitle: 'A 4-STAGE GUIDED PATH TO SUCCESS' },
    stages: [
      {
        title: 'FOUNDATION SUBJECTS',
        from: '2026-11',
        to: '2027-06',
        groups: [
          { title: 'CORE SUBJECTS', items: ['Modern History', 'Geography', 'Polity', 'Economy'] },
          {
            title: 'MAISE',
            items: ['Mapping', 'AMAC', 'International Relations', 'Science & Tech', 'Environment'],
          },
        ],
        goal: 'Build strong foundational knowledge across all core subjects and develop analytical understanding.',
      },
      {
        title: 'MAINS PREPARATION',
        from: '2027-07',
        to: '2027-12',
        groups: [
          { title: 'CONTENT & PDF', items: ['GS 1', 'GS 2', 'GS 3', 'GS 4 - Ethics', 'Essay'] },
          {
            title: 'ANSWER WRITING',
            items: ['Write Smart', 'LAWS', 'Mains Test Series', 'Evaluation'],
          },
        ],
        goal: 'Transform foundational knowledge into structured answer writing and develop the analytical depth required to excel in the Mains examination.',
      },
      {
        title: 'PRELIMS PREPARATION',
        from: '2028-01',
        to: '2028-04',
        groups: [
          {
            items: [
              'Live MCQ Solving Sessions (LMS)',
              'PYQ MCQs Covered',
              'MCQ Solving Methodologies',
              'CSAT Practice',
              '500+ MCQs Coverage',
              'Complete Syllabus Coverage',
              'As Per UPSC Standard',
              'Current Affairs',
            ],
          },
        ],
        goal: 'Sharpen exam temperament through intensive MCQ practice, PYQ analysis, and targeted Prelims-focused revision.',
      },
      {
        title: 'UPDATION FOR MAINS',
        from: '2028-05',
        to: '2028-06',
        groups: [
          {
            items: [
              'Updated Current Affairs',
              'Recordings Available',
              'Value Added Materials',
              'Preparation Support',
            ],
          },
        ],
        goal: 'Receive continuous academic support through updated study material, current affairs, value-added notes, and evolving exam-focused content.',
      },
    ],
    plansTitle: {
      before: 'Choose the',
      highlight: 'Plan That Fits',
      after: 'Your Preparation',
      subtitle:
        'Compare features, mentorship, and benefits to find the perfect fit for your UPSC journey.',
    },
    plans: [
      {
        key: 'foundation',
        name: 'FOUNDATION',
        price: 24999,
        color: '#13294B',
        tint: '#F1F5FB',
        buyLabel: 'Buy Now',
        buyLink: '',
      },
      {
        key: 'foundation-plus',
        name: 'FOUNDATION PLUS',
        price: 39999,
        color: '#FE0034',
        tint: '#FFF5F7',
        buyLabel: 'Buy Now',
        buyLink: '',
      },
    ],
    features: [
      { label: 'Live GS Foundation Lecture', icon: 'Video', plans: BOTH_PLANS },
      { label: 'PDF Notes', icon: 'FileText', plans: BOTH_PLANS },
      { label: 'GS Mains Modules (GS 1, 2, 3, 4)', icon: 'BookOpen', plans: BOTH_PLANS },
      { label: 'Essay Coverage', icon: 'PenLine', plans: BOTH_PLANS },
      { label: 'Live Write Smart PYQs 2013-2027', icon: 'BookOpen', plans: BOTH_PLANS },
      { label: 'Live Answer Writing Sessions (LAWS)', icon: 'MessagesSquare', plans: BOTH_PLANS },
      { label: 'Current Affairs Coverage', icon: 'Newspaper', plans: BOTH_PLANS },
      { label: 'CSAT Live Lecture', icon: 'Monitor', plans: BOTH_PLANS },
      { label: 'Prelims Test Series', icon: 'ClipboardCheck', plans: BOTH_PLANS },
      { label: 'Mains Test Series with Evaluations', icon: 'FileCheck2', plans: PLUS_ONLY },
      { label: 'Group Mentorship', icon: 'Users', plans: BOTH_PLANS },
      { label: '1:1 Mentorship', icon: 'UserRound', plans: PLUS_ONLY },
    ],
    expert: {
      title: 'Still Confused? Talk to our',
      highlight: 'UPSC Experts',
      text: 'Get free counselling and guidance for your UPSC preparation.',
      ctaLabel: 'Get Free Mentorship',
    },
  },
  faqs: [
    {
      q: 'Who should join this GS Foundation Course?',
      a: 'This course is designed for UPSC aspirants preparing for CSE 2027, 2028 or 2029, whether they are beginners, college students, working professionals, or repeat aspirants looking for a structured preparation strategy.',
    },
    {
      q: 'Does the course cover both Prelims and Mains?',
      a: 'Yes. The program provides integrated preparation for both Prelims and Mains, including GS Foundation, Mains Preparation, Current Affairs, PYQ Analysis, Answer Writing, CSAT, Tests, and Interview Guidance.',
    },
    {
      q: 'How long will I have access to the course?',
      a: 'The course validity is available till December 2029, allowing students sufficient time for preparation, revision, and multiple attempts if required.',
    },
    {
      q: 'What is the medium of instruction?',
      a: 'Classes are conducted in Hindi & English. Class notes and study material are provided in both English and Hindi.',
    },
    {
      q: 'Will the Foundation Program cover all subjects from the basics?',
      a: 'Yes, the Foundation Program covers all subjects comprehensively from basic to advanced level in a structured manner.',
    },
  ],
};

const CONTACT = {
  key: 'contact',
  phone: '8544078245',
  whatsappMessage: 'Hi Vini IAS, I need guidance for my exam preparation.',
  email: 'support@groupvini.in',
  website: 'https://www.viniias.com',
};

await mongoose.connect(mongoUri, { dbName });
console.log(`Database: ${dbName}${dryRun ? ' (dry run — nothing is written)' : ''}`);

// 1. Course pages (insert-only)
for (const page of [BEGINNERS_KIT, FOUNDATION_BATCH]) {
  const exists = await CoursePage.exists({ section: page.section, slug: page.slug });

  if (exists) {
    console.log(`• ${page.slug}: already saved — skipped`);
    continue;
  }

  if (!dryRun) await CoursePage.create(page);
  console.log(`• ${page.slug}: created`);
}

// 2. Contact details (insert-only)
if (await SiteSetting.exists({ key: CONTACT.key })) {
  console.log('• contact: already saved — skipped');
} else {
  if (!dryRun) await SiteSetting.create(CONTACT);
  console.log('• contact: created');
}

// 3. Menu link to the Foundation Batch page (it pointed at a page that doesn't exist)
const menus = await HeaderSection.findOne({ key: 'menus' });
const brokenItems = (menus?.menus || [])
  .flatMap(({ items }) => items)
  .filter(({ link }) => link === OLD_BATCH_LINK);

if (!brokenItems.length) {
  console.log('• menu link: nothing to fix');
} else {
  if (!dryRun) {
    mkdirSync('backups', { recursive: true });
    const file = `backups/header-menus-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    writeFileSync(file, JSON.stringify(menus.toObject(), null, 2));
    console.log(`  backup: ${file}`);

    brokenItems.forEach((item) => {
      item.link = BATCH_LINK;
    });
    await menus.save();
  }

  console.log(`• menu link: ${OLD_BATCH_LINK} → ${BATCH_LINK} (${brokenItems.length})`);
}

await mongoose.disconnect();
