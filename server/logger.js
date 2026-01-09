/**
 * Production-safe logger utility for backend server
 *
 * - debug: Only logs in development mode (for request tracing, verbose info)
 * - info: Always logs (startup messages, important events)
 * - warn: Always logs (warnings that don't stop execution)
 * - error: Always logs (errors that need attention)
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  /**
   * Debug level - only logs in development
   * Use for: request tracing, verbose debugging, temporary logs
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info level - always logs
   * Use for: startup messages, important state changes, successful operations
   */
  info: (...args) => {
    console.log('[INFO]', ...args);
  },

  /**
   * Warn level - always logs
   * Use for: missing optional config, deprecation notices, recoverable issues
   */
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error level - always logs
   * Use for: errors, exceptions, failed operations
   */
  error: (...args) => {
    console.error('[ERROR]', ...args);
  }
};

module.exports = logger;
