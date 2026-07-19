const mongoose = require('mongoose');
const dns = require('dns');

// Set DNS servers to Google and Cloudflare to resolve MongoDB SRV records reliably
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn("Could not set custom DNS servers:", e.message);
}

let isConnecting = false;

const connectDB = async () => {
  const URL = process.env.MONGO_URI;
  if (!URL) {
    console.error('MONGO_URI environment variable is not set. Please define it in .env');
    throw new Error('MONGO_URI is missing');
  }

  // 1. If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // 2. If connection is in progress, wait for it
  if (mongoose.connection.readyState === 2) {
    return mongoose.connection.asPromise();
  }

  // 3. Otherwise, initiate connection
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(URL);
    console.log("MongoDB connected successfully");
    return mongoose.connection;
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    throw err;
  }
};

module.exports = connectDB;
