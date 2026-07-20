const mongoose = require('mongoose');
const dns = require('dns');

// Set DNS servers to Google and Cloudflare to resolve MongoDB SRV records reliably
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn("Could not set custom DNS servers:", e.message);
}

const connectDB = () => {
  const URL = "mongodb+srv://joysundaran15_db_user:LuckyDraw20226@cluster0.u13fsox.mongodb.net/Lucky?retryWrites=true&w=majority";
  return mongoose.connect(URL)
    .then(() => {
      console.log("MongoDB connected");
    })
    .catch((err) => {
      console.log(err);
    });
};

module.exports = connectDB;
