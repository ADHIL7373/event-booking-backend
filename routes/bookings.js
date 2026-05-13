/**
 * Booking Routes
 * Defines all booking and ticket management endpoints
 */

const express = require('express');
const router = express.Router();
const {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  verifyTicket,
  getAllBookings,
  updatePaymentStatus,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateBooking,
  validateIdParam,
  handleValidationErrors,
} = require('../middleware/validation');

/**
 * Protected routes
 */
// User routes
router.get('/my-bookings', protect, getUserBookings);
router.post(
  '/',
  protect,
  validateBooking,
  handleValidationErrors,
  createBooking
);
router.get(
  '/:id',
  protect,
  validateIdParam,
  handleValidationErrors,
  getBookingById
);
router.delete(
  '/:id',
  protect,
  validateIdParam,
  handleValidationErrors,
  cancelBooking
);

// Update payment status
router.patch(
  '/:id/payment-status',
  protect,
  validateIdParam,
  handleValidationErrors,
  updatePaymentStatus
);

// Ticket verification (public - no auth required for verification, but recommended for admins)
router.post('/verify-ticket', protect, verifyTicket);

// Admin routes
router.get('/', protect, authorize('admin'), getAllBookings);

module.exports = router;
