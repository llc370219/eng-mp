const mongoose = require('mongoose');
const config = require('./index');

async function connectDB() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log(`MongoDB connected: ${config.mongodb.uri}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });
}

module.exports = connectDB;
