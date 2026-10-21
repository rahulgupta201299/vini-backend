const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const ApiError = require('./common/utils/ApiError');
const { notFound, errorHandler } = require('./common/middlewares/error.middleware');
const connectDB = require('./config/db');
const { nodeEnv, isProd, clientUrls } = require('./config/env');

// Development: any http://localhost:<port> / 127.0.0.1 frontend is allowed. Production: only CLIENT_URLS.
const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const isAllowedOrigin = (origin) => clientUrls.includes(origin) || (!isProd && LOCALHOST.test(origin));

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser tools (Postman, curl) that send no Origin header
      if (!origin || isAllowedOrigin(origin)) return cb(null, true);
      return cb(new ApiError(403, `CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
if (nodeEnv === 'development') app.use(morgan('dev'));

// Make sure MongoDB is connected before any API route runs (needed on Vercel, where server.js is not used)
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch {
    next(new ApiError(503, 'Database unavailable. Please try again.'));
  }
});

app.get('/', (req, res) => res.json({ message: 'VINI API is running' }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
