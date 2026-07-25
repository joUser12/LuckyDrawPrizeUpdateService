const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const { protect } = require('../middleware/auth');

// @route   POST /api/books
// @desc    Create a new book entry
// @access  Private (Agent or Admin)
router.post('/', protect, async (req, res) => {
  try {
    const { bookNumber, name, phone, phoneNumber, whatsappNumber, address, agentName } = req.body;

    // Validation
    if (!bookNumber || !name || !phone || !phoneNumber || !whatsappNumber || !address || !agentName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all details: bookNumber, name, phone, phoneNumber, whatsappNumber, address, and agentName'
      });
    }

    // Check if book number already exists
    const bookExists = await Book.findOne({ bookNumber });
    if (bookExists) {
      return res.status(400).json({
        success: false,
        message: 'A book with this number already exists'
      });
    }

    // Create book
    const book = await Book.create({
      bookNumber,
      name,
      phone,
      phoneNumber,
      whatsappNumber,
      address,
      agentName,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      book
    });
  } catch (error) {
    console.error('Create book error:', error);
    res.status(500).json({ success: false, message: 'Server error creating book' });
  }
});

// @route   GET /api/books
// @desc    Get all books
// @access  Private (Admin / Agent)
router.get('/', protect, async (req, res) => {
  try {
    const books = await Book.find()
      .populate('createdBy', 'name email')
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      count: books.length,
      books
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving books' });
  }
});

// @route   GET /api/books/search?q=<query>
// @desc    Autocomplete search — filter books by bookNumber prefix
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();

    // Require at least 1 character
    if (!q) {
      return res.status(200).json({ success: true, books: [] });
    }

    // Sanitize: escape regex special characters to prevent ReDoS attacks
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Prefix-anchored regex (^q) so MongoDB can use the bookNumber index (index scan vs full scan)
    const books = await Book.find({
      bookNumber: { $regex: `^${escaped}`, $options: 'i' }
    })
      .select('bookNumber name phone phoneNumber whatsappNumber address agentName')
      .sort({ bookNumber: 1 })
      .limit(10)
      .maxTimeMS(3000)  // Kill query if it takes more than 3 seconds
      .lean();

    // Cache identical queries for 10 seconds to reduce DB hits on repeated keystrokes
    res.set('Cache-Control', 'public, max-age=10');

    res.status(200).json({
      success: true,
      count: books.length,
      books
    });
  } catch (error) {
    console.error('Search books error:', error);
    res.status(500).json({ success: false, message: 'Server error searching books' });
  }
});

// @route   GET /api/books/public
// @desc    Get all books (Public access)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const books = await Book.find()
      .select('bookNumber name phone phoneNumber whatsappNumber address agentName createdAt')
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      count: books.length,
      books
    });
  } catch (error) {
    console.error('Public get books error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving public books' });
  }
});

// @route   GET /api/books/:id
// @desc    Get a single book by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.status(200).json({
      success: true,
      book
    });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving book' });
  }
});

// @route   PUT /api/books/:id
// @desc    Update a book entry
// @access  Private (Admin or Agent owner)
router.put('/:id', protect, async (req, res) => {
  try {
    const { bookNumber, name, phone, phoneNumber, whatsappNumber, address, agentName } = req.body;

    // Validation
    if (!bookNumber || !name || !phone || !phoneNumber || !whatsappNumber || !address || !agentName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all details: bookNumber, name, phone, phoneNumber, whatsappNumber, address, and agentName'
      });
    }

    let book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Check if book number already exists for a different book
    const bookExists = await Book.findOne({ bookNumber, _id: { $ne: req.params.id } });
    if (bookExists) {
      return res.status(400).json({
        success: false,
        message: 'A book with this number already exists'
      });
    }

    // Allow Admin to edit any, Agent to edit only their own
    if (req.user.role !== 'admin' && book.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized. You can only edit your own book entries'
      });
    }

    book.bookNumber = bookNumber;
    book.name = name;
    book.phone = phone;
    book.phoneNumber = phoneNumber;
    book.whatsappNumber = whatsappNumber;
    book.address = address;
    book.agentName = agentName;

    await book.save();

    res.status(200).json({
      success: true,
      book
    });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ success: false, message: 'Server error updating book' });
  }
});

// @route   DELETE /api/books/:id
// @desc    Delete a book entry
// @access  Private (Admin or Agent owner)
router.delete('/:id', protect, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Allow Admin to delete any, Agent to delete only their own
    if (req.user.role !== 'admin' && book.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized. You can only delete your own book entries'
      });
    }

    await book.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Book removed successfully'
    });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting book' });
  }
});

module.exports = router;
