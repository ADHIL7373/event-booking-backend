/**
 * Notification Routes
 * Defines all notification and reminder endpoints
 */

const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getPendingReminders,
  markReminderAsSent,
  getUnreadCount,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

/**
 * Protected routes - require authentication
 */

// Get user notifications
router.get('/', protect, getUserNotifications);

// Get unread count
router.get('/unread-count', protect, getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', protect, markNotificationAsRead);

// Mark all notifications as read
router.put('/read-all', protect, markAllAsRead);

// Delete specific notification
router.delete('/:notificationId', protect, deleteNotification);

// Clear all notifications
router.delete('/', protect, clearAllNotifications);

/**
 * Internal routes (for background job)
 * These should be protected with API key or internal auth
 */

// Get pending reminders (for background job)
router.get('/reminders/pending', getPendingReminders);

// Mark reminder as sent (for background job)
router.put('/reminders/:bookingId/sent', markReminderAsSent);

module.exports = router;
