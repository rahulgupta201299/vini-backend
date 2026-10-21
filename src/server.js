import './config/env.js'; // first: loads .env before any other module runs

import app from './app.js';
import { verifySmtp } from './common/services/mail.service.js';
import connectDB from './config/db.js';
import { port } from './config/env.js';

/** Local server (npm start / npm run dev). On Vercel this file is not used — see app.js. */
const start = async () => {
  // Keep starting even if the database is down: /api/health shows why, and API calls retry.
  await connectDB().catch(() => {});
  await verifySmtp();

  app.listen(port, () => console.log(`VINI server running on http://localhost:${port}`));
};

start();
