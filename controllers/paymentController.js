/**
 * Payment Controller
 * Handles Stripe payment integration for event bookings
 */

const Stripe = require('stripe');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const logger = require('../utils/logger');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create Payment Intent
 * POST /api/payments/create-intent
 */
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required',
      });
    }

    // Get booking details
    const booking = await Booking.findById(bookingId)
      .populate('eventId')
      .populate('userId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check authorization
    if (booking.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay for this booking',
      });
    }

    // Check if booking is already paid
    const existingPayment = await Payment.findOne({
      bookingId,
      status: 'succeeded',
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been paid',
      });
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.totalPrice * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        bookingId: bookingId,
        userId: req.user._id.toString(),
        eventId: booking.eventId._id.toString(),
        numberOfTickets: booking.numberOfTickets,
        eventTitle: booking.eventId.title,
        userEmail: booking.userId.email,
      },
    });

    // Create/update payment record
    let payment = await Payment.findOne({ bookingId });

    if (!payment) {
      payment = await Payment.create({
        bookingId,
        userId: req.user._id,
        eventId: booking.eventId._id,
        amount: booking.totalPrice,
        stripePaymentIntentId: paymentIntent.id,
        status: 'pending',
        metadata: {
          numberOfTickets: booking.numberOfTickets,
          eventTitle: booking.eventId.title,
          userEmail: booking.userId.email,
        },
      });
    } else {
      payment.stripePaymentIntentId = paymentIntent.id;
      payment.status = 'pending';
      await payment.save();
    }

    logger.info('Payment intent created', {
      paymentId: payment._id,
      bookingId,
      amount: booking.totalPrice,
    });

    res.status(200).json({
      success: true,
      message: 'Payment intent created',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: booking.totalPrice,
    });
  } catch (error) {
    logger.error('Error creating payment intent', { error: error.message });
    next(error);
  }
};

/**
 * Confirm Payment
 * POST /api/payments/confirm
 */
exports.confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId, bookingId } = req.body;

    if (!paymentIntentId || !bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Intent ID and Booking ID are required',
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        message: 'Payment intent not found',
      });
    }

    // Update payment record
    const payment = await Payment.findOne({ bookingId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    if (paymentIntent.status === 'succeeded') {
      payment.status = 'succeeded';
      payment.paidAt = new Date();
      payment.transactionId = paymentIntent.id;
      await payment.save();

      // Update booking status if needed
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.paymentStatus = 'paid';
        await booking.save();


      }

      logger.info('Payment confirmed', {
        paymentId: payment._id,
        bookingId,
        transactionId: paymentIntent.id,
      });

      return res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        payment,
      });
    } else if (paymentIntent.status === 'processing') {
      payment.status = 'pending';
      await payment.save();

      return res.status(200).json({
        success: true,
        message: 'Payment is processing',
        payment,
      });
    } else {
      payment.status = 'failed';
      payment.errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment failed',
        error: paymentIntent.last_payment_error?.message,
      });
    }
  } catch (error) {
    logger.error('Error confirming payment', { error: error.message });
    next(error);
  }
};

/**
 * Get Payment Status
 * GET /api/payments/:bookingId
 */
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const payment = await Payment.findOne({ bookingId })
      .populate('bookingId')
      .populate('eventId', 'title');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Check authorization
    if (payment.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment',
      });
    }

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    logger.error('Error getting payment status', { error: error.message });
    next(error);
  }
};

/**
 * Webhook for Stripe Events
 * POST /api/payments/webhook
 */
exports.stripeWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;

      default:
        logger.info('Unhandled webhook event type', { type: event.type });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle Payment Succeeded
 */
async function handlePaymentSucceeded(paymentIntent) {
  try {
    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      logger.warn('Payment intent missing booking ID', { intentId: paymentIntent.id });
      return;
    }

    const payment = await Payment.findOne({ bookingId });

    if (payment) {
      payment.status = 'succeeded';
      payment.paidAt = new Date();
      payment.transactionId = paymentIntent.id;
      await payment.save();

      // Update booking
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
        await booking.save();

        // CREATE WALLET TRANSACTION (debit/spending)
        try {
          const transaction = await Transaction.create({
            type: 'debit',
            amount: payment.amount,
            currency: 'INR',
            userId: payment.userId,
            eventId: payment.eventId,
            status: 'completed',
            meta: {
              bookingId: booking._id,
              paymentIntentId: paymentIntent.id,
              numberOfTickets: booking.numberOfTickets,
            },
          });
          logger.info('Wallet transaction created', { transactionId: transaction._id, bookingId });
        } catch (txError) {
          logger.error('Error creating wallet transaction', { bookingId, error: txError.message });
        }

        // ADD REWARD POINTS
        try {
          const user = await User.findById(payment.userId);
          if (user) {
            // Calculate reward points: 1 point per ₹10 spent
            const pointsEarned = Math.floor(payment.amount / 10);
            const pointsBefore = user.rewardPoints || 0;
            user.rewardPoints = (user.rewardPoints || 0) + pointsEarned;
            
            // Store points earned on booking for later reversal if needed
            booking.pointsEarned = pointsEarned;
            await booking.save();
            
            await user.save();

            // Create reward transaction record
            await RewardTransaction.create({
              userId: payment.userId,
              bookingId: booking._id,
              type: 'earned',
              points: pointsEarned,
              description: `Earned ${pointsEarned} points from booking ${booking._id}`,
            });

            logger.info('Reward points added', {
              userId: payment.userId,
              pointsEarned,
              pointsBefore,
              pointsAfter: user.rewardPoints,
              bookingId,
            });
          }
        } catch (rewardError) {
          logger.error('Error adding reward points', { bookingId, error: rewardError.message });
        }
      }

      logger.info('Payment succeeded via webhook', { bookingId, transactionId: paymentIntent.id });
    }
  } catch (error) {
    logger.error('Error handling payment succeeded', { error: error.message });
  }
}

/**
 * Handle Payment Failed
 */
async function handlePaymentFailed(paymentIntent) {
  try {
    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      logger.warn('Payment intent missing booking ID', { intentId: paymentIntent.id });
      return;
    }

    const payment = await Payment.findOne({ bookingId });

    if (payment) {
      payment.status = 'failed';
      payment.errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
      await payment.save();

      logger.info('Payment failed via webhook', { bookingId, error: payment.errorMessage });
    }
  } catch (error) {
    logger.error('Error handling payment failed', { error: error.message });
  }
}

/**
 * Handle Refund
 */
async function handleRefund(charge) {
  try {
    const payment = await Payment.findOne({
      stripePaymentIntentId: charge.payment_intent,
    });

    if (payment) {
      payment.status = 'refunded';
      payment.refundAmount = charge.amount_refunded / 100; // Convert from cents
      payment.refundedAt = new Date();
      await payment.save();

      logger.info('Refund processed via webhook', {
        paymentId: payment._id,
        refundAmount: payment.refundAmount,
      });
    }
  } catch (error) {
    logger.error('Error handling refund', { error: error.message });
  }
}

/**
 * Create Checkout Session
 * POST /api/payments/checkout-session
 */
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('eventId')
      .populate('userId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Event: ${booking.eventId.title}`,
              description: `${booking.numberOfTickets} ticket(s)`,
            },
            unit_amount: Math.round(booking.totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${process.env.FRONTEND_URL}/booking-cancel?booking_id=${bookingId}`,
      metadata: {
        bookingId,
        userId: booking.userId._id.toString(),
        eventId: booking.eventId._id.toString(),
      },
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error('Error creating checkout session', { error: error.message });
    next(error);
  }
};
