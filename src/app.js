import './config/env.js'; // first: loads .env before any other module runs

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { notFound, errorHandler } from './common/middlewares/error.middleware.js';
import ApiError from './common/utils/ApiError.js';
import connectDB from './config/db.js';
import { clientUrls, isProd } from './config/env.js';
import healthRoutes from './health/health.routes.js';
import routes from './routes.js';

const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** Production allows only CLIENT_URLS; development also allows any localhost port. */
const isAllowedOrigin = (origin) =>
  clientUrls.includes(origin) || (!isProd && LOCALHOST.test(origin));

const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    // Requests without an Origin header (curl, Postman, server-to-server) are allowed
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);

    return callback(new ApiError(403, `CORS blocked for origin: ${origin}`));
  },
};

/** Makes sure MongoDB is connected before any API route runs (needed on Vercel). */
const requireDatabase = async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch {
    next(new ApiError(503, 'Database unavailable. Please try again.'));
  }
};

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (!isProd) app.use(morgan('dev'));

app.get('/', (_req, res) => res.json({ message: 'VINI API is running' }));

// Health reports database problems itself, so it is mounted before the database guard
app.use('/api/health', healthRoutes);
app.use('/api', requireDatabase, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
