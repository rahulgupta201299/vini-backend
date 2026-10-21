require('dotenv').config();

const required = ['MONGO_URI'];
required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 8000,
  mongoUri: process.env.MONGO_URI,
  dbName: process.env.DB_NAME || 'vini',
  // Comma-separated list of frontend origins allowed to call the API
  clientUrls: (process.env.CLIENT_URLS || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean),
};
