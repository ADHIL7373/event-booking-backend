/**
 * Booking Model
 * Stores user bookings for events with ticket information
 */

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
    },
    numberOfTickets: {
      type: Number,
      required: [true, 'Number of tickets is required'],
      min: [1, 'At least 1 ticket must be booked'],
      max: [10, 'Maximum 10 tickets per booking'],
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Price cannot be negative'],
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'pending'],
      default: 'confirmed',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'failed', 'refunded'],
      default: 'unpaid',
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    ticketQRCode: {
      type: String,
      unique: true,
      sparse: true, // Allow null values
    },
    qrCodeData: {
      type: String,
      default: null,
    },
    ticketNumbers: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: null,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, 'Refund amount cannot be negative'],
    },
    cancellationDate: {
      type: Date,
      default: null,
    },
    refundPercentage: {
      type: Number,
      enum: [0, 50, 100],
      default: null,
    },
    pointsEarned: {
      type: Number,
      default: 0,
      min: [0, 'Points earned cannot be negative'],
    },
    pointsUsed: {
      type: Number,
      default: 0,
      min: [0, 'Points used cannot be negative'],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    },
    finalAmountPaid: {
      type: Number,
      default: 0,
      min: [0, 'Final amount paid cannot be negative'],
    },
    eventDateTime: {
      type: Date,
      default: null, // Will be set from event date/time
    },
    reminderTime: {
      type: Date,
      default: null, // Calculated as 2 hours before event
    },
    reminderSent: {
      type: Boolean,
      default: false, // Ensure reminder is sent only once
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for queries
bookingSchema.index({ userId: 1 });
bookingSchema.index({ eventId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ bookingDate: -1 });
bookingSchema.index({ reminderSent: 1, reminderTime: 1 }); // For background job

// Ensure no duplicate active bookings for same user and event
bookingSchema.index(
  { userId: 1, eventId: 1, status: 1 },
  { unique: false }
);

module.exports = mongoose.model('Booking', bookingSchema);
