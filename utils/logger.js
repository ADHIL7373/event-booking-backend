/**
 * Logger Utility
 * Provides centralized logging functionality
 */

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Log levels
const LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

/**
 * Format log message with timestamp and level
 */
const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...(Object.keys(meta).length > 0 && { meta }),
  });
};

/**
 * Write log to file and console
 */
const writeLog = (level, message, meta = {}) => {
  const logMessage = formatMessage(level, message, meta);

  // Only log non-debug in development or actual errors in production
  if (
    process.env.NODE_ENV === 'development' ||
    level !== LEVELS.DEBUG
  ) {
    console.log(logMessage);
  }

  // Write to file
  const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);
  fs.appendFileSync(logFile, logMessage + '\n');
};

module.exports = {
  debug: (message, meta) => writeLog(LEVELS.DEBUG, message, meta),
  info: (message, meta) => writeLog(LEVELS.INFO, message, meta),
  warn: (message, meta) => writeLog(LEVELS.WARN, message, meta),
  error: (message, meta) => writeLog(LEVELS.ERROR, message, meta),
};
