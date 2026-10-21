const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config/env');
const { verifySmtp } = require('./common/services/mail.service');

const start = async () => {
  try {
    await connectDB();
  } catch {
    process.exit(1);
  }
  verifySmtp(); // logs whether OTP emails can be sent
  app.listen(port, () => console.log(`VINI server running on http://localhost:${port}`));
};

start();
