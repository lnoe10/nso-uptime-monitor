/**
 * NSO Uptime Checker
 * 
 * This script checks the availability of all NSO websites and stores
 * the results in Supabase. Run via GitHub Actions or manually.
 * 
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node src/checker.js
 */

const { supabase } = require('./supabase');
const fs = require('fs');
const path = require('path');
const { Agent } = require('undici');
const { isRetryableError, formatError } = require('./utils/errors');
const { recheckWithBrowser, needsBrowserCheck } = require('./browser-check');

// Configuration
const config = {
  // Request timeout in milliseconds
  checkTimeout: parseInt(process.env.CHECK_TIMEOUT) || 30000,

  // Number of concurrent checks
  batchSize: parseInt(process.env.BATCH_SIZE) || 10,

  // Delay between batches (ms) - be nice to servers
  batchDelay: parseInt(process.env.BATCH_DELAY) || 1000,

  // User agent for requests
  userAgent: process.env.USER_AGENT || 'NSO-Uptime-Monitor/1.0 (https://opendatawatch.com; contact@opendatawatch.com)',

  // Retry failed checks
  maxRetries: parseInt(process.env.MAX_RETRIES) || 1,
  retryDelay: parseInt(process.env.RETRY_DELAY) || 5000,
};

// Hosts that require SSL certificate verification bypass
const SSL_BYPASS_HOSTS = new Set([
  'nsia.gov.af',         // Afghanistan - SSL error + SPA (root URL returns 200)
  'www.knbs.or.ke',      // Kenya - UNABLE_TO_VERIFY_LEAF_SIGNATURE
  'www.lisgis.gov.lr',   // Liberia - ERR_TLS_CERT_ALTNAME_INVALID
  '1212.mn',             // Mongolia - UNABLE_TO_VERIFY_LEAF_SIGNATURE
  'www.ine.gov.mz',      // Mozambique - UNABLE_TO_VERIFY_LEAF_SIGNATURE
  'rosstat.gov.ru',      // Russia - UNABLE_TO_VERIFY_LEAF_SIGNATURE
  'www.nso.gov.vn',      // Vietnam - UNABLE_TO_VERIFY_LEAF_SIGNATURE
]);

// Hosts monitored exclusively by UptimeRobot — skip DB insert to avoid overwriting their results
const UPTIMEROBOT_ONLY_HOSTS = new Set([
  'www.ons.dz',  // Algeria - returns HTTP 500 to headless browsers
  'insse.ro',    // Romania - drops connections from GitHub's IP range
]);

const insecureDispatcher = new Agent({
  connect: { rejectUnauthorized: false },
});

function getDispatcher(url) {
  try {
    return SSL_BYPASS_HOSTS.has(new URL(url).hostname) ? insecureDispatcher : undefined;
  } catch {
    return undefined;
  }
}

// Logs directory (created when needed)
const logsDir = path.join(__dirname, '..', 'logs');

/**
 * Check if a single site is accessible
 */
async function checkSite(site, retryCount = 0) {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.checkTimeout);
    
    // Use HEAD request first (faster), fall back to GET if needed
    let response;
    try {
      response = await fetch(site.url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': config.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
        dispatcher: getDispatcher(site.url),
      });
    } catch (headError) {
      // Some servers don't support HEAD, try GET
      if (headError.name !== 'AbortError') {
        response = await fetch(site.url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': config.userAgent,
            'Accept': 'text/html,application/xhtml+xml',
          },
          redirect: 'follow',
          dispatcher: getDispatcher(site.url),
        });
      } else {
        throw headError;
      }
    }
    
    clearTimeout(timeout);
    
    const responseTime = Date.now() - startTime;
    
    // Count 2xx, 3xx as up, and also 403 (bot protection indicates a working site)
    const isUp = (response.status >= 200 && response.status < 400) || response.status === 403;

    // If SSL bypass was used and the site is up, probe with normal SSL to detect fixed certs
    if (isUp && getDispatcher(site.url)) {
      try {
        const probeController = new AbortController();
        const probeTimeout = setTimeout(() => probeController.abort(), 10000);
        await fetch(site.url, {
          method: 'HEAD',
          signal: probeController.signal,
          headers: { 'User-Agent': config.userAgent },
          redirect: 'follow',
        });
        clearTimeout(probeTimeout);
        console.log(`  ℹ [SSL bypass] ${site.country} — certificate now valid, bypass may be removable`);
      } catch {
        // SSL still broken — bypass is still needed, nothing to report
      }
    }

    return {
      site_id: site.id,
      status_code: response.status,
      response_time_ms: responseTime,
      is_up: isUp,
      error_message: isUp ? null : `HTTP ${response.status}`,
      check_type: 'scheduled',
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Retry logic for transient errors
    if (retryCount < config.maxRetries && isRetryableError(error)) {
      console.log(`  ⟳ Retrying ${site.country} (${retryCount + 1}/${config.maxRetries})...`);
      await sleep(config.retryDelay);
      return checkSite(site, retryCount + 1);
    }
    
    return {
      site_id: site.id,
      status_code: null,
      response_time_ms: responseTime,
      is_up: false,
      error_message: formatError(error),
      check_type: 'scheduled',
    };
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process sites in batches
 */
async function checkAllSites(sites) {
  const results = [];
  const totalSites = sites.length;
  let processed = 0;
  
  console.log(`\nChecking ${totalSites} sites in batches of ${config.batchSize}...\n`);
  
  for (let i = 0; i < totalSites; i += config.batchSize) {
    const batch = sites.slice(i, i + config.batchSize);
    const batchNumber = Math.floor(i / config.batchSize) + 1;
    const totalBatches = Math.ceil(totalSites / config.batchSize);
    
    console.log(`Batch ${batchNumber}/${totalBatches}:`);
    
    const batchResults = await Promise.all(
      batch.map(async (site) => {
        const result = await checkSite(site);
        const status = result.is_up ? '✓' : '✗';
        const time = result.response_time_ms ? `${result.response_time_ms}ms` : 'N/A';
        const sslTag = getDispatcher(site.url) ? ' [SSL bypass]' : '';
        console.log(`  ${status} ${site.country} (${time})${sslTag}`);
        return result;
      })
    );
    
    results.push(...batchResults);
    processed += batch.length;
    
    // Progress update
    const percent = Math.round((processed / totalSites) * 100);
    console.log(`  Progress: ${processed}/${totalSites} (${percent}%)\n`);
    
    // Delay between batches
    if (i + config.batchSize < totalSites) {
      await sleep(config.batchDelay);
    }
  }
  
  return results;
}

/**
 * Generate summary statistics
 */
function generateSummary(results, sites) {
  const up = results.filter(r => r.is_up).length;
  const down = results.filter(r => !r.is_up).length;
  const avgResponseTime = Math.round(
    results
      .filter(r => r.is_up && r.response_time_ms)
      .reduce((sum, r) => sum + r.response_time_ms, 0) /
    results.filter(r => r.is_up && r.response_time_ms).length
  ) || 0;
  
  // Group by region
  const byRegion = {};
  results.forEach((result, i) => {
    const site = sites.find(s => s.id === result.site_id);
    if (site) {
      if (!byRegion[site.region]) {
        byRegion[site.region] = { up: 0, down: 0 };
      }
      if (result.is_up) {
        byRegion[site.region].up++;
      } else {
        byRegion[site.region].down++;
      }
    }
  });
  
  // Get down sites for report
  const downSites = results
    .filter(r => !r.is_up)
    .map(r => {
      const site = sites.find(s => s.id === r.site_id);
      return {
        country: site?.country || 'Unknown',
        url: site?.url || 'Unknown',
        error: r.error_message,
      };
    });
  
  return {
    timestamp: new Date().toISOString(),
    total: results.length,
    up,
    down,
    uptimePercent: ((up / results.length) * 100).toFixed(2),
    avgResponseTime,
    byRegion,
    downSites,
  };
}

/**
 * Main function
 */
async function main() {
  const startTime = Date.now();
  console.log('═'.repeat(60));
  console.log('NSO Uptime Monitor');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('═'.repeat(60));

  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  try {
    // Fetch all active sites
    console.log('\nFetching sites from database...');
    const { data: sites, error: fetchError } = await supabase
      .from('nso_sites')
      .select('*')
      .eq('is_active', true)
      .order('country');
    
    if (fetchError) {
      throw new Error(`Failed to fetch sites: ${fetchError.message}`);
    }
    
    if (!sites || sites.length === 0) {
      console.log('No active sites found in database.');
      console.log('Run `npm run import-sites` to import NSO sites.');
      return;
    }
    
    console.log(`Found ${sites.length} active sites.`);

    // Log SSL bypass hosts
    const bypassSites = sites.filter(s => {
      try { return SSL_BYPASS_HOSTS.has(new URL(s.url).hostname); } catch { return false; }
    });
    if (bypassSites.length > 0) {
      console.log(`\nSSL bypass enabled for ${bypassSites.length} sites:`);
      bypassSites.forEach(s => console.log(`  → ${s.country}: ${s.url}`));
    }

    // Log browser check hosts
    const browserSites = sites.filter(s => needsBrowserCheck(s.url));
    if (browserSites.length > 0) {
      console.log(`\nBrowser check enabled for ${browserSites.length} sites:`);
      browserSites.forEach(s => console.log(`  → ${s.country}: ${s.url}`));
    }

    // Run checks
    const results = await checkAllSites(sites);
    
    // Re-check bot-protected sites with headless browser
    const finalResults = await recheckWithBrowser(results, sites);

    // Exclude sites handled exclusively by UptimeRobot
    const resultsToInsert = finalResults.filter(r => {
      const site = sites.find(s => s.id === r.site_id);
      try { return !UPTIMEROBOT_ONLY_HOSTS.has(new URL(site?.url).hostname); } catch { return true; }
    });

    // Insert results into database
    console.log('Saving results to database...');
    const { error: insertError } = await supabase
      .from('uptime_checks')
      .insert(resultsToInsert);

    if (insertError) {
      throw new Error(`Failed to save results: ${insertError.message}`);
    }

    // Generate and display summary
    const summary = generateSummary(resultsToInsert, sites);
    
    console.log('\n' + '═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total Sites:     ${summary.total}`);
    console.log(`Operational:     ${summary.up} (${summary.uptimePercent}%)`);
    console.log(`Down:            ${summary.down}`);
    console.log(`Avg Response:    ${summary.avgResponseTime}ms`);
    
    console.log('\nBy Region:');
    Object.entries(summary.byRegion)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([region, stats]) => {
        const percent = ((stats.up / (stats.up + stats.down)) * 100).toFixed(1);
        console.log(`  ${region}: ${stats.up}/${stats.up + stats.down} up (${percent}%)`);
      });
    
    if (summary.downSites.length > 0) {
      console.log('\nDown Sites:');
      summary.downSites.forEach(site => {
        console.log(`  ✗ ${site.country}: ${site.error}`);
      });
    }
    
    // Save summary to log file
    const logFile = path.join(logsDir, `check-${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(summary, null, 2));
    console.log(`\nLog saved to: ${logFile}`);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nCompleted in ${duration}s`);
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly (not imported as module)
if (require.main === module) {
  main();
}
