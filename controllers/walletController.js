const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const Booking = require('../models/Booking');
const RewardTransaction = require('../models/RewardTransaction');
const mongoose = require('mongoose');

// Helper to get userId from request (works with auth middleware or query override)
function resolveUserId(req) {
  // First priority: req.user from auth middleware (full user object)
  if (req.user && req.user._id) {
    return req.user._id;
  }
  // Fallback: query parameter (for testing)
  if (req.query.userId) {
    return req.query.userId;
  }
  return null;
}

// GET /api/wallet/summary
exports.getSummary = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user id' });

    const match = { userId: new mongoose.Types.ObjectId(userId) };

    const agg = await Transaction.aggregate([
      { $match: match },
      { $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      } },
    ]);

    let totalDebit = 0;
    let totalCredit = 0;
    agg.forEach(a => {
      if (a._id === 'debit') totalDebit = a.total;
      if (a._id === 'credit') totalCredit = a.total;
    });

    // Get wallet balance if present
    const wallet = await Wallet.findOne({ userId }).lean();
    
    // Get user reward points
    const user = await User.findById(userId).select('rewardPoints').lean();

    const summary = {
      totalSpent: totalDebit || 0,
      totalRefunded: totalCredit || 0,
      netBalance: (wallet ? wallet.balance : (totalCredit - totalDebit)) || 0,
      currency: wallet ? wallet.currency : 'INR',
      rewardPoints: user?.rewardPoints || 0,
    };

    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

// GET /api/wallet/transactions?filter=monthly
exports.getTransactions = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user id' });

    const { filter } = req.query;
    let startDate;
    const now = new Date();

    if (filter === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filter === 'last_month') {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate = d;
    } else if (filter === '3_months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    }

    const query = { userId };
    if (startDate) query.createdAt = { $gte: startDate };

    const transactions = await Transaction.find(query)
      .populate('eventId', 'title')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
};

// POST /api/wallet/refund
// body: { transactionId, amount, note }
exports.postRefund = async (req, res, next) => {
  try {
    const { transactionId, amount, note } = req.body;
    if (!transactionId || !amount) return res.status(400).json({ success: false, message: 'transactionId and amount required' });

    const original = await Transaction.findById(transactionId);
    if (!original) return res.status(404).json({ success: false, message: 'Original transaction not found' });

    // Create refund transaction (credit)
    const refundTx = new Transaction({
      type: 'credit',
      amount,
      userId: original.userId,
      eventId: original.eventId,
      status: 'completed',
      refund: { amount, status: 'processed', date: new Date(), note },
      meta: { refundedFrom: transactionId },
    });

    await refundTx.save();

    // Optionally update original transaction.refund
    original.refund = original.refund || {};
    original.refund.amount = (original.refund.amount || 0) + amount;
    original.refund.status = 'processed';
    original.refund.date = new Date();
    await original.save();

    // Update or create wallet
    const wallet = await Wallet.findOneAndUpdate({ userId: original.userId }, { $inc: { balance: amount } }, { upsert: true, new: true });

    res.json({ success: true, data: { refundTx, wallet } });
  } catch (err) {
    next(err);
  }
};

// POST /api/wallet/redeem-points
// body: { bookingId, pointsToRedeem }
// Deduct points before payment is made
exports.redeemPoints = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user id' });

    const { bookingId, pointsToRedeem } = req.body;
    if (!bookingId || pointsToRedeem === undefined) {
      return res.status(400).json({ success: false, message: 'bookingId and pointsToRedeem required' });
    }

    // Get user's current points
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Get booking details
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Validate pointsToRedeem
    const pointsNum = parseInt(pointsToRedeem);
    if (pointsNum > user.rewardPoints) {
      return res.status(400).json({ success: false, message: 'Insufficient reward points' });
    }

    // Max 30% of total amount
    const maxPointsAllowed = Math.floor(booking.totalPrice * 0.3);
    if (pointsNum > maxPointsAllowed) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot redeem more than 30% of order value (max: ₹${maxPointsAllowed})` 
      });
    }

    // Calculate final amount
    const discountAmount = pointsNum; // 1 point = ₹1
    const finalAmountPaid = booking.totalPrice - discountAmount;

    if (finalAmountPaid < 1) {
      return res.status(400).json({ success: false, message: 'Final amount must be at least ₹1' });
    }

    // Update booking with point info
    booking.pointsUsed = pointsNum;
    booking.discountAmount = discountAmount;
    booking.finalAmountPaid = finalAmountPaid;
    await booking.save();

    // Create reward transaction (redeem)
    const balanceBefore = user.rewardPoints;
    user.rewardPoints -= pointsNum;
    await user.save();

    const rewardTx = new RewardTransaction({
      userId,
      bookingId,
      type: 'redeem',
      points: pointsNum,
      description: `Redeemed ${pointsNum} points for booking discount`,
      balanceBefore,
      balanceAfter: user.rewardPoints,
    });
    await rewardTx.save();

    res.json({ 
      success: true, 
      data: { 
        pointsRedeemed: pointsNum,
        discountAmount,
        finalAmountPaid,
        remainingPoints: user.rewardPoints 
      } 
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/wallet/earn-points
// body: { bookingId }
// Credit points after successful payment
exports.earnPoints = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user id' });

    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId required' });
    }

    // Get booking
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Prevent double earning (check if points already earned)
    if (booking.pointsEarned > 0) {
      return res.status(400).json({ success: false, message: 'Points already earned for this booking' });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Calculate points earned: ₹10 = 1 point
    const pointsEarned = Math.floor(booking.finalAmountPaid / 10);

    if (pointsEarned === 0) {
      return res.json({ 
        success: true, 
        data: { 
          message: 'Order amount too low to earn points',
          pointsEarned: 0 
        } 
      });
    }

    // Update booking
    booking.pointsEarned = pointsEarned;
    await booking.save();

    // Update user points
    const balanceBefore = user.rewardPoints;
    user.rewardPoints += pointsEarned;
    await user.save();

    // Create reward transaction (earn)
    const rewardTx = new RewardTransaction({
      userId,
      bookingId,
      type: 'earn',
      points: pointsEarned,
      description: `Earned ${pointsEarned} points from booking`,
      balanceBefore,
      balanceAfter: user.rewardPoints,
    });
    await rewardTx.save();

    res.json({ 
      success: true, 
      data: { 
        pointsEarned,
        totalPoints: user.rewardPoints 
      } 
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/wallet/reverse-points
// body: { bookingId }
// Reverse points on booking cancellation
exports.reversePoints = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user id' });

    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId required' });
    }

    // Get booking
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Get user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

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
        userId,
        bookingId,
        type: 'reversal',
        points: reversalAmount,
        description: `Reversed ${reversalAmount} points from cancelled booking`,
        balanceBefore,
        balanceAfter: user.rewardPoints,
      });
      await rewardTx.save();
    }

    res.json({ 
      success: true, 
      data: { 
        pointsReversed: reversalAmount,
        totalPoints: user.rewardPoints 
      } 
    });
  } catch (err) {
    next(err);
  }
};
