import './config/env.js'; // first: loads .env before any other module runs

import app from './app.js';
import connectDB from './config/database.js';
import { port } from './config/env.js';
import { verifySmtp } from './utils/email.js';

/** Local server (npm start / npm run dev). On Vercel this file is not used — see app.js. */
const start = async () => {
  // Keep starting even if the database is down: /api/health shows why, and API calls retry.
  await connectDB().catch(() => {});
  await verifySmtp();

  app.listen(port, () => console.log(`VINI server running on http://localhost:${port}`));
};

start();
