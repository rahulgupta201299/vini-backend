const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config/env');
const { verifySmtp } = require('./common/services/mail.service');

const start = async () => {
  // Don't exit if the DB is unreachable: the server still starts, GET /api/health shows why,
  // and every API call retries the connection.
  await connectDB().catch(() => {});
  verifySmtp(); // logs whether OTP emails can be sent
  app.listen(port, () => console.log(`VINI server running on http://localhost:${port}`));
};

start();
