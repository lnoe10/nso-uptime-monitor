/**
 * UptimeRobot Sync Script
 * 
 * Fetches monitoring data from UptimeRobot for sites that can't be
 * checked directly (due to bot protection, geo-blocking, etc.) and
 * syncs the results to Supabase.
 * 
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx UPTIMEROBOT_API_KEY=xxx node src/uptimerobot-sync.js
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const uptimeRobotApiKey = process.env.UPTIMEROBOT_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
  process.exit(1);
}

if (!uptimeRobotApiKey) {
  console.error('Error: UPTIMEROBOT_API_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapping of UptimeRobot friendly names to country codes
// UptimeRobot monitor names should match these keys
const MONITOR_NAME_TO_COUNTRY_CODE = {
  'Afghanistan': 'AFG',
  'Angola': 'AGO',
  'Armenia': 'ARM',
  'Bosnia & Herzegovina': 'BIH',
  'Bosnia and Herzegovina': 'BIH',
  'Guyana': 'GUY',
  'Iran': 'IRN',
  'Kosovo': 'XKX',
  'Kuwait': 'KWT',
  'Portugal': 'PRT',
  'Romania': 'ROU',
  'San Marino': 'SMR',
  'Syria': 'SYR',
  'Ukraine': 'UKR',
  'Algeria': 'DZA',
  'Antigua & Barbuda': 'ATG',
  'Antigua and Barbuda': 'ATG',
  'China': 'CHN',
  'Kenya': 'KEN',
  'Lebanon': 'LBN',
  'Liberia': 'LBR',
  'Libya': 'LBY',
  'Mongolia': 'MNG',
  'Mozambique': 'MOZ',
  'Qatar': 'QAT',
  'Russia': 'RUS',
  'Senegal': 'SEN',
  'Solomon Islands': 'SLB',
  'Vanuatu': 'VUT',
  'Vietnam': 'VNM',
};

/**
 * Fetch monitors from UptimeRobot API
 */
async function fetchUptimeRobotMonitors() {
  const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: uptimeRobotApiKey,
      format: 'json',
      logs: 1,
      logs_limit: 1,
      response_times: 1,
      response_times_limit: 1,
    }),
  });

  const data = await response.json();
  
  if (data.stat !== 'ok') {
    throw new Error(`UptimeRobot API error: ${JSON.stringify(data)}`);
  }

  return data.monitors;
}

/**
 * Convert UptimeRobot status to boolean
 * Status codes: 0 = paused, 1 = not checked yet, 2 = up, 8 = seems down, 9 = down
 */
function isUp(status) {
  return status === 2;
}

/**
 * Main sync function
 */
async function syncUptimeRobotData() {
  console.log('═'.repeat(60));
  console.log('UptimeRobot Sync');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('═'.repeat(60));

  try {
    // Fetch site IDs from Supabase
    console.log('\nFetching site IDs from Supabase...');
    const { data: sites, error: sitesError } = await supabase
      .from('nso_sites')
      .select('id, country, country_code')
      .in('country_code', Object.values(MONITOR_NAME_TO_COUNTRY_CODE));

    if (sitesError) throw sitesError;

    // Create lookup by country code
    const sitesByCode = {};
    sites.forEach(site => {
      sitesByCode[site.country_code] = site;
    });

    console.log(`Found ${sites.length} matching sites in database.`);

    // Fetch UptimeRobot monitors
    console.log('\nFetching monitors from UptimeRobot...');
    const monitors = await fetchUptimeRobotMonitors();
    console.log(`Found ${monitors.length} monitors in UptimeRobot.`);

    // Process each monitor
    const results = [];
    const now = new Date().toISOString();

    console.log('\nProcessing monitors:');
    for (const monitor of monitors) {
      const countryCode = MONITOR_NAME_TO_COUNTRY_CODE[monitor.friendly_name];
      
      if (!countryCode) {
        console.log(`  ⚠ Skipping "${monitor.friendly_name}" - no country mapping`);
        continue;
      }

      const site = sitesByCode[countryCode];
      if (!site) {
        console.log(`  ⚠ Skipping "${monitor.friendly_name}" - country code ${countryCode} not in database`);
        continue;
      }

      const status = isUp(monitor.status);
      const responseTime = monitor.response_times?.[0]?.value || null;
      
      const statusIcon = status ? '✓' : '✗';
      console.log(`  ${statusIcon} ${monitor.friendly_name} (${responseTime ? responseTime + 'ms' : 'N/A'})`);

      results.push({
        site_id: site.id,
        checked_at: now,
        status_code: status ? 200 : null,
        response_time_ms: responseTime,
        is_up: status,
        error_message: status ? null : `UptimeRobot status: ${monitor.status}`,
        check_type: 'uptimerobot',
      });
    }

    // Insert results into Supabase
    if (results.length > 0) {
      console.log(`\nSaving ${results.length} results to database...`);
      const { error: insertError } = await supabase
        .from('uptime_checks')
        .insert(results);

      if (insertError) throw insertError;
      console.log('Results saved successfully.');
    } else {
      console.log('\nNo results to save.');
    }

    // Summary
    const up = results.filter(r => r.is_up).length;
    const down = results.filter(r => !r.is_up).length;

    console.log('\n' + '═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Monitors synced: ${results.length}`);
    console.log(`Up: ${up}`);
    console.log(`Down: ${down}`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
syncUptimeRobotData();
