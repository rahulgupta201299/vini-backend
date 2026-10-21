import './config/env.js'; // first: loads .env before any other module runs
import app from './app.js';
import connectDB from './config/db.js';
import { port } from './config/env.js';
import { verifySmtp } from './common/services/mail.service.js';

const start = async () => {
  // Don't exit if the DB is unreachable: the server still starts, GET /api/health shows why,
  // and every API call retries the connection.
  await connectDB().catch(() => {});
  verifySmtp(); // logs whether OTP emails can be sent
  app.listen(port, () => console.log(`VINI server running on http://localhost:${port}`));
};

start();
