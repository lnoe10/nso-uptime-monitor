/**
 * NSO Uptime Checker
 * 
 * This script checks the availability of all NSO websites and stores
 * the results in Supabase. Run via GitHub Actions or manually.
 * 
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node src/checker.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

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
        });
      } else {
        throw headError;
      }
    }
    
    clearTimeout(timeout);
    
    const responseTime = Date.now() - startTime;
    const isUp = response.status >= 200 && response.status < 400;
    
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
 * Check if error is retryable
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
 * Format error message for storage
 */
function formatError(error) {
  if (error.name === 'AbortError') {
    return 'Request timeout';
  }
  // Truncate long error messages
  const msg = error.message || error.toString();
  return msg.substring(0, 255);
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
        console.log(`  ${status} ${site.country} (${time})`);
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
    
    // Run checks
    const results = await checkAllSites(sites);
    
    // Insert results into database
    console.log('Saving results to database...');
    const { error: insertError } = await supabase
      .from('uptime_checks')
      .insert(results);
    
    if (insertError) {
      throw new Error(`Failed to save results: ${insertError.message}`);
    }
    
    // Generate and display summary
    const summary = generateSummary(results, sites);
    
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

// Run
main();
