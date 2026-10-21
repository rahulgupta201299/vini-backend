const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const ApiError = require('./utils/ApiError');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const { nodeEnv, clientUrls } = require('./config/env');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser tools (Postman, curl) that send no Origin header
      if (!origin || clientUrls.includes(origin)) return cb(null, true);
      return cb(new ApiError(403, `CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (nodeEnv === 'development') app.use(morgan('dev'));

app.get('/', (req, res) => res.json({ message: 'VINI API is running' }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
