/**
 * Password Validator
 * Validates password strength according to security requirements
 */

const constants = require('../config/constants');

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
exports.validatePassword = (password) => {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Check minimum length
  if (password.length < constants.PASSWORD.MIN_LENGTH) {
    errors.push(
      `Password must be at least ${constants.PASSWORD.MIN_LENGTH} characters`
    );
  }

  // Check for uppercase letters
  if (
    constants.PASSWORD.REQUIRE_UPPERCASE &&
    !/[A-Z]/.test(password)
  ) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letters
  if (
    constants.PASSWORD.REQUIRE_LOWERCASE &&
    !/[a-z]/.test(password)
  ) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for numbers
  if (
    constants.PASSWORD.REQUIRE_NUMBERS &&
    !/[0-9]/.test(password)
  ) {
    errors.push('Password must contain at least one number');
  }

  // Check for special characters
  if (
    constants.PASSWORD.REQUIRE_SPECIAL_CHARS &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push(
      'Password must contain at least one special character (!@#$%^&*)'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get password strength score (0-100)
 * @param {string} password - Password to score
 * @returns {number} - Strength score
 */
exports.getPasswordStrength = (password) => {
  let score = 0;

  if (!password) return score;

  // Length scoring
  score += Math.min(password.length / constants.PASSWORD.MIN_LENGTH * 20, 20);

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    score += 20;

  // Additional length bonus
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 5;

  return Math.min(score, 100);
};
