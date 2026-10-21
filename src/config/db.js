import mongoose from 'mongoose';

import { dbName, missingEnv, mongoUri } from './env.js';

const CONNECTED = 1;

let connectionPromise = null;
let lastError = null;

const hideConnectionString = (message) =>
  message.replace(/mongodb(\+srv)?:\/\/\S+/g, 'mongodb://***');

/**
 * Connects to MongoDB once and reuses the connection.
 * Locally server.js calls it at startup. On Vercel (which loads app.js directly) app.js calls it
 * before each API request — only the first call actually connects.
 */
const connectDB = async () => {
  if (missingEnv.length) {
    throw new Error(`Missing environment variable(s): ${missingEnv.join(', ')}`);
  }

  if (mongoose.connection.readyState === CONNECTED) return mongoose.connection;

  connectionPromise ??= mongoose
    .connect(mongoUri, { dbName, serverSelectionTimeoutMS: 10_000 })
    .then(({ connection }) => {
      lastError = null;
      console.log(`MongoDB connected: ${connection.host}/${connection.name}`);

      return connection;
    })
    .catch((error) => {
      connectionPromise = null; // let the next request try again
      lastError = hideConnectionString(error.message);
      console.error(`MongoDB connection error: ${lastError}`);

      throw error;
    });

  return connectionPromise;
};

mongoose.connection.on('disconnected', () => {
  connectionPromise = null;
  console.warn('MongoDB disconnected');
});

/** Last connection error, for GET /api/health (the connection string is hidden). */
export const getLastError = () => lastError;

export default connectDB;
