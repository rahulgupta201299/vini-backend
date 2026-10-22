import mongoose from 'mongoose';

import connectDB, { getLastError } from '../config/database.js';
import { missingEnv, nodeEnv } from '../config/env.js';

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/** GET /api/health — server and database status, with the reason when something is wrong. */
export const getHealth = async (_req, res) => {
  let dbError = null;

  try {
    await connectDB();
  } catch {
    dbError = getLastError() || 'Could not connect';
  }

  const isHealthy = !dbError && !missingEnv.length;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'error',
    env: nodeEnv,
    uptime: process.uptime(),
    db: DB_STATES[mongoose.connection.readyState] || 'unknown',
    ...(missingEnv.length && { missingEnv }),
    ...(dbError && { dbError }),
  });
};
