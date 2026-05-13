/**
 * JWT Utilities
 * Handles token generation and verification
 */

const jwt = require('jsonwebtoken');
const constants = require('../config/constants');

/**
 * Generate JWT token
 * @param {string} id - User ID
 * @returns {string} JWT token
 */
// Validate JWT secret at startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < constants.JWT.MIN_SECRET_LENGTH) {
  throw new Error(
    `JWT_SECRET must be set and at least ${constants.JWT.MIN_SECRET_LENGTH} characters`
  );
}

exports.generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: constants.JWT.ACCESS_TOKEN_EXPIRY,
  });
};

exports.generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: constants.JWT.REFRESH_TOKEN_EXPIRY,
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token data
 */
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Decode token without verification
 * @param {string} token - JWT token to decode
 * @returns {object} Decoded token data
 */
exports.decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};
