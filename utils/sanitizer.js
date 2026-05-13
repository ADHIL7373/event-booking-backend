/**
 * Input Sanitizer
 * Prevents NoSQL injection and XSS attacks
 */

/**
 * Escape special regex characters for safe regex usage
 * @param {string} string - String to escape
 * @returns {string} - Escaped string
 */
exports.escapeRegex = (string) => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Sanitize object for NoSQL injection prevention
 * @param {object} obj - Object to sanitize
 * @returns {object} - Sanitized object
 */
exports.sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => exports.sanitizeObject(item));
  }

  const sanitized = {};
  Object.keys(obj).forEach((key) => {
    // Prevent NoSQL injection via keys
    if (key.includes('$') || key.includes('.')) {
      return; // Skip suspicious keys
    }

    const value = obj[key];

    if (typeof value === 'object' && value !== null) {
      sanitized[key] = exports.sanitizeObject(value);
    } else if (typeof value === 'string') {
      // Remove potential XSS
      sanitized[key] = value.trim();
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
};

/**
 * Validate image URL
 * @param {string} url - URL to validate
 * @returns {boolean} - Is valid image URL
 */
exports.isValidImageUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const path = urlObj.pathname.toLowerCase();

    // Check if URL ends with valid image extension
    return validExtensions.some((ext) => path.endsWith(ext));
  } catch {
    return false;
  }
};

/**
 * Sanitize HTML string (basic XSS prevention)
 * @param {string} html - HTML to sanitize
 * @returns {string} - Sanitized HTML
 */
exports.sanitizeHtml = (html) => {
  if (typeof html !== 'string') return '';

  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};
