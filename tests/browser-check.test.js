/**
 * Tests for browser-check module
 */

const { BROWSER_CHECK_HOSTS, needsBrowserCheck, recheckWithBrowser } = require('../src/browser-check');

// Mock Playwright so no real browser launches during tests.
// { virtual: true } allows mocking modules that aren't installed.
jest.mock('playwright', () => null, { virtual: true });

describe('BROWSER_CHECK_HOSTS', () => {
  test('is a Set', () => {
    expect(BROWSER_CHECK_HOSTS).toBeInstanceOf(Set);
  });

  test('contains only lowercase hostnames', () => {
    for (const host of BROWSER_CHECK_HOSTS) {
      expect(host).toBe(host.toLowerCase());
      expect(host).not.toContain('://');
      expect(host).not.toContain('/');
    }
  });

  test('contains the expected hosts', () => {
    expect(BROWSER_CHECK_HOSTS.has('bhas.gov.ba')).toBe(true);
    expect(BROWSER_CHECK_HOSTS.has('www.ine.pt')).toBe(true);
    expect(BROWSER_CHECK_HOSTS.has('statisticsguyana.gov.gy')).toBe(true);
  });
});

describe('needsBrowserCheck', () => {
  test('returns true for known browser-check hosts', () => {
    expect(needsBrowserCheck('https://bhas.gov.ba/')).toBe(true);
    expect(needsBrowserCheck('https://www.ine.pt/some/path')).toBe(true);
    expect(needsBrowserCheck('http://statisticsguyana.gov.gy')).toBe(true);
  });

  test('returns false for unknown hosts', () => {
    expect(needsBrowserCheck('https://example.com')).toBe(false);
    expect(needsBrowserCheck('https://www.google.com')).toBe(false);
  });

  test('returns false for invalid URLs', () => {
    expect(needsBrowserCheck('')).toBe(false);
    expect(needsBrowserCheck('not-a-url')).toBe(false);
    expect(needsBrowserCheck(null)).toBe(false);
    expect(needsBrowserCheck(undefined)).toBe(false);
  });
});

describe('recheckWithBrowser', () => {
  const mockSites = [
    { id: 1, url: 'https://example.com', country: 'Testland' },
    { id: 2, url: 'https://bhas.gov.ba/', country: 'Bosnia' },
  ];

  const mockFetchResults = [
    { site_id: 1, status_code: 200, response_time_ms: 100, is_up: true, error_message: null, check_type: 'scheduled' },
    { site_id: 2, status_code: 403, response_time_ms: 200, is_up: true, error_message: null, check_type: 'scheduled' },
  ];

  test('returns original results when Playwright is not installed', async () => {
    const results = await recheckWithBrowser([...mockFetchResults], mockSites);
    expect(results).toEqual(mockFetchResults);
  });

  test('returns original results when no sites need browser check', async () => {
    const sitesNoBrowser = [
      { id: 1, url: 'https://example.com', country: 'Testland' },
      { id: 3, url: 'https://other.org', country: 'Otherland' },
    ];
    const resultsNoBrowser = [
      { site_id: 1, status_code: 200, response_time_ms: 100, is_up: true, error_message: null, check_type: 'scheduled' },
      { site_id: 3, status_code: 200, response_time_ms: 150, is_up: true, error_message: null, check_type: 'scheduled' },
    ];

    const results = await recheckWithBrowser([...resultsNoBrowser], sitesNoBrowser);
    expect(results).toEqual(resultsNoBrowser);
  });

  test('does not modify results for non-browser-check sites', async () => {
    const results = await recheckWithBrowser([...mockFetchResults], mockSites);
    expect(results[0]).toEqual(mockFetchResults[0]);
  });
});
