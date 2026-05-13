/**
 * QR Code Utilities
 * Handles QR code generation and validation
 */

const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Generate QR code data from booking information
 * @param {string} bookingId - Booking ID
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {string} QR code data string
 */
exports.generateQRData = (bookingId, userId, eventId) => {
  const data = {
    bookingId,
    userId,
    eventId,
    timestamp: Date.now(),
    hash: crypto
      .createHash('sha256')
      .update(`${bookingId}${userId}${eventId}${Date.now()}`)
      .digest('hex')
      .substring(0, 16),
  };

  return JSON.stringify(data);
};

/**
 * Generate QR code image as data URL
 * @param {string} data - Data to encode in QR code
 * @returns {Promise<string>} Data URL of QR code image
 */
exports.generateQRCode = async (data) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
    });
    return qrCodeDataUrl;
  } catch (error) {
    throw new Error(`QR Code generation failed: ${error.message}`);
  }
};

/**
 * Parse and verify QR code data
 * @param {string} qrData - QR code data to parse
 * @returns {object} Parsed QR data with bookingId, userId, eventId
 */
exports.parseQRData = (qrData) => {
  try {
    const data = JSON.parse(qrData);
    return {
      bookingId: data.bookingId,
      userId: data.userId,
      eventId: data.eventId,
      timestamp: data.timestamp,
      hash: data.hash,
    };
  } catch (error) {
    throw new Error('Invalid QR code data');
  }
};

/**
 * Validate QR code data structure
 * @param {object} data - Parsed QR data
 * @returns {boolean} True if valid
 */
exports.validateQRData = (data) => {
  return (
    data.bookingId &&
    data.userId &&
    data.eventId &&
    data.timestamp &&
    data.hash
  );
};

/**
 * Generate ticket number
 * @param {string} bookingId - Booking ID
 * @param {number} index - Ticket index
 * @returns {string} Ticket number
 */
exports.generateTicketNumber = (bookingId, index) => {
  const timestamp = Date.now().toString().slice(-6);
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TKT-${timestamp}-${randomStr}-${index + 1}`;
};
