/**
 * Payment Routes
 * All payment-related endpoints
 */

const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  confirmPayment,
  getPaymentStatus,
  stripeWebhook,
  createCheckoutSession,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

/**
 * Public routes (webhook - no auth required)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

/**
 * Protected routes
 */

// Create payment intent for Stripe Elements
router.post('/create-intent', protect, createPaymentIntent);

// Confirm payment after client-side processing
router.post('/confirm', protect, confirmPayment);

// Get payment status for a booking
router.get('/:bookingId', protect, getPaymentStatus);

// Create checkout session
router.post('/checkout-session', protect, createCheckoutSession);

module.exports = router;
