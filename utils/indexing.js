/**
 * Database Indexing
 * Adds indexes to collections for performance optimization
 */

const Event = require('../models/Event');
const Booking = require('../models/Booking');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Create all database indexes
 */
exports.createIndexes = async () => {
  try {
    // Event indexes
    await Event.collection.createIndex({ 'createdBy': 1, 'date': 1 });
    await Event.collection.createIndex({ 'category': 1, 'date': 1 });
    await Event.collection.createIndex({ 'title': 'text', 'description': 'text', 'location': 'text' });
    
    // Booking indexes
    await Booking.collection.createIndex({ 'userId': 1, 'status': 1 });
    await Booking.collection.createIndex({ 'eventId': 1, 'status': 1 });
    await Booking.collection.createIndex({ 'createdAt': 1 });
    
    // User indexes
    await User.collection.createIndex({ 'email': 1 }, { unique: true });
    await User.collection.createIndex({ 'emailVerificationToken': 1 });

    logger.info('Database indexes created successfully');
  } catch (error) {
    if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
      logger.warn('Some indexes already exist', { error: error.message });
    } else {
      logger.error('Error creating database indexes', { error: error.message });
    }
  }
};
