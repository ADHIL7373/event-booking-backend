/**
 * Error Handler Middleware
 * Handles and formats error responses
 */

const logger = require('../utils/logger');

class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log the error
  const logLevel = err.statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel](err.message, {
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    err.message = message;
    err.statusCode = 400;
  }

  // Handle duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    err.message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    err.statusCode = 400;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    err.message = 'Invalid token';
    err.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    err.message = 'Token expired. Please refresh your token.';
    err.statusCode = 401;
  }

  // Handle cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    err.message = 'Invalid ID format';
    err.statusCode = 400;
  }

  // Never expose stack traces in production
  const response = {
    success: false,
    message: err.message,
    statusCode: err.statusCode,
  };

  // Only include stack in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  return res.status(err.statusCode).json(response);
};

module.exports = { ErrorHandler, errorHandler };
