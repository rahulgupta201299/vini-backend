const { nodeEnv } = require('../../config/env');

exports.notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'ValidationError') status = 400;
  if (err.name === 'CastError') { status = 400; message = `Invalid ${err.path}`; }
  if (err.code === 11000) { status = 409; message = `Duplicate value for ${Object.keys(err.keyValue).join(', ')}`; }

  if (status >= 500) console.error(err);
  res.status(status).json({
    message,
    ...(nodeEnv === 'development' && status >= 500 && { stack: err.stack }),
  });
};
