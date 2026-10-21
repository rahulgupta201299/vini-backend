const mongoose = require('mongoose');
const { mongoUri, dbName } = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri, { dbName });
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

module.exports = connectDB;
