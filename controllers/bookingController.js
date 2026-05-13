/**
 * Booking Controller
 * Handles event bookings, ticket generation, and QR code verification
 */

const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const RewardTransaction = require('../models/RewardTransaction');
const QRCode = require('../models/QRCode');
const {
  generateQRData,
  generateQRCode: generateQRCodeImage,
  parseQRData,
  validateQRData,
  generateTicketNumber,
} = require('../utils/qrCodeUtils');
const { isInRange } = require('../utils/validators');
const {
  calculateRefund,
  isEventPassed,
  getHoursUntilEvent,
} = require('../utils/refundCalculator');
const { calculateReminderTime } = require('../utils/reminderJob');
const logger = require('../utils/logger');

/**
 * Create Booking
 * POST /api/bookings
 */
exports.createBooking = async (req, res, next) => {
  try {
    const { eventId, numberOfTickets } = req.body;

    // Validation
    if (!eventId || !numberOfTickets) {
      return res.status(400).json({
        success: false,
        message: 'Please provide event ID and number of tickets',
      });
    }

    if (!isInRange(numberOfTickets, 1, 10)) {
      return res.status(400).json({
        success: false,
        message: 'Number of tickets must be between 1 and 10',
      });
    }

    // Check if event exists
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check availability
    if (event.availableSeats < numberOfTickets) {
      return res.status(400).json({
        success: false,
        message: `Only ${event.availableSeats} seats available`,
      });
    }

    // Calculate total price
    const totalPrice = numberOfTickets * event.price;

    // Generate QR code data
    const qrData = generateQRData(null, req.user._id.toString(), eventId);

    // Calculate reminder time (2 hours before event)
    const reminderTime = calculateReminderTime(event.date, event.time);

    // Create booking
    let booking = await Booking.create({
      userId: req.user._id,
      eventId,
      numberOfTickets,
      totalPrice,
      status: 'confirmed',
      paymentStatus: 'unpaid', // Set to unpaid initially, will be updated after payment
      qrCodeData: qrData,
      eventDateTime: event.date,
      reminderTime: reminderTime,
      reminderSent: false,
    });

    // Update booking ID in QR data
    const updatedQRData = generateQRData(
      booking._id.toString(),
      req.user._id.toString(),
      eventId
    );
    booking.qrCodeData = updatedQRData;

    // Generate ticket numbers
    const ticketNumbers = [];
    for (let i = 0; i < numberOfTickets; i++) {
      ticketNumbers.push(generateTicketNumber(booking._id, i));
    }
    booking.ticketNumbers = ticketNumbers;

    await booking.save();

    // Create QR code record
    const qrCode = await QRCode.create({
      bookingId: booking._id,
      qrData: updatedQRData,
    });

    // Generate QR code image
    const qrCodeImage = await generateQRCodeImage(updatedQRData);

    // Update booking with QR code
    booking.ticketQRCode = qrCodeImage;
    await booking.save();

    // Reduce available seats using updateOne to avoid date validator
    await Event.updateOne(
      { _id: eventId },
      { $inc: { availableSeats: -numberOfTickets } }
    );

    // Populate and return
    await booking.populate('userId', 'fullName email');
    await booking.populate('eventId');

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        ...booking.toObject(),
        qrCodeImage,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get User's Bookings
 * GET /api/bookings/my-bookings
 * Returns both active (confirmed) and cancelled bookings
 */
exports.getUserBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({
      userId: req.user._id,
      status: { $in: ['confirmed', 'cancelled'] },
    })
      .populate({
        path: 'eventId',
        select: 'title date time location price totalSeats availableSeats image category',
      })
      .populate('userId', 'fullName email')
      .sort({ bookingDate: -1 })
      .lean();

    // Filter out bookings where eventId is null (event was deleted)
    // but still include them in response with null eventId for display purposes
    const validBookings = bookings.map(booking => ({
      ...booking,
      eventId: booking.eventId || null,
    }));

    res.status(200).json({
      success: true,
      count: validBookings.length,
      bookings: validBookings,
    });
  } catch (error) {
    logger.error('Error fetching user bookings', {
      userId: req.user._id,
      error: error.message,
    });
    next(error);
  }
};

/**
 * Get Booking Details
 * GET /api/bookings/:id
 */
exports.getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('eventId')
      .populate('userId', 'fullName email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check authorization
    if (
      booking.userId._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking',
      });
    }

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel Booking
 * DELETE /api/bookings/:id
 * Enhanced with refund logic and event date validation
 */
exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Validate booking ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    // Find booking with event details
    const booking = await Booking.findById(id).populate('eventId');

    // Check if booking exists
    if (!booking) {
      logger.warn('Booking not found', { bookingId: id, userId });
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check authorization
    if (
      booking.userId.toString() !== userId.toString() &&
      req.user.role !== 'admin'
    ) {
      logger.warn('Unauthorized cancellation attempt', {
        bookingId: id,
        userId,
        bookingUserId: booking.userId,
      });
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking',
      });
    }

    // Check if already cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled',
        refundAmount: booking.refundAmount,
        cancellationDate: booking.cancellationDate,
      });
    }

    // Check if event date has passed
    if (isEventPassed(booking.eventId.date)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking after event has started',
        eventDate: booking.eventId.date,
      });
    }

    // Calculate refund
    const refundInfo = calculateRefund(booking.eventId.date, booking.totalPrice);

    // Update booking with cancellation details
    booking.status = 'cancelled';
    booking.cancellationDate = new Date();
    booking.refundAmount = refundInfo.refundAmount;
    booking.refundPercentage = refundInfo.refundPercentage;

    await booking.save();

    // Restore event seats (atomic operation)
    const eventUpdate = await Event.findByIdAndUpdate(
      booking.eventId._id,
      { $inc: { availableSeats: booking.numberOfTickets } },
      { new: true, runValidators: false } // Skip date validator
    );

    if (!eventUpdate) {
      logger.error('Failed to update event seats', {
        bookingId: id,
        eventId: booking.eventId._id,
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to process cancellation',
      });
    }

    // Reverse reward points if applicable
    try {
      const user = await User.findById(booking.userId);
      if (user) {
        let reversalAmount = 0;
        const balanceBefore = user.rewardPoints;

        // Reverse earned points
        if (booking.pointsEarned > 0) {
          user.rewardPoints -= booking.pointsEarned;
          reversalAmount += booking.pointsEarned;
        }

        // Restore redeemed points
        if (booking.pointsUsed > 0) {
          user.rewardPoints += booking.pointsUsed;
          reversalAmount += booking.pointsUsed;
        }

        // Prevent negative balance
        if (user.rewardPoints < 0) {
          user.rewardPoints = 0;
        }

        await user.save();

        // Create reward transaction (reversal)
        if (reversalAmount > 0) {
          const rewardTx = new RewardTransaction({
            userId: booking.userId,
            bookingId: booking._id,
            type: 'reversal',
            points: reversalAmount,
            description: `Reversed ${reversalAmount} points from cancelled booking`,
            balanceBefore,
            balanceAfter: user.rewardPoints,
          });
          await rewardTx.save();
        }
      }
    } catch (pointError) {
      logger.warn('Failed to reverse reward points during cancellation', {
        bookingId: id,
        error: pointError.message,
      });
      // Don't fail the cancellation if point reversal fails
    }

    // CREATE REFUND WALLET TRANSACTION (credit)
    try {
      if (refundInfo.refundAmount > 0) {
        const refundTransaction = await require('../models/Transaction').create({
          type: 'credit',
          amount: refundInfo.refundAmount,
          currency: 'INR',
          userId: booking.userId,
          eventId: booking.eventId._id,
          status: 'completed',
          refund: {
            amount: refundInfo.refundAmount,
            status: 'processed',
            date: new Date(),
            note: refundInfo.reason,
          },
          meta: {
            bookingId: booking._id,
            cancellationDate: booking.cancellationDate,
            refundPercentage: refundInfo.refundPercentage,
          },
        });
        logger.info('Refund transaction created', {
          transactionId: refundTransaction._id,
          bookingId: booking._id,
          refundAmount: refundInfo.refundAmount,
        });
      }
    } catch (refundTxError) {
      logger.error('Error creating refund transaction', {
        bookingId: booking._id,
        error: refundTxError.message,
      });
      // Don't fail the cancellation if refund transaction creation fails
    }

    // Log cancellation
    logger.info('Booking cancelled successfully', {
      bookingId: id,
      userId,
      refundAmount: refundInfo.refundAmount,
      refundPercentage: refundInfo.refundPercentage,
      numberOfTickets: booking.numberOfTickets,
      eventTitle: booking.eventId.title,
    });

    // Return success response with refund details
    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: {
        _id: booking._id,
        status: booking.status,
        cancellationDate: booking.cancellationDate,
        refundAmount: refundInfo.refundAmount,
        refundPercentage: refundInfo.refundPercentage,
        refundReason: refundInfo.reason,
        originalPrice: booking.totalPrice,
      },
    });
  } catch (error) {
    logger.error('Error cancelling booking', {
      bookingId: req.params.id,
      error: error.message,
    });
    next(error);
  }
};

/**
 * Verify Ticket using QR Code
 * POST /api/bookings/verify-ticket
 */
exports.verifyTicket = async (req, res, next) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'Please provide QR code data',
      });
    }

    // Parse QR data
    let parsedData;
    try {
      parsedData = parseQRData(qrData);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code data',
      });
    }

    // Validate QR data
    if (!validateQRData(parsedData)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format',
      });
    }

    // Find booking
    const booking = await Booking.findById(parsedData.bookingId)
      .populate('eventId')
      .populate('userId', 'fullName email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Verify booking is confirmed
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is cancelled',
      });
    }

    // Find QR code record
    let qrCode = await QRCode.findOne({ bookingId: parsedData.bookingId });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code record not found',
      });
    }

    // Update QR code verification info
    qrCode.isVerified = true;
    qrCode.verifiedAt = new Date();
    qrCode.verifiedBy = req.user._id;
    qrCode.scanCount += 1;
    qrCode.lastScannedAt = new Date();
    await qrCode.save();

    res.status(200).json({
      success: true,
      message: 'Ticket verified successfully',
      bookingDetails: {
        bookingId: booking._id,
        userName: booking.userId.fullName,
        eventName: booking.eventId.title,
        numberOfTickets: booking.numberOfTickets,
        bookingDate: booking.bookingDate,
        ticketNumbers: booking.ticketNumbers,
        scanCount: qrCode.scanCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get All Bookings (Admin)
 * GET /api/bookings/admin/all
 */
exports.getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('eventId')
      .populate('userId', 'fullName email')
      .sort({ bookingDate: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Booking Payment Status
 * PATCH /api/bookings/:id/payment-status
 */
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    // Validation
    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payment status is required',
      });
    }

    const validStatuses = ['unpaid', 'paid', 'failed', 'refunded'];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status',
      });
    }

    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Authorization - user can only update their own bookings
    if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking',
      });
    }

    // Update payment status
    booking.paymentStatus = paymentStatus;
    await booking.save();

    // Populate and return
    await booking.populate('userId', 'fullName email');
    await booking.populate('eventId');

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      booking,
    });
  } catch (error) {
    next(error);
  }
};
