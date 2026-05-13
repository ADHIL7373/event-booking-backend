/**
 * Admin Controller
 * Handles all admin management operations across modules
 */

const User = require('../models/User');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const Coupon = require('../models/Coupon');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const RewardTransaction = require('../models/RewardTransaction');
const logger = require('../utils/logger');
const { Parser } = require('json2csv');

// ==================== USERS MODULE ====================

/**
 * Get all users with pagination and filtering
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sort = '-createdAt' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    // Get users
    const users = await User.find(searchQuery)
      .select('-password -emailVerificationToken -resetPasswordOtp')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Count total for pagination
    const total = await User.countDocuments(searchQuery);

    // Get booking count for each user
    const usersWithBookings = await Promise.all(
      users.map(async (user) => {
        const bookingCount = await Booking.countDocuments({ userId: user._id });
        const totalSpent = await Booking.aggregate([
          { $match: { userId: user._id } },
          { $group: { _id: null, total: { $sum: '$totalPrice' } } },
        ]);

        return {
          ...user.toObject(),
          totalBookings: bookingCount,
          totalSpent: totalSpent[0]?.total || 0,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: usersWithBookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching users', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user details with booking history
 */
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password -resetPasswordOtp');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get bookings
    const bookings = await Booking.find({ userId })
      .populate('eventId', 'title image eventDate')
      .sort('-bookingDate');

    // Get wallet info
    const wallet = await Wallet.findOne({ userId });

    // Get transactions
    const transactions = await Transaction.find({ userId })
      .sort('-createdAt')
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        user,
        bookings,
        wallet,
        transactions,
      },
    });
  } catch (error) {
    logger.error('Error fetching user details', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Block/Unblock user
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isBlocked } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    logger.info(`User ${userId} status changed to ${isBlocked ? 'blocked' : 'unblocked'}`);

    res.status(200).json({
      success: true,
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      data: user,
    });
  } catch (error) {
    logger.error('Error updating user status', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ANALYTICS MODULE ====================

/**
 * Get dashboard analytics
 */
exports.getAnalytics = async (req, res) => {
  try {
    // Total users
    const totalUsers = await User.countDocuments({ role: 'user' });

    // Total bookings
    const totalBookings = await Booking.countDocuments();

    // Total revenue
    const revenueData = await Payment.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    // Monthly revenue trend (last 12 months)
    const monthlyRevenue = await Payment.aggregate([
      { $match: { status: 'succeeded' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);

    // Booking trends (last 12 months)
    const bookingTrends = await Booking.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$bookingDate' },
            month: { $month: '$bookingDate' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);

    // Most popular events
    const popularEvents = await Booking.aggregate([
      { $group: { _id: '$eventId', bookingCount: { $sum: 1 } } },
      { $sort: { bookingCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event',
        },
      },
      { $unwind: '$event' },
      {
        $project: {
          _id: 1,
          bookingCount: 1,
          title: '$event.title',
          image: '$event.image',
        },
      },
    ]);

    // Top users by bookings
    const topUsers = await Booking.aggregate([
      { $group: { _id: '$userId', bookingCount: { $sum: 1 }, totalSpent: { $sum: '$totalPrice' } } },
      { $sort: { bookingCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          bookingCount: 1,
          totalSpent: 1,
          name: '$user.fullName',
          email: '$user.email',
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalBookings,
          totalRevenue,
        },
        monthlyRevenue,
        bookingTrends,
        popularEvents,
        topUsers,
      },
    });
  } catch (error) {
    logger.error('Error fetching analytics', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== REFUNDS MODULE ====================

/**
 * Get all refund transactions
 */
exports.getRefunds = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '', sort = '-createdAt' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const searchQuery = status ? { status } : {};

    const refunds = await Payment.find({ ...searchQuery, status: 'refunded' })
      .populate('userId', 'fullName email')
      .populate('bookingId', 'numberOfTickets')
      .populate('eventId', 'title')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments({ ...searchQuery, status: 'refunded' });

    res.status(200).json({
      success: true,
      data: refunds,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching refunds', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Process refund
 */
exports.processRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      { status: 'refunded', refundReason: reason, refundedAt: new Date() },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    logger.info(`Refund processed for payment ${paymentId}`);

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: payment,
    });
  } catch (error) {
    logger.error('Error processing refund', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== COUPONS MODULE ====================

/**
 * Get all coupons
 */
exports.getCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sort = '-createdAt' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const searchQuery = search ? { code: { $regex: search, $options: 'i' } } : {};

    const coupons = await Coupon.find(searchQuery)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Coupon.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: coupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching coupons', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create coupon
 */
exports.createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, maxDiscount, minPurchaseAmount, expiryDate, maxUsage, description } = req.body;

    // Validate expiry date
    if (new Date(expiryDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'Expiry date must be in the future' });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      maxDiscount,
      minPurchaseAmount,
      expiryDate,
      maxUsage,
      description,
      createdBy: req.user._id,
    });

    logger.info(`Coupon created: ${code}`);

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon,
    });
  } catch (error) {
    logger.error('Error creating coupon', { error: error.message });
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Update coupon
 */
exports.updateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const updates = req.body;

    const coupon = await Coupon.findByIdAndUpdate(couponId, updates, {
      new: true,
      runValidators: true,
    });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    logger.info(`Coupon updated: ${coupon.code}`);

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: coupon,
    });
  } catch (error) {
    logger.error('Error updating coupon', { error: error.message });
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete coupon
 */
exports.deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;

    const coupon = await Coupon.findByIdAndDelete(couponId);

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    logger.info(`Coupon deleted: ${coupon.code}`);

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting coupon', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== WALLET MODULE ====================

/**
 * Get wallet overview
 */
exports.getWalletOverview = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Aggregate wallet statistics
    const walletStats = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$balance' },
          totalUsersWithWallet: { $sum: 1 },
          avgBalance: { $avg: '$balance' },
        },
      },
    ]);

    // Get transactions
    const transactions = await Transaction.find()
      .populate('userId', 'fullName email')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const totalTransactions = await Transaction.countDocuments();

    // Get rewards statistics
    const rewardStats = await RewardTransaction.aggregate([
      {
        $group: {
          _id: null,
          totalPointsIssued: { $sum: '$points' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        walletStats: walletStats[0] || { totalBalance: 0, totalUsersWithWallet: 0, avgBalance: 0 },
        rewardStats: rewardStats[0] || { totalPointsIssued: 0, totalTransactions: 0 },
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalTransactions,
          pages: Math.ceil(totalTransactions / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching wallet overview', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== REPORTS MODULE ====================

/**
 * Generate bookings report
 */
exports.generateBookingsReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.bookingDate = {};
      if (startDate) query.bookingDate.$gte = new Date(startDate);
      if (endDate) query.bookingDate.$lte = new Date(endDate);
    }

    const bookings = await Booking.find(query)
      .populate('userId', 'fullName email')
      .populate('eventId', 'title eventDate')
      .lean();

    if (format === 'csv') {
      const fields = ['_id', 'userId.fullName', 'userId.email', 'eventId.title', 'numberOfTickets', 'totalPrice', 'status', 'bookingDate'];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(bookings);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bookings_report.csv"');
      res.send(csv);
    } else {
      res.status(200).json({
        success: true,
        data: bookings,
        count: bookings.length,
      });
    }
  } catch (error) {
    logger.error('Error generating bookings report', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Generate revenue report
 */
exports.generateRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    const query = { status: 'succeeded' };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('userId', 'fullName email')
      .populate('eventId', 'title')
      .lean();

    // Calculate summary
    const summary = {
      totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
      totalTransactions: payments.length,
      avgTransaction: payments.length > 0 ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length : 0,
    };

    if (format === 'csv') {
      const fields = ['_id', 'userId.fullName', 'userId.email', 'eventId.title', 'amount', 'currency', 'status', 'createdAt'];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(payments);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="revenue_report.csv"');
      res.send(csv);
    } else {
      res.status(200).json({
        success: true,
        data: { payments, summary },
      });
    }
  } catch (error) {
    logger.error('Error generating revenue report', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Generate users report
 */
exports.generateUsersReport = async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const users = await User.find({ role: 'user' })
      .select('-password -emailVerificationToken -resetPasswordOtp')
      .lean();

    // Enrich with booking data
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const bookingCount = await Booking.countDocuments({ userId: user._id });
        const totalSpent = await Booking.aggregate([
          { $match: { userId: user._id } },
          { $group: { _id: null, total: { $sum: '$totalPrice' } } },
        ]);

        return {
          ...user,
          bookingCount,
          totalSpent: totalSpent[0]?.total || 0,
        };
      })
    );

    if (format === 'csv') {
      const fields = ['_id', 'fullName', 'email', 'phone', 'rewardPoints', 'bookingCount', 'totalSpent', 'createdAt'];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(usersWithStats);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="users_report.csv"');
      res.send(csv);
    } else {
      res.status(200).json({
        success: true,
        data: usersWithStats,
        count: usersWithStats.length,
      });
    }
  } catch (error) {
    logger.error('Error generating users report', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};
