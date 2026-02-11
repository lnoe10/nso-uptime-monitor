/**
 * Tests for statistics utility functions
 */

const { calculateStats, groupByRegion } = require('../src/utils/stats');

describe('calculateStats', () => {
  test('calculates correct stats for all sites up', () => {
    const sites = [
      { current_status: true, uptime_24h: '100', uptime_7d: '100' },
      { current_status: true, uptime_24h: '100', uptime_7d: '100' },
      { current_status: true, uptime_24h: '100', uptime_7d: '100' },
    ];

    const stats = calculateStats(sites);

    expect(stats.total).toBe(3);
    expect(stats.up).toBe(3);
    expect(stats.down).toBe(0);
    expect(stats.unknown).toBe(0);
    expect(stats.avgUptime24h).toBe(100);
    expect(stats.avgUptime7d).toBe(100);
  });

  test('calculates correct stats for mixed status', () => {
    const sites = [
      { current_status: true, uptime_24h: '95', uptime_7d: '90' },
      { current_status: false, uptime_24h: '80', uptime_7d: '75' },
      { current_status: null, uptime_24h: null, uptime_7d: null },
    ];

    const stats = calculateStats(sites);

    expect(stats.total).toBe(3);
    expect(stats.up).toBe(1);
    expect(stats.down).toBe(1);
    expect(stats.unknown).toBe(1);
    expect(stats.avgUptime24h).toBe(87.5); // (95 + 80) / 2
    expect(stats.avgUptime7d).toBe(82.5); // (90 + 75) / 2
  });

  test('handles empty array', () => {
    const stats = calculateStats([]);

    expect(stats.total).toBe(0);
    expect(stats.up).toBe(0);
    expect(stats.down).toBe(0);
    expect(stats.unknown).toBe(0);
    expect(stats.avgUptime24h).toBe(0);
    expect(stats.avgUptime7d).toBe(0);
  });

  test('handles all sites with null uptime', () => {
    const sites = [
      { current_status: true, uptime_24h: null, uptime_7d: null },
      { current_status: true, uptime_24h: null, uptime_7d: null },
    ];

    const stats = calculateStats(sites);

    expect(stats.total).toBe(2);
    expect(stats.up).toBe(2);
    expect(stats.avgUptime24h).toBe(0);
    expect(stats.avgUptime7d).toBe(0);
  });

  test('correctly excludes null uptimes from average', () => {
    const sites = [
      { current_status: true, uptime_24h: '100', uptime_7d: '100' },
      { current_status: true, uptime_24h: null, uptime_7d: '80' },
      { current_status: true, uptime_24h: '90', uptime_7d: null },
    ];

    const stats = calculateStats(sites);

    expect(stats.avgUptime24h).toBe(95); // (100 + 90) / 2
    expect(stats.avgUptime7d).toBe(90); // (100 + 80) / 2
  });

  test('handles string uptime values', () => {
    const sites = [
      { current_status: true, uptime_24h: '99.5', uptime_7d: '98.75' },
    ];

    const stats = calculateStats(sites);

    expect(stats.avgUptime24h).toBe(99.5);
    expect(stats.avgUptime7d).toBe(98.75);
  });
});

describe('groupByRegion', () => {
  test('groups sites by region correctly', () => {
    const sites = [
      { region: 'Africa', current_status: true },
      { region: 'Africa', current_status: false },
      { region: 'Europe', current_status: true },
      { region: 'Europe', current_status: true },
      { region: 'Asia', current_status: null },
    ];

    const result = groupByRegion(sites);

    expect(result.Africa).toEqual({ total: 2, up: 1, down: 1 });
    expect(result.Europe).toEqual({ total: 2, up: 2, down: 0 });
    expect(result.Asia).toEqual({ total: 1, up: 0, down: 0 });
  });

  test('returns empty object for empty array', () => {
    const result = groupByRegion([]);
    expect(result).toEqual({});
  });

  test('handles single region', () => {
    const sites = [
      { region: 'Americas', current_status: true },
      { region: 'Americas', current_status: true },
      { region: 'Americas', current_status: false },
    ];

    const result = groupByRegion(sites);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result.Americas).toEqual({ total: 3, up: 2, down: 1 });
  });

  test('counts null status as neither up nor down', () => {
    const sites = [
      { region: 'Oceania', current_status: null },
      { region: 'Oceania', current_status: null },
    ];

    const result = groupByRegion(sites);

    expect(result.Oceania).toEqual({ total: 2, up: 0, down: 0 });
  });
});
