/**
 * RewardTransaction Model
 * Tracks all reward point transactions (earn, redeem, reversal)
 */

const mongoose = require('mongoose');

const rewardTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['earn', 'redeem', 'reversal'],
      required: [true, 'Transaction type is required'],
      index: true,
    },
    points: {
      type: Number,
      required: [true, 'Points amount is required'],
      min: [0, 'Points cannot be negative'],
    },
    description: {
      type: String,
      default: null,
    },
    balanceBefore: {
      type: Number,
      required: [true, 'Balance before is required'],
      min: [0, 'Balance cannot be negative'],
    },
    balanceAfter: {
      type: Number,
      required: [true, 'Balance after is required'],
      min: [0, 'Balance cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
rewardTransactionSchema.index({ userId: 1, createdAt: -1 });
rewardTransactionSchema.index({ bookingId: 1 });
rewardTransactionSchema.index({ type: 1 });

module.exports = mongoose.model('RewardTransaction', rewardTransactionSchema);
