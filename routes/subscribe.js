/**
 * Subscription Routes
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { sendSubscriptionEmail } = require('../utils/emailUtils');

/**
 * POST /api/subscribe
 * Subscribe to newsletter and send confirmation email
 */
router.post('/subscribe', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address',
        errors: errors.array(),
      });
    }

    const { email } = req.body;

    console.log(`📬 Processing subscription for: ${email}`);

    // Send subscription confirmation email
    await sendSubscriptionEmail(email);

    console.log(`✅ Subscription processed successfully for: ${email}`);

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Subscription successful! A confirmation email has been sent to your inbox.',
      email: email,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Subscription error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process subscription. Please try again later.',
    });
  }
});

module.exports = router;
