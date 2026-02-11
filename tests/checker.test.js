/**
 * Tests for error handling utility functions
 */

const { isRetryableError, formatError } = require('../src/utils/errors');

describe('isRetryableError', () => {
  test('returns true for ECONNRESET', () => {
    const error = new Error('connect ECONNRESET 192.168.1.1:443');
    expect(isRetryableError(error)).toBe(true);
  });

  test('returns true for ETIMEDOUT', () => {
    const error = new Error('connect ETIMEDOUT 192.168.1.1:443');
    expect(isRetryableError(error)).toBe(true);
  });

  test('returns true for ENOTFOUND', () => {
    const error = new Error('getaddrinfo ENOTFOUND example.com');
    expect(isRetryableError(error)).toBe(true);
  });

  test('returns true for EAI_AGAIN', () => {
    const error = new Error('getaddrinfo EAI_AGAIN example.com');
    expect(isRetryableError(error)).toBe(true);
  });

  test('returns true for ECONNREFUSED', () => {
    const error = new Error('connect ECONNREFUSED 192.168.1.1:443');
    expect(isRetryableError(error)).toBe(true);
  });

  test('returns false for other errors', () => {
    const error = new Error('Some other error');
    expect(isRetryableError(error)).toBe(false);
  });

  test('returns false for HTTP errors', () => {
    const error = new Error('HTTP 500 Internal Server Error');
    expect(isRetryableError(error)).toBe(false);
  });

  test('handles error without message', () => {
    const error = new Error();
    error.message = undefined;
    expect(isRetryableError(error)).toBe(false);
  });

  test('handles null/undefined error', () => {
    expect(isRetryableError({})).toBe(false);
    expect(isRetryableError({ message: null })).toBe(false);
  });
});

describe('formatError', () => {
  test('returns "Request timeout" for AbortError', () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    expect(formatError(error)).toBe('Request timeout');
  });

  test('returns error message for normal errors', () => {
    const error = new Error('Connection refused');
    expect(formatError(error)).toBe('Connection refused');
  });

  test('truncates long error messages to 255 characters', () => {
    const longMessage = 'A'.repeat(300);
    const error = new Error(longMessage);
    const result = formatError(error);
    expect(result.length).toBe(255);
    expect(result).toBe('A'.repeat(255));
  });

  test('keeps short messages intact', () => {
    const error = new Error('Short error');
    expect(formatError(error)).toBe('Short error');
  });

  test('handles error without message', () => {
    const error = new Error();
    const result = formatError(error);
    expect(typeof result).toBe('string');
  });

  test('uses toString for errors without message property', () => {
    const error = { toString: () => 'Custom error string' };
    expect(formatError(error)).toBe('Custom error string');
  });
});
