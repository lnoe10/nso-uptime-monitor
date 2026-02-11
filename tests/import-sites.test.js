/**
 * Tests for CSV parsing utility functions
 */

const { parseCSV, normalizeUrl, normalizeRegion } = require('../src/utils/csv');

describe('parseCSV', () => {
  test('parses basic CSV with headers', () => {
    const csv = `country,region,url
United States,Americas,https://census.gov
Canada,Americas,https://statcan.gc.ca`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      country: 'United States',
      region: 'Americas',
      url: 'https://census.gov',
    });
    expect(result[1]).toEqual({
      country: 'Canada',
      region: 'Americas',
      url: 'https://statcan.gc.ca',
    });
  });

  test('handles quoted fields containing commas', () => {
    const csv = `country,organization,url
"Korea, Republic of","Statistics Korea",https://kostat.go.kr`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].country).toBe('Korea, Republic of');
    expect(result[0].organization).toBe('Statistics Korea');
  });

  test('handles empty fields', () => {
    const csv = `country,region,notes
Germany,Europe,
France,Europe,Some notes`;

    const result = parseCSV(csv);

    expect(result[0].notes).toBe('');
    expect(result[1].notes).toBe('Some notes');
  });

  test('trims whitespace from values', () => {
    const csv = `country,region
  United States  ,  Americas  `;

    const result = parseCSV(csv);

    expect(result[0].country).toBe('United States');
    expect(result[0].region).toBe('Americas');
  });

  test('handles missing trailing fields', () => {
    const csv = `country,region,url,notes
Germany,Europe,https://destatis.de`;

    const result = parseCSV(csv);

    expect(result[0].notes).toBe('');
  });
});

describe('normalizeUrl', () => {
  test('adds https:// when protocol is missing', () => {
    expect(normalizeUrl('census.gov')).toBe('https://census.gov');
    expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
  });

  test('keeps existing http:// protocol', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  test('keeps existing https:// protocol', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  test('removes trailing slashes', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
    expect(normalizeUrl('https://example.com///')).toBe('https://example.com');
  });

  test('returns null for empty input', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl(null)).toBeNull();
    expect(normalizeUrl(undefined)).toBeNull();
  });

  test('trims whitespace', () => {
    expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com');
  });
});

describe('normalizeRegion', () => {
  test('maps north america to Americas', () => {
    expect(normalizeRegion('north america')).toBe('Americas');
    expect(normalizeRegion('North America')).toBe('Americas');
    expect(normalizeRegion('NORTH AMERICA')).toBe('Americas');
  });

  test('maps south america to Americas', () => {
    expect(normalizeRegion('south america')).toBe('Americas');
    expect(normalizeRegion('latin america')).toBe('Americas');
    expect(normalizeRegion('caribbean')).toBe('Americas');
  });

  test('maps middle east to Asia', () => {
    expect(normalizeRegion('middle east')).toBe('Asia');
  });

  test('keeps already normalized regions', () => {
    expect(normalizeRegion('Africa')).toBe('Africa');
    expect(normalizeRegion('Europe')).toBe('Europe');
    expect(normalizeRegion('Asia')).toBe('Asia');
    expect(normalizeRegion('Oceania')).toBe('Oceania');
  });

  test('returns unknown region as-is', () => {
    expect(normalizeRegion('Antarctica')).toBe('Antarctica');
    expect(normalizeRegion('Unknown Region')).toBe('Unknown Region');
  });

  test('returns Unknown for null/undefined', () => {
    expect(normalizeRegion(null)).toBe('Unknown');
    expect(normalizeRegion(undefined)).toBe('Unknown');
    expect(normalizeRegion('')).toBe('Unknown');
  });
});
