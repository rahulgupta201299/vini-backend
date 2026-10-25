import mongoose from 'mongoose';

import { ensureAccessCatalogue } from '../utils/accessCatalogue.js';

import { dbName, missingEnv, mongoUri } from './env.js';

const CONNECTED = 1;

/**
 * Connection pool settings. On Vercel every running function instance keeps its own pool, so the default
 * (up to 100 connections each) quickly fills the Atlas free tier's 500-connection limit. A small pool per
 * instance, and closing connections that sit idle, keeps the total low.
 */
const CONNECTION_OPTIONS = {
  dbName,
  serverSelectionTimeoutMS: 10_000,
  maxPoolSize: 5, // most connections one instance may open (default 100)
  minPoolSize: 0, // keep no idle connections open
  maxIdleTimeMS: 10_000, // close a connection after 10 s unused
};

let connectionPromise = null;
let lastError = null;

const hideConnectionString = (message) =>
  message.replace(/mongodb(\+srv)?:\/\/\S+/g, 'mongodb://***');

/**
 * Connects to MongoDB once and reuses the connection.
 * Locally server.js calls it at startup. On Vercel (which loads app.js directly) the requireDatabase
 * middleware calls it before each API request — only the first call actually connects.
 */
const connectDB = async () => {
  if (missingEnv.length) {
    throw new Error(`Missing environment variable(s): ${missingEnv.join(', ')}`);
  }

  if (mongoose.connection.readyState === CONNECTED) return mongoose.connection;

  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose
    .connect(mongoUri, CONNECTION_OPTIONS)
    .then(async ({ connection }) => {
      lastError = null;
      console.log(`MongoDB connected: ${connection.host}/${connection.name}`);
      // Roles and permissions every admin account points to (insert-only)
      await ensureAccessCatalogue();

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
