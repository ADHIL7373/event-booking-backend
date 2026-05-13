/**
 * Wishlist Controller
 * Handles wishlist operations (add, remove, get saved events)
 */

const Wishlist = require('../models/Wishlist');
const Event = require('../models/Event');
const { ErrorHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Add or Remove Event from Wishlist
 * POST /api/wishlist
 * Body: { eventId }
 */
exports.toggleWishlist = async (req, res, next) => {
  try {
    const { eventId } = req.body;
    const userId = req.user._id;

    // Validate eventId
    if (!eventId) {
      return next(new ErrorHandler('Event ID is required', 400));
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new ErrorHandler('Event not found', 404));
    }

    // Check if already in wishlist
    const existingWishlist = await Wishlist.findOne({
      userId,
      eventId,
    });

    let message, wishlistItem;

    if (existingWishlist) {
      // Remove from wishlist
      await Wishlist.deleteOne({ userId, eventId });
      message = 'Event removed from wishlist';
      wishlistItem = null;
    } else {
      // Add to wishlist
      wishlistItem = await Wishlist.create({
        userId,
        eventId,
      });
      message = 'Event added to wishlist';
    }

    logger.info('Wishlist toggled', {
      userId,
      eventId,
      action: existingWishlist ? 'removed' : 'added',
    });

    res.status(200).json({
      success: true,
      message,
      data: wishlistItem,
    });
  } catch (error) {
    logger.error('Error toggling wishlist', { error: error.message });
    next(error);
  }
};

/**
 * Get User Wishlist
 * GET /api/wishlist
 */
exports.getUserWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, sortBy = 'newest' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let sortOrder = { savedAt: -1 };
    if (sortBy === 'price-low') {
      sortOrder = { 'eventId.price': 1 };
    } else if (sortBy === 'price-high') {
      sortOrder = { 'eventId.price': -1 };
    }

    // Fetch wishlist items with event details
    const wishlist = await Wishlist.find({ userId })
      .populate({
        path: 'eventId',
        select:
          'title description date time location price image category totalSeats availableSeats',
      })
      .sort(sortOrder)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Wishlist.countDocuments({ userId });

    // Filter out any null eventId (in case event was deleted)
    const filteredWishlist = wishlist.filter((item) => item.eventId);

    logger.info('Wishlist fetched', {
      userId,
      count: filteredWishlist.length,
    });

    res.status(200).json({
      success: true,
      data: filteredWishlist,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching wishlist', { error: error.message });
    next(error);
  }
};

/**
 * Check if Event is in Wishlist
 * GET /api/wishlist/check/:eventId
 */
exports.checkWishlistStatus = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    const wishlistItem = await Wishlist.findOne({
      userId,
      eventId,
    });

    res.status(200).json({
      success: true,
      inWishlist: !!wishlistItem,
    });
  } catch (error) {
    logger.error('Error checking wishlist status', { error: error.message });
    next(error);
  }
};

/**
 * Remove Event from Wishlist
 * DELETE /api/wishlist/:eventId
 */
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    const result = await Wishlist.deleteOne({
      userId,
      eventId,
    });

    if (result.deletedCount === 0) {
      return next(
        new ErrorHandler('Event not found in wishlist', 404)
      );
    }

    logger.info('Event removed from wishlist', { userId, eventId });

    res.status(200).json({
      success: true,
      message: 'Event removed from wishlist',
    });
  } catch (error) {
    logger.error('Error removing from wishlist', { error: error.message });
    next(error);
  }
};

/**
 * Clear Entire Wishlist
 * DELETE /api/wishlist
 */
exports.clearWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await Wishlist.deleteMany({ userId });

    logger.info('Wishlist cleared', {
      userId,
      deletedCount: result.deletedCount,
    });

    res.status(200).json({
      success: true,
      message: 'Wishlist cleared',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    logger.error('Error clearing wishlist', { error: error.message });
    next(error);
  }
};
