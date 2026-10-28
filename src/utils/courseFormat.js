const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const DAY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 1 → "1st", 22 → "22nd", 13 → "13th" */
const ordinal = (day) => {
  const lastTwo = day % 100;

  if (lastTwo >= 11 && lastTwo <= 13) return `${day}th`;

  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th';

  return `${day}${suffix}`;
};

/** "2026-05-29" → "29th May 2026" ("" when not set) */
export const formatDay = (value = '') => {
  if (!DAY_PATTERN.test(value)) return '';

  const [year, month, day] = value.split('-').map(Number);

  return `${ordinal(day)} ${MONTHS[month - 1]} ${year}`;
};

/** "2027-07" → "July 2027" */
export const formatMonth = (value = '') => {
  if (!MONTH_PATTERN.test(value)) return '';

  const [year, month] = value.split('-').map(Number);

  return `${MONTHS[month - 1]} ${year}`;
};
