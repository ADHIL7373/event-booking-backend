/**
 * Error Codes and Messages
 * Centralized error definitions
 */

const ERRORS = {
  // Authentication Errors
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password',
    statusCode: 401,
  },
  WEAK_PASSWORD: {
    code: 'WEAK_PASSWORD',
    message: 'Password does not meet security requirements',
    statusCode: 400,
  },
  EMAIL_ALREADY_EXISTS: {
    code: 'EMAIL_ALREADY_EXISTS',
    message: 'Email already registered',
    statusCode: 400,
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    message: 'Invalid or expired token',
    statusCode: 401,
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Unauthorized access',
    statusCode: 401,
  },

  // Authorization Errors
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Access forbidden',
    statusCode: 403,
  },
  NOT_AUTHORIZED_ACTION: {
    code: 'NOT_AUTHORIZED_ACTION',
    message: 'Not authorized to perform this action',
    statusCode: 403,
  },

  // Resource Errors
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    statusCode: 404,
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User not found',
    statusCode: 404,
  },
  EVENT_NOT_FOUND: {
    code: 'EVENT_NOT_FOUND',
    message: 'Event not found',
    statusCode: 404,
  },
  BOOKING_NOT_FOUND: {
    code: 'BOOKING_NOT_FOUND',
    message: 'Booking not found',
    statusCode: 404,
  },

  // Validation Errors
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Validation error',
    statusCode: 400,
  },
  INVALID_INPUT: {
    code: 'INVALID_INPUT',
    message: 'Invalid input provided',
    statusCode: 400,
  },
  MISSING_FIELDS: {
    code: 'MISSING_FIELDS',
    message: 'Required fields are missing',
    statusCode: 400,
  },

  // Booking Errors
  INSUFFICIENT_SEATS: {
    code: 'INSUFFICIENT_SEATS',
    message: 'Insufficient seats available',
    statusCode: 400,
  },
  EVENT_ALREADY_PASSED: {
    code: 'EVENT_ALREADY_PASSED',
    message: 'Event date has already passed',
    statusCode: 400,
  },
  BOOKING_ALREADY_CANCELLED: {
    code: 'BOOKING_ALREADY_CANCELLED',
    message: 'Booking is already cancelled',
    statusCode: 400,
  },

  // Server Errors
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    message: 'Internal server error',
    statusCode: 500,
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: 'Database error occurred',
    statusCode: 500,
  },

  // Rate Limiting Errors
  TOO_MANY_REQUESTS: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests. Please try again later.',
    statusCode: 429,
  },
};

module.exports = ERRORS;
