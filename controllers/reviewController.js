/**
 * Review Controller
 * Handles event reviews and ratings
 */

const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const { ErrorHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Create or Update Review
 * POST /api/reviews
 * Body: { eventId, rating, comment }
 */
exports.createOrUpdateReview = async (req, res, next) => {
  try {
    const { eventId, rating, comment } = req.body;
    const userId = req.user._id;

    // Validate inputs
    if (!eventId) {
      return next(new ErrorHandler('Event ID is required', 400));
    }

    if (!rating || rating < 1 || rating > 5) {
      return next(
        new ErrorHandler('Rating must be between 1 and 5', 400)
      );
    }

    if (comment && comment.length < 5) {
      return next(
        new ErrorHandler('Comment must be at least 5 characters', 400)
      );
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new ErrorHandler('Event not found', 404));
    }

    // Check if user has attended this event (has a confirmed booking)
    const booking = await Booking.findOne({
      userId,
      eventId,
      status: 'confirmed',
      paymentStatus: 'paid',
    });

    if (!booking) {
      return next(
        new ErrorHandler(
          'You can only review events you have attended',
          403
        )
      );
    }

    // Check event date - only review past events
    if (new Date(event.date) > new Date()) {
      return next(
        new ErrorHandler('You can only review completed events', 403)
      );
    }

    // Find or create review
    let review = await Review.findOne({ userId, eventId });

    if (review) {
      // Update existing review
      review.rating = rating;
      review.comment = comment || '';
      review.reviewedAt = Date.now();
      await review.save();
      logger.info('Review updated', { userId, eventId });
    } else {
      // Create new review
      review = await Review.create({
        userId,
        eventId,
        rating,
        comment: comment || '',
        isVerifiedPurchase: true, // User has a booking
      });
      logger.info('Review created', { userId, eventId });
    }

    res.status(review ? 201 : 200).json({
      success: true,
      message: review ? 'Review created/updated successfully' : 'Review created',
      data: review,
    });
  } catch (error) {
    logger.error('Error creating/updating review', { error: error.message });
    next(error);
  }
};

/**
 * Get Reviews for Event
 * GET /api/reviews/:eventId
 */
exports.getEventReviews = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 10, sortBy = 'newest' } = req.query;

    // Validate eventId
    if (!eventId || eventId === 'undefined') {
      return next(new ErrorHandler('Event ID is required', 400));
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new ErrorHandler('Event not found', 404));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let sortOrder = { reviewedAt: -1 };
    if (sortBy === 'highest') {
      sortOrder = { rating: -1, reviewedAt: -1 };
    } else if (sortBy === 'lowest') {
      sortOrder = { rating: 1, reviewedAt: -1 };
    }

    // Fetch reviews
    const reviews = await Review.find({ eventId })
      .populate('userId', 'fullName profileImage')
      .sort(sortOrder)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await Review.countDocuments({ eventId });

    // Calculate average rating
    const mongoose = require('mongoose');
    const stats = await Review.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating',
          },
        },
      },
    ]);

    // Calculate rating distribution
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    if (stats.length > 0) {
      stats[0].ratingDistribution.forEach((rating) => {
        ratingDistribution[rating]++;
      });
    }

    logger.info('Event reviews fetched', {
      eventId,
      count: reviews.length,
    });

    res.status(200).json({
      success: true,
      data: reviews,
      stats: stats.length > 0 ? stats[0] : { avgRating: 0, totalReviews: 0 },
      ratingDistribution,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching reviews', { error: error.message });
    next(error);
  }
};

/**
 * Get User's Reviews
 * GET /api/reviews/user/my-reviews
 */
exports.getUserReviews = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ userId })
      .populate('eventId', 'title date location image')
      .sort({ reviewedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ userId });

    logger.info('User reviews fetched', { userId, count: reviews.length });

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching user reviews', { error: error.message });
    next(error);
  }
};

/**
 * Delete Review
 * DELETE /api/reviews/:reviewId
 */
exports.deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);

    if (!review) {
      return next(new ErrorHandler('Review not found', 404));
    }

    // Ensure user can only delete their own review
    if (review.userId.toString() !== userId.toString()) {
      return next(
        new ErrorHandler(
          'You can only delete your own reviews',
          403
        )
      );
    }

    await Review.findByIdAndDelete(reviewId);

    logger.info('Review deleted', { userId, reviewId });

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting review', { error: error.message });
    next(error);
  }
};

/**
 * Mark Review as Helpful
 * PUT /api/reviews/:reviewId/helpful
 */
exports.markHelpful = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { helpful } = req.body; // true = helpful, false = unhelpful

    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        $inc: helpful ? { helpful: 1 } : { unhelpful: 1 },
      },
      { new: true }
    );

    if (!review) {
      return next(new ErrorHandler('Review not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Review marked successfully',
      data: review,
    });
  } catch (error) {
    logger.error('Error marking review', { error: error.message });
    next(error);
  }
};
