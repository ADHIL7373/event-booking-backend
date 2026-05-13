/**
 * Coupon Model
 * Stores discount coupon codes with validation and usage tracking
 */

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'Code must be at least 3 characters'],
      maxlength: [20, 'Code must not exceed 20 characters'],
      match: [/^[A-Z0-9-]+$/, 'Code must contain only uppercase letters, numbers, and hyphens'],
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    maxDiscount: {
      type: Number,
      default: null, // null means no maximum
      min: [0, 'Max discount cannot be negative'],
    },
    minPurchaseAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum purchase amount cannot be negative'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    maxUsage: {
      type: Number,
      default: null, // null means unlimited
      min: [1, 'Max usage must be at least 1'],
    },
    usageCount: {
      type: Number,
      default: 0,
      min: [0, 'Usage count cannot be negative'],
    },
    usedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
        bookingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Booking',
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      maxlength: 200,
      default: '',
    },
    applicableEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
      },
    ], // Empty means applicable to all events
    applicableUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ], // Empty means applicable to all users
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: Check if coupon is expired
couponSchema.virtual('isExpired').get(function () {
  return this.expiryDate < new Date();
});

// Virtual: Check if coupon usage limit reached
couponSchema.virtual('isLimitReached').get(function () {
  return this.maxUsage && this.usageCount >= this.maxUsage;
});

// Virtual: Check if coupon is valid
couponSchema.virtual('isValid').get(function () {
  return (
    this.isActive &&
    !this.isExpired &&
    !this.isLimitReached
  );
});

// Index for frequently queried fields
couponSchema.index({ code: 1 });
couponSchema.index({ expiryDate: 1 });
couponSchema.index({ isActive: 1 });
couponSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Coupon', couponSchema);
