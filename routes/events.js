/**
 * Event Routes
 * Defines all event management endpoints
 */

const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsByCategory,
  searchEvents,
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateEvent,
  validateIdParam,
  handleValidationErrors,
} = require('../middleware/validation');

/**
 * Public routes
 */
router.get('/', getAllEvents);
router.get('/search', searchEvents);
router.get('/category/:category', getEventsByCategory);
router.get('/:id', validateIdParam, handleValidationErrors, getEventById);

/**
 * Protected routes
 */
// Admin only
router.post(
  '/',
  protect,
  authorize('admin'),
  upload.single('image'),
  validateEvent,
  handleValidationErrors,
  createEvent
);

router.put(
  '/:id',
  protect,
  authorize('admin'),
  validateIdParam,
  handleValidationErrors,
  updateEvent
);

router.delete(
  '/:id',
  protect,
  authorize('admin'),
  validateIdParam,
  handleValidationErrors,
  deleteEvent
);

module.exports = router;
