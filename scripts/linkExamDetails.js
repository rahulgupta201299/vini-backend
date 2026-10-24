/**
 * One-off: points every exam's `details` at its page content in adminExamDetails.
 *
 *   npm run db:link-exam-details -- --dry-run   # report only, writes nothing
 *   npm run db:link-exam-details
 *
 * Run it once, right after the backend that reads adminExamDetails is deployed (the old backend expects the
 * page content inside `details`). Safe to run again — exams that are already linked are skipped.
 *
 * 1. Saves every sub category's embedded `details` to backups/exam-details-<time>.json (nothing is lost).
 * 2. adminAllExamsSubCategories: if the embedded `details` was edited after it was copied (on the old admin),
 *    the copy in adminExamDetails is refreshed from it (a missing copy is created); then `details` is set to the
 *    copy's id. Only `details` changes — no other field and no `updatedAt`.
 * 3. adminSelectYourGoalExams: `details` is set to its adminExamDetails id, or null when no page is saved yet.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

import mongoose from 'mongoose';

import { dbName, mongoUri } from '../src/config/env.js';
import ExamDetails, { DETAIL_FIELDS } from '../src/models/ExamDetails.js';
import AllExamsSubCategory from '../src/models/AllExamsSubCategory.js';
import GoalExam from '../src/models/GoalExam.js';

const dryRun = process.argv.includes('--dry-run');
const isEmbedded = (details) => Boolean(details) && !(details instanceof mongoose.Types.ObjectId);
const pickPage = (source = {}) =>
  Object.fromEntries(DETAIL_FIELDS.map((field) => [field, source[field]]));
const samePage = (a, b) =>
  isDeepStrictEqual(
    JSON.parse(JSON.stringify(pickPage(a))),
    JSON.parse(JSON.stringify(pickPage(b))),
  );

await mongoose.connect(mongoUri, { dbName });
console.log(`Database: ${dbName}${dryRun ? ' (dry run — nothing is written)' : ''}`);

const subCategories = AllExamsSubCategory.collection;
const goalExams = GoalExam.collection;
const report = {
  backedUp: 0,
  linked: 0,
  refreshed: [],
  created: [],
  alreadyLinked: 0,
  goalLinked: 0,
  goalWithoutPage: 0,
};

/* 1. Backup */
const embedded = (
  await subCategories.find({}, { projection: { name: 1, details: 1, updatedAt: 1 } }).toArray()
).filter(({ details }) => isEmbedded(details));

if (embedded.length && !dryRun) {
  const file = `backups/exam-details-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

  mkdirSync('backups', { recursive: true });
  writeFileSync(file, JSON.stringify(embedded, null, 2));
  console.log(`Backup: ${file}`);
}
report.backedUp = embedded.length;
report.alreadyLinked = (await subCategories.countDocuments({})) - embedded.length;

/* 2. All Exams sub categories */
for (const { _id, name, details, updatedAt } of embedded) {
  const copy = await ExamDetails.findOne({ exam: _id });
  const isNewer = !copy || (updatedAt > copy.updatedAt && !samePage(details, copy));
  const detailsDoc = copy || new ExamDetails({ exam: _id, source: 'allExams' });

  if (isNewer) {
    detailsDoc.set(pickPage(details));
    await detailsDoc.validate();
    report[copy ? 'refreshed' : 'created'].push(name);
  }

  if (dryRun) continue;

  if (isNewer) await detailsDoc.save();

  await subCategories.updateOne(
    { _id, details: { $type: 'object' } },
    { $set: { details: detailsDoc._id } },
  );
  report.linked += 1;
}

/* 3. Select Your Goal exams (only those without a `details` field yet) */
const unlinkedGoals = await goalExams
  .find({ details: { $exists: false } }, { projection: { _id: 1 } })
  .toArray();
const goalPages = await ExamDetails.find(
  { exam: { $in: unlinkedGoals.map(({ _id }) => _id) } },
  { exam: 1 },
).lean();
const pageByExam = new Map(goalPages.map(({ _id, exam }) => [String(exam), _id]));

for (const { _id } of unlinkedGoals) {
  const detailsId = pageByExam.get(String(_id)) || null;

  report[detailsId ? 'goalLinked' : 'goalWithoutPage'] += 1;

  if (!dryRun)
    await goalExams.updateOne(
      { _id, details: { $exists: false } },
      { $set: { details: detailsId } },
    );
}

console.log(report);
await mongoose.disconnect();
