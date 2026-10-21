const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config/env');

const start = async () => {
  await connectDB();
  app.listen(port, () => console.log(`VINI server running on http://localhost:${port}`));
};

start();
