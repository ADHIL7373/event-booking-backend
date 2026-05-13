/**
 * Event Controller
 * Handles event creation, reading, updating, and deletion
 */

const Event = require('../models/Event');
const { isFutureDate, hasRequiredFields } = require('../utils/validators');
const { ErrorHandler } = require('../middleware/errorHandler');
const { escapeRegex, isValidImageUrl, sanitizeObject } = require('../utils/sanitizer');
const constants = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Get All Events with pagination
 * GET /api/events?page=1&limit=10&category=Concert&sortBy=date
 */
exports.getAllEvents = async (req, res, next) => {
  try {
    const { category, sortBy, page = constants.PAGINATION.DEFAULT_PAGE, limit = constants.PAGINATION.DEFAULT_LIMIT } = req.query;

    // Validate and parse pagination params
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(
      Math.max(1, parseInt(limit) || constants.PAGINATION.DEFAULT_LIMIT),
      constants.PAGINATION.MAX_LIMIT
    );
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    // Filter by category if provided
    if (category) {
      query.category = category;
    }

    // Determine sort order
    let sortOrder = { date: 1 };
    if (sortBy === 'price') {
      sortOrder = { price: 1 };
    } else if (sortBy === 'newest') {
      sortOrder = { createdAt: -1 };
    }

    // Execute query with pagination
    const events = await Event.find(query)
      .sort(sortOrder)
      .populate('createdBy', 'fullName email')
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Assign default images to events without images (for backward compatibility)
    const defaultImages = [
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500',
    ];

    const enrichedEvents = events.map((event, index) => {
      logger.info('Processing event', {
        eventId: event._id,
        title: event.title,
        hasImage: !!event.image,
        imageValue: event.image,
        imageType: typeof event.image,
      });

      let imageUrl = event.image;

      // Normalize image to a full absolute URL for the client
      if (!imageUrl || imageUrl === '') {
        imageUrl = defaultImages[index % defaultImages.length];
        logger.info('Assigned default image to event', { eventId: event._id, title: event.title, defaultImage: imageUrl });
      } else if (typeof imageUrl === 'string') {
        const trimmed = imageUrl.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          imageUrl = trimmed;
        } else if (trimmed.startsWith('/uploads')) {
          imageUrl = `http://localhost:5000${trimmed}?t=${Date.now()}`;
        } else if (trimmed.includes('/uploads/')) {
          const cleaned = trimmed.replace(/^\/+/, '');
          imageUrl = `http://localhost:5000/${cleaned}?t=${Date.now()}`;
        } else {
          // assume bare filename
          const cleaned = trimmed.replace(/^\/+/, '');
          imageUrl = `http://localhost:5000/uploads/${cleaned}?t=${Date.now()}`;
        }
        logger.info('Normalized event image to full URL', { eventId: event._id, imageUrl });
      }

      return { ...event, image: imageUrl };
    });

    // Get total count for pagination info
    const total = await Event.countDocuments(query);

    logger.info('Events retrieved', { page: pageNum, limit: limitNum, count: enrichedEvents.length });

    res.status(200).json({
      success: true,
      count: enrichedEvents.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      events: enrichedEvents,
    });
  } catch (error) {
    logger.error('Error getting events', { error: error.message });
    next(error);
  }
};

/**
 * Get Single Event
 * GET /api/events/:id
 */
exports.getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let event = await Event.findById(id).populate('createdBy', 'fullName email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Normalize image into a full URL for the client.
    let imageUrl = event.image;
    const defaultImages = [
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500',
    ];

    if (!imageUrl || imageUrl === '') {
      imageUrl = defaultImages[Math.floor(Math.random() * defaultImages.length)];
      logger.info('Assigned default image to single event', { eventId: event._id, title: event.title, defaultImage: imageUrl });
    } else if (typeof imageUrl === 'string') {
      const trimmed = imageUrl.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        imageUrl = trimmed;
      } else if (trimmed.startsWith('/uploads')) {
        imageUrl = `http://localhost:5000${trimmed}?t=${Date.now()}`;
      } else if (trimmed.includes('/uploads/')) {
        const cleaned = trimmed.replace(/^\/+/, '');
        imageUrl = `http://localhost:5000/${cleaned}?t=${Date.now()}`;
      } else {
        // assume bare filename
        const cleaned = trimmed.replace(/^\/+/, '');
        imageUrl = `http://localhost:5000/uploads/${cleaned}?t=${Date.now()}`;
      }
      logger.info('Normalized single event image to full URL', { eventId: event._id, imageUrl });
    }
    
    // Return event with enriched image
    event.image = imageUrl;

    res.status(200).json({
      success: true,
      event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Event
 * POST /api/events
 */
exports.createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      date,
      time,
      location,
      price,
      totalSeats,
      category,
    } = req.body;

    // Validation
    const requiredFields = [
      'title',
      'description',
      'date',
      'time',
      'location',
      'price',
      'totalSeats',
    ];
    if (!hasRequiredFields(req.body, requiredFields)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Convert to numbers
    const priceNum = parseFloat(price);
    const totalSeatsNum = parseInt(totalSeats);

    // Validate numeric values
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'Ticket price must be a valid positive number',
      });
    }

    if (isNaN(totalSeatsNum) || totalSeatsNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Total seats must be at least 1',
      });
    }

    if (!isFutureDate(date)) {
      return res.status(400).json({
        success: false,
        message: 'Event date must be in the future',
      });
    }

    // Check if image file is provided
    if (!req.file) {
      logger.warn('Image file not provided for event creation', { userId: req.user._id });
      return res.status(400).json({
        success: false,
        message: 'Please provide an event image',
      });
    }

    // Validate file was saved to disk
    if (!req.file.filename || !req.file.path) {
      logger.error('File upload incomplete', {
        hasFilename: !!req.file.filename,
        hasPath: !!req.file.path,
        userId: req.user._id,
      });
      return res.status(400).json({
        success: false,
        message: 'File upload failed - file not saved properly',
      });
    }

    // Store only the filename
    const imageFilename = req.file.filename;
    const imageUrl = `http://localhost:5000/uploads/${imageFilename}?t=${Date.now()}`;
    
    logger.info('Image file received for event', {
      filename: imageFilename,
      originalName: req.file.originalname,
      size: req.file.size,
      userId: req.user._id,
      diskPath: req.file.path,
      mimeType: req.file.mimetype,
    });
    
    // Create event with validated data
    const eventData = {
      title: title.trim(),
      description: description.trim(),
      date,
      time,
      location: location.trim(),
      price: priceNum,
      totalSeats: totalSeatsNum,
      availableSeats: totalSeatsNum,
      category: category || 'Other',
      image: `/uploads/${imageFilename}`, // Save standardized path starting with /uploads/
      createdBy: req.user._id,
    };

    logger.debug('Creating event with data', {
      eventData: { ...eventData, image: `[filename: ${imageFilename}]` },
    });

    const event = await Event.create(eventData);

    // Verify image was saved
    if (!event.image || event.image.trim() === '') {
      logger.error('Image not saved to database', {
        eventId: event._id,
        receivedFilename: imageFilename,
        savedImage: event.image,
      });
      return res.status(500).json({
        success: false,
        message: 'Event created but image was not saved properly',
      });
    }

    await event.populate('createdBy', 'fullName email');

    logger.info('Event created successfully', { 
      eventId: event._id, 
      createdBy: req.user._id,
      imageSaved: event.image,
      imageUrl: imageUrl,
      fileSavedToDisk: req.file.path,
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event: {
        _id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        price: event.price,
        totalSeats: event.totalSeats,
        availableSeats: event.availableSeats,
        category: event.category,
        image: imageUrl, // Return full URL for immediate use
        createdBy: event.createdBy,
      },
    });
  } catch (error) {
    logger.error('Error creating event', { error: error.message, userId: req.user._id });
    next(error);
  }
};

/**
 * Update Event
 * PUT /api/events/:id
 */
exports.updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if event exists
    let event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check if user is the event creator or admin
    if (
      event.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event',
      });
    }

    // Validate date if provided
    if (updateData.date && !isFutureDate(updateData.date)) {
      return res.status(400).json({
        success: false,
        message: 'Event date must be in the future',
      });
    }

    // Update event
    event = await Event.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'fullName email');

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Event
 * DELETE /api/events/:id
 */
exports.deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check if user is the event creator or admin
    if (
      event.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event',
      });
    }

    await Event.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Events by Category
 * GET /api/events/category/:category
 */
exports.getEventsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;

    let events = await Event.find({ category })
      .sort({ date: 1 })
      .populate('createdBy', 'fullName email');

    // Assign default images to events without images (for backward compatibility)
    const defaultImages = [
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500',
    ];

    events = events.map((event, index) => {
      // Construct full image URL if it's a local filename (doesn't start with http)
      let imageUrl = event.image;
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `http://localhost:5000/uploads/${imageUrl}?t=${Date.now()}`;
      } else if (!imageUrl || imageUrl === '') {
        // Assign default image if no image exists
        imageUrl = defaultImages[index % defaultImages.length];
      }
      return {
        ...event,
        image: imageUrl,
      };
    });

    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search Events with pagination
 * GET /api/events/search?q=query&page=1&limit=10
 */
exports.searchEvents = async (req, res, next) => {
  try {
    const { q, page = constants.PAGINATION.DEFAULT_PAGE, limit = constants.PAGINATION.DEFAULT_LIMIT } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query',
      });
    }

    // Validate and parse pagination params
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(
      Math.max(1, parseInt(limit) || constants.PAGINATION.DEFAULT_LIMIT),
      constants.PAGINATION.MAX_LIMIT
    );
    const skip = (pageNum - 1) * limitNum;

    // Escape regex to prevent NoSQL injection
    const escapedQuery = escapeRegex(q.trim());

    const query = {
      $or: [
        { title: { $regex: escapedQuery, $options: 'i' } },
        { description: { $regex: escapedQuery, $options: 'i' } },
        { location: { $regex: escapedQuery, $options: 'i' } },
      ],
    };

    // Execute query with pagination
    let events = await Event.find(query)
      .sort({ date: 1 })
      .populate('createdBy', 'fullName email')
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Assign default images to events without images (for backward compatibility)
    const defaultImages = [
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500',
    ];

    events = events.map((event, index) => {
      // Construct full image URL if it's a local filename (doesn't start with http)
      let imageUrl = event.image;
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `http://localhost:5000/uploads/${imageUrl}?t=${Date.now()}`;
      } else if (!imageUrl || imageUrl === '') {
        // Assign default image if no image exists
        imageUrl = defaultImages[index % defaultImages.length];
      }
      return {
        ...event,
        image: imageUrl,
      };
    });

    // Get total count
    const total = await Event.countDocuments(query);

    logger.info('Events searched', { query: q, page: pageNum, limitNum, count: events.length });

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      events,
    });
  } catch (error) {
    logger.error('Error searching events', { error: error.message, query: q });
    next(error);
  }
};
