/**
 * Wishlist Model
 * Stores user saved events (wishlist items)
 */

const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate entries
wishlistSchema.index({ userId: 1, eventId: 1 }, { unique: true });

// Populate event details when fetching wishlist
wishlistSchema.pre(/^find/, function (next) {
  if (this.options._recursed) {
    return next();
  }
  this.populate({
    path: 'eventId',
    select: 'title description date time location price image category totalSeats availableSeats',
  });
  next();
});

module.exports = mongoose.model('Wishlist', wishlistSchema);
