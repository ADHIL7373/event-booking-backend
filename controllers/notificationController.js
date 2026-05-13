/**
 * Notification Controller
 * Handles event reminders and notifications
 */

const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const { ErrorHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Get User Notifications
 * GET /api/notifications
 */
exports.getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, read } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { userId };

    // Filter by read status if provided
    if (read !== undefined) {
      query.read = read === 'true';
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);

    // Count unread notifications
    const unreadCount = await Notification.countDocuments({
      userId,
      read: false,
    });

    logger.info('Notifications fetched', { userId, count: notifications.length });

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching notifications', { error: error.message });
    next(error);
  }
};

/**
 * Mark Notification as Read
 * PUT /api/notifications/:notificationId/read
 */
exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return next(new ErrorHandler('Notification not found', 404));
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    logger.error('Error marking notification', { error: error.message });
    next(error);
  }
};

/**
 * Mark All Notifications as Read
 * PUT /api/notifications/read-all
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );

    logger.info('All notifications marked as read', {
      userId,
      updatedCount: result.modifiedCount,
    });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    logger.error('Error marking all as read', { error: error.message });
    next(error);
  }
};

/**
 * Delete Notification
 * DELETE /api/notifications/:notificationId
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const result = await Notification.deleteOne({
      _id: notificationId,
      userId,
    });

    if (result.deletedCount === 0) {
      return next(new ErrorHandler('Notification not found', 404));
    }

    logger.info('Notification deleted', { userId, notificationId });

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    logger.error('Error deleting notification', { error: error.message });
    next(error);
  }
};

/**
 * Clear All Notifications
 * DELETE /api/notifications
 */
exports.clearAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await Notification.deleteMany({ userId });

    logger.info('All notifications cleared', {
      userId,
      deletedCount: result.deletedCount,
    });

    res.status(200).json({
      success: true,
      message: 'All notifications cleared',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    logger.error('Error clearing notifications', { error: error.message });
    next(error);
  }
};

/**
 * Get Pending Reminders (For background job)
 * GET /api/notifications/reminders/pending
 * NOTE: This is for internal use by background job
 */
exports.getPendingReminders = async (req, res, next) => {
  try {
    const now = new Date();

    // Find bookings where reminder needs to be sent
    const pendingBookings = await Booking.find({
      reminderTime: { $lte: now },
      reminderSent: false,
      status: 'confirmed',
    })
      .populate('userId', 'email fullName')
      .populate('eventId', 'title date time location')
      .lean();

    logger.info('Pending reminders fetched', { count: pendingBookings.length });

    res.status(200).json({
      success: true,
      data: pendingBookings,
    });
  } catch (error) {
    logger.error('Error fetching pending reminders', { error: error.message });
    next(error);
  }
};

/**
 * Mark Reminder as Sent
 * PUT /api/notifications/reminders/:bookingId/sent
 * NOTE: This is for internal use by background job
 */
exports.markReminderAsSent = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { reminderSent: true },
      { new: true }
    );

    if (!booking) {
      return next(new ErrorHandler('Booking not found', 404));
    }

    logger.info('Reminder marked as sent', { bookingId });

    res.status(200).json({
      success: true,
      message: 'Reminder marked as sent',
    });
  } catch (error) {
    logger.error('Error marking reminder as sent', { error: error.message });
    next(error);
  }
};

/**
 * Get Unread Count
 * GET /api/notifications/unread-count
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Notification.countDocuments({
      userId,
      read: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    logger.error('Error fetching unread count', { error: error.message });
    next(error);
  }
};
