/**
 * Refund Calculator
 * Calculates refund amount based on cancellation time
 */

/**
 * Calculate refund for booking cancellation
 * Rules:
 * - Before 24 hours of event: 100% refund
 * - Before 12 hours of event: 50% refund
 * - After 12 hours: No refund (0%)
 *
 * @param {Date} eventDate - The event date
 * @param {Number} totalPrice - Original booking price
 * @returns {Object} { refundAmount, refundPercentage }
 */
const calculateRefund = (eventDate, totalPrice) => {
  const now = new Date();
  const timeUntilEvent = eventDate.getTime() - now.getTime();
  const hoursUntilEvent = timeUntilEvent / (1000 * 60 * 60);

  let refundPercentage = 0;

  // 100% refund if cancelled 24 hours before event
  if (hoursUntilEvent >= 24) {
    refundPercentage = 100;
  }
  // 50% refund if cancelled between 12-24 hours before event
  else if (hoursUntilEvent >= 12) {
    refundPercentage = 50;
  }
  // No refund if cancelled less than 12 hours before event
  else {
    refundPercentage = 0;
  }

  const refundAmount = (totalPrice * refundPercentage) / 100;

  return {
    refundAmount: Math.round(refundAmount * 100) / 100, // Round to 2 decimals
    refundPercentage,
    reason:
      hoursUntilEvent >= 24
        ? '100% refund - Cancelled more than 24 hours before event'
        : hoursUntilEvent >= 12
          ? '50% refund - Cancelled 12-24 hours before event'
          : 'No refund - Cancelled less than 12 hours before event',
  };
};

/**
 * Check if event has already started
 * @param {Date} eventDate - The event date
 * @returns {Boolean}
 */
const isEventPassed = (eventDate) => {
  const now = new Date();
  return eventDate <= now;
};

/**
 * Get hours until event
 * @param {Date} eventDate - The event date
 * @returns {Number}
 */
const getHoursUntilEvent = (eventDate) => {
  const now = new Date();
  const timeUntilEvent = eventDate.getTime() - now.getTime();
  return timeUntilEvent / (1000 * 60 * 60);
};

module.exports = {
  calculateRefund,
  isEventPassed,
  getHoursUntilEvent,
};
