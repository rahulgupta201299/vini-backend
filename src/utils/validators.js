const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;

export const isEmail = (value) =>
  typeof value === 'string' && value.length <= 254 && EMAIL_PATTERN.test(value.trim());

export const isPassword = (value) =>
  typeof value === 'string' &&
  value.length >= MIN_PASSWORD_LENGTH &&
  value.length <= MAX_PASSWORD_LENGTH;

/** Login only checks that a password was typed (the length rule applies when one is set). */
export const isFilledPassword = (value) =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_PASSWORD_LENGTH;
