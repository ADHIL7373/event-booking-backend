/**
 * Review Routes
 * Defines all review management endpoints
 */

const express = require('express');
const router = express.Router();
const {
  createOrUpdateReview,
  getEventReviews,
  getUserReviews,
  deleteReview,
  markHelpful,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * Public routes
 */

// Get user's reviews (must be BEFORE /:eventId)
router.get('/user/my-reviews', protect, getUserReviews);

// Get reviews for specific event
router.get('/:eventId', getEventReviews);

/**
 * Protected routes - require authentication
 */

// Create or update review for an event
router.post('/', protect, createOrUpdateReview);

// Delete user's review
router.delete('/:reviewId', protect, deleteReview);

// Mark review as helpful/unhelpful
router.put('/:reviewId/helpful', markHelpful);

module.exports = router;
