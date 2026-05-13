/**
 * Application Constants
 * Centralized configuration for business logic
 */

module.exports = {
  // Password Requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
  },

  // JWT Configuration
  JWT: {
    ACCESS_TOKEN_EXPIRY: '1h', // 1 hour for access token
    REFRESH_TOKEN_EXPIRY: '7d', // 7 days for refresh token
    MIN_SECRET_LENGTH: 32,
  },

  // Rate Limiting
  RATE_LIMIT: {
    LOGIN_MAX_ATTEMPTS: 5,
    LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    REGISTER_MAX_ATTEMPTS: 3,
    REGISTER_WINDOW_MS: 60 * 60 * 1000, // 1 hour
    API_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    API_MAX_REQUESTS: 100,
  },

  // Booking Configuration
  BOOKING: {
    MIN_TICKETS: 1,
    MAX_TICKETS: 10,
    STATUSES: ['pending', 'confirmed', 'cancelled'],
  },

  // Event Configuration
  EVENT: {
    CATEGORIES: ['Conference', 'Concert', 'Workshop', 'Sports', 'Social', 'Other'],
  },

  // File Upload
  FILE_UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },

  // Email Configuration
  EMAIL: {
    VERIFICATION_TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
    PASSWORD_RESET_TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour
  },

  // Database
  DATABASE: {
    MAX_POOL_SIZE: 10,
    MIN_POOL_SIZE: 5,
  },

  // Response Messages
  MESSAGES: {
    SUCCESS: 'Operation successful',
    ERROR: 'An error occurred',
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    VALIDATION_ERROR: 'Validation error',
  },
};
