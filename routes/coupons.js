const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { protect } = require('../middleware/auth');

// In-memory list of connected SSE clients
let sseClients = [];

// Helper function to broadcast new winner events to all connected SSE clients
const broadcastWinner = (coupon) => {
  const payload = JSON.stringify(coupon);
  sseClients.forEach((client) => {
    try {
      client.res.write(`event: new-winner\ndata: ${payload}\n\n`);
      client.res.write(`event: winner_update\ndata: ${payload}\n\n`);
      client.res.write(`data: ${payload}\n\n`);
    } catch (err) {
      console.error('Error sending SSE message to client:', err);
    }
  });
};

// @route   GET /api/coupons/stream
// @desc    Server-Sent Events (SSE) stream endpoint for real-time winner updates
// @access  Public
router.get('/stream', (req, res) => {
  // Set headers for SSE stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });

  if (res.flushHeaders) {
    res.flushHeaders();
  }

  // Send initial connection message
  res.write(': connected\n\n');

  // Register client
  const clientId = Date.now() + Math.random().toString(36).substring(2, 9);
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  console.log(`[SSE] Client connected: ${clientId}. Total clients: ${sseClients.length}`);

  // Send periodic keep-alive heartbeat comment every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (err) {
      // Stream may be closed
    }
  }, 20000);

  // Clean up connection when client closes stream
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((client) => client.id !== clientId);
    console.log(`[SSE] Client disconnected: ${clientId}. Remaining clients: ${sseClients.length}`);
  });
});

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

    // Broadcast real-time SSE event to all connected dashboards
    broadcastWinner(coupon);

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
