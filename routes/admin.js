/**
 * Admin Routes
 * Protected routes for admin management operations
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllUsers,
  getUserDetails,
  toggleUserStatus,
  getAnalytics,
  getRefunds,
  processRefund,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getWalletOverview,
  generateBookingsReport,
  generateRevenueReport,
  generateUsersReport,
} = require('../controllers/adminController');

// Middleware to verify admin role
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
  next();
};

// Apply admin middleware to all routes
router.use(protect, adminOnly);

// ==================== USERS ROUTES ====================
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.patch('/users/:userId/toggle-status', toggleUserStatus);

// ==================== ANALYTICS ROUTES ====================
router.get('/analytics', getAnalytics);

// ==================== REFUNDS ROUTES ====================
router.get('/refunds', getRefunds);
router.post('/refunds/:paymentId/process', processRefund);

// ==================== COUPONS ROUTES ====================
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.patch('/coupons/:couponId', updateCoupon);
router.delete('/coupons/:couponId', deleteCoupon);

// ==================== WALLET ROUTES ====================
router.get('/wallet', getWalletOverview);

// ==================== REPORTS ROUTES ====================
router.get('/reports/bookings', generateBookingsReport);
router.get('/reports/revenue', generateRevenueReport);
router.get('/reports/users', generateUsersReport);

module.exports = router;
