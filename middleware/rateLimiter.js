/**
 * Rate Limiter Middleware
 * Prevents brute force attacks and abuse
 */

const rateLimit = require('express-rate-limit');
const constants = require('../config/constants');

/**
 * Login rate limiter
 * Max 5 attempts per 15 minutes
 */
exports.loginLimiter = rateLimit({
  windowMs: constants.RATE_LIMIT.LOGIN_WINDOW_MS,
  max: constants.RATE_LIMIT.LOGIN_MAX_ATTEMPTS,
  message:
    'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
});

/**
 * Register rate limiter
 * Max 3 attempts per hour
 */
exports.registerLimiter = rateLimit({
  windowMs: constants.RATE_LIMIT.REGISTER_WINDOW_MS,
  max: constants.RATE_LIMIT.REGISTER_MAX_ATTEMPTS,
  message:
    'Too many registration attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
});

/**
 * General API rate limiter
 * Max 100 requests per 15 minutes
 */
exports.apiLimiter = rateLimit({
  windowMs: constants.RATE_LIMIT.API_WINDOW_MS,
  max: constants.RATE_LIMIT.API_MAX_REQUESTS,
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
});
