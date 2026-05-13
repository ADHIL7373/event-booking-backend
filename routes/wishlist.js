/**
 * Wishlist Routes
 * Defines all wishlist management endpoints
 */

const express = require('express');
const router = express.Router();
const {
  toggleWishlist,
  getUserWishlist,
  checkWishlistStatus,
  removeFromWishlist,
  clearWishlist,
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * Protected routes - all wishlist routes require authentication
 */

// Get user's wishlist
router.get('/', protect, getUserWishlist);

// Check if event is in wishlist
router.get('/check/:eventId', protect, checkWishlistStatus);

// Add or remove event from wishlist
router.post('/', protect, toggleWishlist);

// Remove specific event from wishlist
router.delete('/:eventId', protect, removeFromWishlist);

// Clear entire wishlist
router.delete('/', protect, clearWishlist);

module.exports = router;
