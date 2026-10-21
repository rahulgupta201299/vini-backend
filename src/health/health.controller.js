import mongoose from 'mongoose';
import connectDB, { getLastError } from '../config/db.js';
import { missingEnv, nodeEnv } from '../config/env.js';

const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/** GET /api/health — server + database status, with the reason when the database can't be reached. */
export const getHealth = async (req, res) => {
  let dbError = null;
  try {
    await connectDB();
  } catch {
    dbError = getLastError() || 'Could not connect';
  }
  const ok = !dbError && !missingEnv.length;
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'error',
    env: nodeEnv,
    uptime: process.uptime(),
    db: states[mongoose.connection.readyState] || 'unknown',
    ...(missingEnv.length && { missingEnv }),
    ...(dbError && { dbError }),
  });
};
