/**
 * Error handling utilities
 */

/**
 * Check if error is retryable (transient network errors)
 */
function isRetryableError(error) {
  const retryableErrors = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ECONNREFUSED',
  ];
  return retryableErrors.some(code => error.message?.includes(code));
}

/**
 * Format error message for storage (truncate long messages)
 */
function formatError(error) {
  if (error.name === 'AbortError') {
    return 'Request timeout';
  }
  // Truncate long error messages
  const msg = error.message || error.toString();
  return msg.substring(0, 255);
}

module.exports = {
  isRetryableError,
  formatError,
};
