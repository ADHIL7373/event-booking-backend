/**
 * Dashboard Controller
 * Handles dashboard statistics for users and admins
 */

const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');

/**
 * Get User Dashboard Stats
 * GET /api/dashboard/user
 */
exports.getUserDashboard = async (req, res, next) => {
  try {
    // Get user's booking count
    const totalBookings = await Booking.countDocuments({
      userId: req.user._id,
    });

    // Get user's spending
    const bookingStats = await Booking.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$totalPrice' },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] },
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
    ]);

    const stats = bookingStats[0] || {
      totalSpent: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
    };

    // Get upcoming events the user booked
    const upcomingBookings = await Booking.find({
      userId: req.user._id,
      status: 'confirmed',
    })
      .populate({
        path: 'eventId',
        match: { date: { $gte: new Date() } },
      })
      .limit(5)
      .sort({ 'eventId.date': 1 });

    const upcomingEvents = upcomingBookings
      .filter((b) => b.eventId !== null)
      .map((b) => b.eventId);

    res.status(200).json({
      success: true,
      dashboard: {
        totalBookings: stats.confirmedBookings,
        cancelledBookings: stats.cancelledBookings,
        totalSpent: stats.totalSpent,
        upcomingEvents: upcomingEvents.length,
        recentBookings: upcomingEvents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Admin Dashboard Stats
 * GET /api/dashboard/admin
 */
exports.getAdminDashboard = async (req, res, next) => {
  try {
    // Total users
    const totalUsers = await User.countDocuments({ role: 'user' });

    // Total events
    const totalEvents = await Event.countDocuments();

    // Total bookings
    const totalBookings = await Booking.countDocuments();

    // Total revenue
    const revenueStats = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
        },
      },
    ]);

    const totalRevenue = revenueStats[0]?.totalRevenue || 0;

    // Bookings by status
    const bookingsByStatus = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Recent bookings
    const recentBookings = await Booking.find()
      .populate('userId', 'fullName email')
      .populate('eventId', 'title')
      .sort({ bookingDate: -1 })
      .limit(10);

    // Filter out bookings with missing user or event data
    const validRecentBookings = recentBookings.filter(
      (b) => b.userId && b.eventId
    );

    // Top events
    const topEvents = await Booking.aggregate([
      {
        $group: {
          _id: '$eventId',
          bookingCount: { $sum: 1 },
          revenue: { $sum: '$totalPrice' },
        },
      },
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
    ]);

    res.status(200).json({
      success: true,
      dashboard: {
        totalUsers,
        totalEvents,
        totalBookings,
        totalRevenue,
        bookingsByStatus: Object.fromEntries(
          bookingsByStatus.map((b) => [b._id || 'unknown', Math.max(0, b.count)])
        ),
        recentBookings: validRecentBookings.map((b) => ({
          id: b._id,
          userName: b.userId?.fullName || 'Unknown User',
          eventName: b.eventId?.title || 'Unknown Event',
          tickets: Math.max(0, b.numberOfTickets || 0),
          amount: Math.max(0, b.totalPrice || 0),
          date: b.bookingDate,
          status: b.status || 'confirmed',
        })),
        topEvents: topEvents
          .filter((e) => e.event && e.event.length > 0)
          .map((e) => ({
            eventName: e.event[0]?.title || 'Unknown Event',
            bookings: Math.max(0, e.bookingCount || 0),
            revenue: Math.max(0, e.revenue || 0),
          })),
      },
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    next(error);
  }
};

/**
 * Get Event Stats (Admin)
 * GET /api/dashboard/event/:eventId
 */
exports.getEventStats = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check authorization
    if (
      event.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this event statistics',
      });
    }

    // Get event statistics
    const bookingStats = await Booking.aggregate([
      { $match: { eventId: event._id } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalTickets: { $sum: '$numberOfTickets' },
          totalRevenue: { $sum: '$totalPrice' },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] },
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
    ]);

    const stats = bookingStats[0] || {
      totalBookings: 0,
      totalTickets: 0,
      totalRevenue: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
    };

    res.status(200).json({
      success: true,
      eventStats: {
        eventName: event.title,
        totalBookings: stats.totalBookings,
        confirmedBookings: stats.confirmedBookings,
        cancelledBookings: stats.cancelledBookings,
        totalTicketsSold: stats.totalTickets,
        totalRevenue: stats.totalRevenue,
        availableSeats: event.availableSeats,
        totalCapacity: event.totalSeats,
        occupancyRate: (
          ((event.totalSeats - event.availableSeats) / event.totalSeats) *
          100
        ).toFixed(2),
      },
    });
  } catch (error) {
    next(error);
  }
};
