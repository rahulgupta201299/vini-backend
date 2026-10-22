import './config/env.js'; // first: loads .env before any other module runs

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { clientUrls, isProd } from './config/env.js';
import { errorHandler, notFound } from './middlewares/error.js';
import routes from './routes/index.js';
import ApiError from './utils/ApiError.js';

const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** Production allows only CLIENT_URLS; development also allows any localhost port. */
const isAllowedOrigin = (origin) => {
  if (clientUrls.includes(origin)) return true;

  return !isProd && LOCALHOST.test(origin);
};

const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    // Requests without an Origin header (curl, Postman, server-to-server) are allowed
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);

    return callback(new ApiError(403, `CORS blocked for origin: ${origin}`));
  },
};

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
// Homepage content can carry uploaded banner images (until S3 is connected), so it gets a bigger limit
app.use('/api/admin/homepage', express.json({ limit: '15mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (!isProd) app.use(morgan('dev'));

app.get('/', (_req, res) => res.json({ message: 'VINI API is running' }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
