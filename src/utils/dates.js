import ApiError from './ApiError.js';

const SITE_TIME_ZONE = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar day in India as a UTC timestamp, so two dates can be compared by whole days. */
const indianDay = (date) => {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TIME_ZONE })
    .format(date)
    .split('-')
    .map(Number);

  return Date.UTC(year, month - 1, day);
};

/** "Sale ending today" / "Sale ends tomorrow" / "Sale ends in 4 days", counted in Indian days. */
export const countdownText = (endsAt, now = new Date()) => {
  const days = Math.round((indianDay(endsAt) - indianDay(now)) / DAY_MS);

  if (days <= 0) return 'Sale ending today';
  if (days === 1) return 'Sale ends tomorrow';

  return `Sale ends in ${days} days`;
};

/** A date from a request body, or a 400 error naming the field. */
export const toDate = (value, label) => {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) throw new ApiError(400, `${label} is required.`);

  return date;
};
