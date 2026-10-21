import mongoose from 'mongoose';
import { mongoUri, dbName, missingEnv } from './env.js';

/**
 * Connects to MongoDB once and reuses the connection.
 * - Local (`npm run dev`): called by server.js at startup.
 * - Vercel (serverless): Vercel loads src/app.js directly, so app.js also calls this per request;
 *   the cached promise means only the first request in a function instance actually connects.
 */
let connecting = null;
let lastError = null;

const connectDB = async () => {
  if (missingEnv.length) throw new Error(`Missing environment variable(s): ${missingEnv.join(', ')}`);
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connecting) {
    connecting = mongoose
      .connect(mongoUri, { dbName, serverSelectionTimeoutMS: 10000 })
      .then((conn) => {
        lastError = null;
        console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
        return conn.connection;
      })
      .catch((err) => {
        connecting = null; // allow a retry on the next request
        lastError = String(err.message || err).replace(/mongodb(\+srv)?:\/\/[^\s]+/g, 'mongodb://***');
        console.error(`MongoDB connection error: ${err.message}`);
        throw err;
      });
  }
  return connecting;
};

mongoose.connection.on('disconnected', () => {
  connecting = null;
  console.warn('MongoDB disconnected');
});

/** Last connection error (for GET /api/health); the connection string is masked. */
export const getLastError = () => lastError;

export default connectDB;
