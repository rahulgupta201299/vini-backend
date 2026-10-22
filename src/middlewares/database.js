import connectDB from '../config/database.js';
import ApiError from '../utils/ApiError.js';

/** Makes sure MongoDB is connected before any API route runs (needed on Vercel). */
export const requireDatabase = async (_req, _res, next) => {
  try {
    await connectDB();
  } catch {
    throw new ApiError(503, 'Database unavailable. Please try again.');
  }

  next();
};
