const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  couponNumber: {
    type: String,
    required: [true, 'Please add a coupon number'],
    unique: true,
    trim: true
  },
  prizeName: {
    type: String,
    required: [true, 'Please add a prize name'],
    trim: true
  },
  prizeNumber: {
    type: String,
    required: [true, 'Please add a prize number'],
    trim: true
  },
  customerName: {
    type: String,
    required: [true, 'Please add a customer name'],
    trim: true
  },
  agentName: {
    type: String,
    required: [true, 'Please add an agent name'],
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Coupon', CouponSchema);
