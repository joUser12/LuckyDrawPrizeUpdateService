const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { protect } = require('../middleware/auth');

// @route   GET /api/coupons/public
// @desc    Get all coupons (Public results showcase)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .select('couponNumber prizeName prizeNumber customerName agentName createdAt')
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      count: coupons.length,
      coupons
    });
  } catch (error) {
    console.error('Public get coupons error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving public results' });
  }
});

// @route   POST /api/coupons
// @desc    Create a new coupon detail entry
// @access  Private (Agent or Admin)
router.post('/', protect, async (req, res) => {
  try {
    const { couponNumber, prizeName, prizeNumber, customerName, agentName } = req.body;

    // Validation
    if (!couponNumber || !prizeName || !prizeNumber || !customerName || !agentName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all details: coupon number, prize name, prize number, customer name, and agent name'
      });
    }

    // Check if coupon number already exists
    const couponExists = await Coupon.findOne({ couponNumber });
    if (couponExists) {
      return res.status(400).json({
        success: false,
        message: 'A coupon with this number already exists'
      });
    }

    // Create coupon
    const coupon = await Coupon.create({
      couponNumber,
      prizeName,
      prizeNumber,
      customerName,
      agentName,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      coupon
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ success: false, message: 'Server error creating coupon' });
  }
});

// @route   GET /api/coupons
// @desc    Get all coupons (Admin/Customer) or coupons created by logged in user (Agent)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Fetch all coupons sorted by creation date
    const coupons = await Coupon.find()
      .populate('createdBy', 'name email')
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      count: coupons.length,
      coupons
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving coupons' });
  }
});

// @route   DELETE /api/coupons/:id
// @desc    Delete a coupon entry
// @access  Private (Admin or Agent owner)
router.delete('/:id', protect, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    // Allow Admin to delete any, and Agent to delete only their own
    if (req.user.role !== 'admin' && coupon.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized. You can only delete your own coupon entries'
      });
    }

    await coupon.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Coupon removed successfully'
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting coupon' });
  }
});

module.exports = router;
