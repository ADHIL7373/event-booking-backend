/**
 * Dashboard Routes
 * Defines dashboard endpoints for users and admins
 */

const express = require('express');
const router = express.Router();
const {
  getUserDashboard,
  getAdminDashboard,
  getEventStats,
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateIdParam,
  handleValidationErrors,
} = require('../middleware/validation');

/**
 * Protected routes
 */
// User dashboard
router.get('/user', protect, getUserDashboard);

// Admin dashboard
router.get('/admin', protect, authorize('admin'), getAdminDashboard);

// Event statistics
router.get(
  '/event/:eventId',
  protect,
  authorize('admin'),
  validateIdParam,
  handleValidationErrors,
  getEventStats
);

module.exports = router;
