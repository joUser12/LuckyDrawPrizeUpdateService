const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  bookNumber: {
    type: String,
    required: [true, 'Please add a book number'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please add a phone number'],
    trim: true
  },
  whatsappNumber: {
    type: String,
    required: [true, 'Please add a WhatsApp number'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Please add an address'],
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

// Index for sorting by createdAt
BookSchema.index({ createdAt: -1 });

// Compound index for filtering by creator and sorting by createdAt
BookSchema.index({ createdBy: 1, createdAt: -1 });

// Dedicated index for fast bookNumber prefix/autocomplete search
BookSchema.index({ bookNumber: 1 });

module.exports = mongoose.model('Book', BookSchema);
