/**
 * Statistics calculation utilities
 */

/**
 * Calculate statistics from site data
 */
function calculateStats(sites) {
  const total = sites.length;
  const up = sites.filter(s => s.current_status === true).length;
  const down = sites.filter(s => s.current_status === false).length;
  const unknown = sites.filter(s => s.current_status === null).length;

  const sitesWithUptime24h = sites.filter(s => s.uptime_24h !== null);
  const avgUptime24h = sitesWithUptime24h.length > 0
    ? sitesWithUptime24h.reduce((sum, s) => sum + parseFloat(s.uptime_24h), 0) / sitesWithUptime24h.length
    : 0;

  const sitesWithUptime7d = sites.filter(s => s.uptime_7d !== null);
  const avgUptime7d = sitesWithUptime7d.length > 0
    ? sitesWithUptime7d.reduce((sum, s) => sum + parseFloat(s.uptime_7d), 0) / sitesWithUptime7d.length
    : 0;

  return { total, up, down, unknown, avgUptime24h, avgUptime7d };
}

/**
 * Group sites by region
 */
function groupByRegion(sites) {
  const byRegion = {};
  sites.forEach(site => {
    if (!byRegion[site.region]) {
      byRegion[site.region] = { total: 0, up: 0, down: 0 };
    }
    byRegion[site.region].total++;
    if (site.current_status === true) byRegion[site.region].up++;
    if (site.current_status === false) byRegion[site.region].down++;
  });
  return byRegion;
}

module.exports = {
  calculateStats,
  groupByRegion,
};
