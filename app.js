require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection Middleware (ensures connection is alive on every request, key for serverless)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/coupons', require('./routes/coupons'));

app.get('/', (req, res) => {
  res.send('Lucky Draw Prize Update API is running...');
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server due to DB connection error.');
    process.exit(1);
  }
};

startServer();
