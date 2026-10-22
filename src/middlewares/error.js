import { isProd } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

/** "details.faqs.0.answer" → "faqs #1 › answer" */
const readablePath = (path) =>
  path
    .replace(/^details\./, '')
    .replace(/\.(\d+)/g, (_match, index) => ` #${Number(index) + 1}`)
    .replaceAll('.', ' › ');

/** Mongoose validation errors as one readable sentence, e.g. "faqs #1 › answer is required". */
const validationMessage = ({ errors }) =>
  Object.entries(errors)
    .filter(([, error]) => error.name !== 'ValidationError') // skip parent summaries, keep each field
    .map(
      ([path, { kind }]) =>
        `${readablePath(path)} ${kind === 'required' ? 'is required' : 'is invalid'}`,
    )
    .join(', ');

/** Turns known error types into an HTTP status + message. */
const toHttpError = (error) => {
  if (error instanceof ApiError) return { status: error.statusCode, message: error.message };

  if (error.name === 'ValidationError') return { status: 400, message: validationMessage(error) };

  if (error.name === 'CastError') return { status: 400, message: `Invalid ${error.path}` };

  if (error.code === 11000) {
    const { keyValue = {} } = error;
    const [field = 'value'] = Object.keys(keyValue);

    return { status: 409, message: `This ${field} is already in use.` };
  }

  // Unexpected errors: don't leak internal details in production
  return { status: 500, message: isProd ? 'Internal Server Error' : error.message };
};

// Express recognises an error handler by its 4 arguments, so `_next` must stay.
export const errorHandler = (error, _req, res, _next) => {
  const { status, message } = toHttpError(error);

  if (status >= 500) console.error(error);

  res.status(status).json({ message });
};
