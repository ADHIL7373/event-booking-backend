const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect } = require('../middleware/auth');

// All wallet routes require authentication
router.use(protect);

// Get wallet summary (includes reward points)
router.get('/summary', walletController.getSummary);

// Get transactions with optional filter: this_month | last_month | 3_months
router.get('/transactions', walletController.getTransactions);

// Post a refund (admin or automated flow)
router.post('/refund', walletController.postRefund);

// Reward Points Endpoints
// POST /api/wallet/redeem-points - Redeem points before payment
router.post('/redeem-points', walletController.redeemPoints);

// POST /api/wallet/earn-points - Credit points after successful payment
router.post('/earn-points', walletController.earnPoints);

// POST /api/wallet/reverse-points - Reverse points on booking cancellation
router.post('/reverse-points', walletController.reversePoints);

module.exports = router;
