/**
 * Validation Utilities
 * Helper functions for data validation
 */

/**
 * Check if email is valid
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
exports.isValidEmail = (email) => {
  // Simple email regex that works for most cases
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if password is strong
 * @param {string} password - Password to validate
 * @returns {object} Validation result with message
 */
exports.isStrongPassword = (password) => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*]/.test(password);
  const isLongEnough = password.length >= 8;

  const isStrong =
    hasUpperCase && hasLowerCase && hasNumbers && isLongEnough;

  return {
    isStrong,
    message: isStrong ? 'Password is strong' : 'Password is weak',
    suggestions: {
      uppercase: !hasUpperCase ? 'Add uppercase letters' : null,
      lowercase: !hasLowerCase ? 'Add lowercase letters' : null,
      numbers: !hasNumbers ? 'Add numbers' : null,
      length: !isLongEnough ? 'Use at least 8 characters' : null,
    },
  };
};

/**
 * Sanitize user input
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
exports.sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Check if date is in future
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is in future
 */
exports.isFutureDate = (date) => {
  const inputDate = new Date(date);
  // Set to start of day to ignore timezone issues
  inputDate.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return inputDate > today;
};

/**
 * Check if number is within range
 * @param {number} num - Number to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if within range
 */
exports.isInRange = (num, min, max) => {
  return num >= min && num <= max;
};

/**
 * Validate object required fields
 * @param {object} obj - Object to validate
 * @param {array} requiredFields - Required field names
 * @returns {boolean} True if all required fields exist
 */
exports.hasRequiredFields = (obj, requiredFields) => {
  return requiredFields.every(field => field in obj && obj[field] !== null && obj[field] !== '');
};
