/**
 * Event Reminder Job
 * Background job that runs every minute to send event reminders
 * This should be run as a separate process or using node-cron
 */

const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');

/**
 * Process pending reminders
 * Finds bookings where reminder time has passed and sends notifications
 */
exports.processPendingReminders = async () => {
  try {
    const now = new Date();

    // Find all bookings that need reminders
    const pendingBookings = await Booking.find({
      reminderTime: { $lte: now },
      reminderSent: false,
      status: 'confirmed',
      paymentStatus: 'paid',
    })
      .populate('userId', 'email fullName')
      .populate('eventId', 'title date time location')
      .lean();

    logger.info('Processing reminders', { count: pendingBookings.length });

    for (const booking of pendingBookings) {
      try {
        // Create notification in database
        const notification = await Notification.create({
          userId: booking.userId._id,
          type: 'reminder',
          title: `Upcoming Event: ${booking.eventId.title}`,
          message: `Your event "${booking.eventId.title}" is happening on ${new Date(
            booking.eventId.date
          ).toLocaleDateString()} at ${booking.eventId.time} in ${booking.eventId.location}`,
          eventId: booking.eventId._id,
          bookingId: booking._id,
          actionUrl: `/events/${booking.eventId._id}`,
        });

        // Send email notification
        if (booking.userId.email) {
          await emailService.sendEmail({
            email: booking.userId.email,
            subject: `Reminder: ${booking.eventId.title}`,
            html: `
              <h2>Event Reminder</h2>
              <p>Hi ${booking.userId.fullName},</p>
              <p>This is a reminder that your event <strong>${booking.eventId.title}</strong> is happening soon!</p>
              <p><strong>Date:</strong> ${new Date(booking.eventId.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${booking.eventId.time}</p>
              <p><strong>Location:</strong> ${booking.eventId.location}</p>
              <p>Get ready and don't miss it!</p>
              <p>Best regards,<br>Event Booking Team</p>
            `,
          });
        }

        // Mark reminder as sent
        await Booking.findByIdAndUpdate(booking._id, { reminderSent: true });

        logger.info('Reminder processed', {
          bookingId: booking._id,
          userId: booking.userId._id,
        });
      } catch (error) {
        logger.error('Error processing individual reminder', {
          bookingId: booking._id,
          error: error.message,
        });
        // Continue with next booking instead of stopping
      }
    }

    logger.info('Reminder processing completed', {
      totalProcessed: pendingBookings.length,
    });
  } catch (error) {
    logger.error('Error in reminder processing job', { error: error.message });
  }
};

/**
 * Initialize reminder job with node-cron
 * This should be called from server.js on startup
 */
exports.initializeReminderJob = () => {
  try {
    const cron = require('node-cron');

    // Run every minute
    cron.schedule('* * * * *', async () => {
      logger.info('Running reminder job...');
      await this.processPendingReminders();
    });

    logger.info('Event reminder job initialized - runs every minute');
  } catch (error) {
    logger.error('Error initializing reminder job', { error: error.message });
  }
};

/**
 * Calculate reminder time based on event date and time
 * Reminder is set to 2 hours before event
 */
exports.calculateReminderTime = (eventDate, eventTime) => {
  try {
    // Parse event date and time
    const [hours, minutes] = eventTime.split(':').map(Number);
    const eventDateTime = new Date(eventDate);
    eventDateTime.setHours(hours, minutes, 0, 0);

    // Calculate reminder time (2 hours before)
    const reminderTime = new Date(eventDateTime.getTime() - 2 * 60 * 60 * 1000);

    return reminderTime;
  } catch (error) {
    logger.error('Error calculating reminder time', { error: error.message });
    return null;
  }
};
