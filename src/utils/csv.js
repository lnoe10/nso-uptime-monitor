/**
 * CSV parsing and normalization utilities
 */

/**
 * Parse CSV content into array of objects
 */
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  return lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));

    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
}

/**
 * Normalize URL - add protocol, remove trailing slashes
 */
function normalizeUrl(url) {
  if (!url) return null;

  // Remove whitespace
  url = url.trim();

  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Remove trailing slash
  url = url.replace(/\/+$/, '');

  return url;
}

/**
 * Map region names to consistent format
 */
function normalizeRegion(region) {
  const regionMap = {
    'africa': 'Africa',
    'asia': 'Asia',
    'europe': 'Europe',
    'north america': 'Americas',
    'south america': 'Americas',
    'americas': 'Americas',
    'oceania': 'Oceania',
    'middle east': 'Asia',
    'caribbean': 'Americas',
    'central america': 'Americas',
    'latin america': 'Americas',
  };

  const normalized = region?.toLowerCase().trim();
  return regionMap[normalized] || region || 'Unknown';
}

module.exports = {
  parseCSV,
  normalizeUrl,
  normalizeRegion,
};
