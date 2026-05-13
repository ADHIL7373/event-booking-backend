/**
 * Event Model
 * Stores event details created by administrators
 */

const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an event title'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide an event description'],
      minlength: [10, 'Description must be at least 10 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Please provide an event date'],
    },
    time: {
      type: String,
      required: [true, 'Please provide event time'],
    },
    location: {
      type: String,
      required: [true, 'Please provide an event location'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please provide ticket price'],
      min: [0, 'Price cannot be negative'],
    },
    totalSeats: {
      type: Number,
      required: [true, 'Please provide total seats'],
      min: [1, 'Total seats must be at least 1'],
    },
    availableSeats: {
      type: Number,
      required: [true, 'Please provide available seats'],
    },
    category: {
      type: String,
      enum: ['Conference', 'Concert', 'Workshop', 'Sports', 'Social', 'Other'],
      default: 'Other',
    },
    image: {
      type: String,
      default: 'https://via.placeholder.com/300x200?text=Event+Image',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    capacity: {
      type: Number,
      default: function () {
        return this.totalSeats;
      },
    },
  },
  {
    timestamps: true,
  }
);

// Ensure availableSeats doesn't exceed totalSeats
eventSchema.pre('save', function (next) {
  if (this.availableSeats > this.totalSeats) {
    this.availableSeats = this.totalSeats;
  }
  
  // Clean up image field - extract just the filename if a full URL was provided
  if (this.image && typeof this.image === 'string') {
    // Standardize image storage to start with '/uploads/filename.ext'
    // Cases to handle:
    // - Full URL with host (http://localhost:5000/uploads/filename.jpg)
    // - Leading path '/uploads/filename.jpg'
    // - Bare filename 'filename.jpg'
    try {
      const trimmed = this.image.trim();

      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        // Parse URL and keep pathname which includes leading '/uploads/...'
        try {
          const url = new URL(trimmed);
          const pathname = url.pathname; // '/uploads/filename.jpg'
          // Ensure it starts with '/uploads'
          if (pathname.includes('/uploads/')) {
            const idx = pathname.indexOf('/uploads/');
            this.image = pathname.slice(idx); // keep leading '/uploads/...'
          } else {
            // Unexpected URL, leave as is
            this.image = trimmed;
          }
        } catch (e) {
          // Fallback: try to extract after '/uploads/'
          const parts = trimmed.split('/uploads/');
          if (parts.length > 1) {
            this.image = '/uploads/' + parts[1].split('?')[0];
          } else {
            this.image = trimmed;
          }
        }
      } else if (trimmed.startsWith('/uploads/')) {
        // Already in desired format
        this.image = trimmed;
      } else if (trimmed.includes('/uploads/')) {
        // Ensure leading slash
        const parts = trimmed.split('/uploads/');
        this.image = '/uploads/' + parts[1].split('?')[0];
      } else {
        // Bare filename -> convert to '/uploads/filename'
        const cleaned = trimmed.split('?')[0];
        this.image = '/uploads/' + cleaned.replace(/^\/+/, '');
      }
    } catch (e) {
      // If anything unexpected happens, leave the image value as-is
    }
  }
  
  next();
});

// Index for common queries
eventSchema.index({ date: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ category: 1 });

module.exports = mongoose.model('Event', eventSchema);
