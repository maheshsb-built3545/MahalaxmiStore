'use strict';
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      family: 4,                  // force IPv4 to prevent Windows IPv6 DNS timeout delays
      bufferCommands: false,      // fail queries immediately if not connected
    });
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`❌  MongoDB connection failed: ${err.message}`);
    console.error('   ⚠️  The server will keep running. Start MongoDB and restart the server, or use a MongoDB Atlas URI.');
    return null;
  }
};

module.exports = connectDB;
