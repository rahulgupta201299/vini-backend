import { isProd } from '../../config/env.js';
import ApiError from '../utils/ApiError.js';

export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

/** Turns known error types into an HTTP status + message. */
const toHttpError = (error) => {
  if (error instanceof ApiError) return { status: error.statusCode, message: error.message };

  if (error.name === 'ValidationError') return { status: 400, message: error.message };

  if (error.name === 'CastError') return { status: 400, message: `Invalid ${error.path}` };

  if (error.code === 11000) {
    const fields = Object.keys(error.keyValue).join(', ');

    return { status: 409, message: `Duplicate value for ${fields}` };
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
