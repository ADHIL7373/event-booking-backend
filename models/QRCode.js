/**
 * QRCode Model
 * Stores QR code information for ticket verification
 */

const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      unique: true,
    },
    qrData: {
      type: String,
      required: [true, 'QR Data is required'],
      unique: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    scanCount: {
      type: Number,
      default: 0,
    },
    lastScannedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for queries
qrCodeSchema.index({ bookingId: 1 });
qrCodeSchema.index({ isVerified: 1 });

module.exports = mongoose.model('QRCode', qrCodeSchema);
