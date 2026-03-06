/**
 * Browser-based fallback checker for bot-protected sites.
 *
 * Some NSO sites use captchas or aggressive bot protection that blocks
 * fetch-based requests. This module uses Playwright (headless Chromium)
 * to re-check those sites after the initial fetch pass.
 */

// Hostnames that need a browser-based check
const BROWSER_CHECK_HOSTS = new Set([
  'bhas.gov.ba',            // Bosnia - bot protection / captcha
  'www.ine.pt',             // Portugal - access denied
  'statisticsguyana.gov.gy', // Guyana - bot protection
  'www.armstat.am',         // Armenia - bot protection
  'ask.rks-gov.net',        // Kosovo - bot protection
  'www.csb.gov.kw',         // Kuwait - bot protection
  'www.statistics.gov.rw',  // Rwanda - bot protection
  'statistics.gov.ag',      // Antigua and Barbuda - bot protection
  'www.ansd.sn',            // Senegal - bot protection
  'www.statistics.gov.sb',  // Solomon Islands - bot protection
  'vbos.gov.vu',            // Vanuatu - bot protection
  'www.ine.gov.ao',         // Angola - bot protection
  'stats.gov.ck',           // Cook Islands - bot protection
  'www.ubos.org',           // Uganda - slow load, bot protection
  'rosstat.gov.ru',         // Russia - SSL cert issue + bot protection
  'www.bbs.gov.bd',         // Bangladesh - bot protection
  'www.statistica.sm',      // San Marino - bot protection
]);

/**
 * Check if a URL belongs to a host that needs browser-based checking.
 */
function needsBrowserCheck(url) {
  try {
    return BROWSER_CHECK_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

// Phrases in body text that indicate the page is blocked, not truly up
const BLOCK_PHRASES = [
  'access denied',
  '403 forbidden',
  'captcha',
  'please verify you are a human',
  'blocked',
  'robot check',
];

/**
 * Try to load Playwright. Returns the module or null if unavailable.
 */
function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    return null;
  }
}

/**
 * Re-check bot-protected sites using a headless browser.
 *
 * @param {Array} fetchResults - Results from the fetch-based checker
 * @param {Array} sites - Full site objects (with id, url, country, etc.)
 * @returns {Array} Merged results with browser check overrides
 */
async function recheckWithBrowser(fetchResults, sites) {
  const browserSites = sites.filter(s => needsBrowserCheck(s.url));
  if (browserSites.length === 0) return fetchResults;

  const pw = loadPlaywright();
  if (!pw) {
    console.log('\n⚠ Playwright not installed — skipping browser checks');
    return fetchResults;
  }

  let browser;
  try {
    console.log(`\nBrowser re-check: launching Chromium for ${browserSites.length} sites...`);
    browser = await pw.chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    for (const site of browserSites) {
      const resultIndex = fetchResults.findIndex(r => r.site_id === site.id);
      if (resultIndex === -1) continue;

      try {
        const startTime = Date.now();
        const response = await page.goto(site.url, {
          waitUntil: 'commit',
          timeout: 30000,
        });
        const responseTime = Date.now() - startTime;

        const status = response ? response.status() : 0;
        const statusOk = status >= 200 && status < 400;

        // Check for block phrases in visible body text
        let blocked = false;
        try {
          const bodyText = await page.evaluate(() =>
            document.body ? document.body.innerText.toLowerCase() : ''
          );
          blocked = BLOCK_PHRASES.some(phrase => bodyText.includes(phrase));
        } catch {
          // If we can't read body, don't flag as blocked
        }

        const isUp = statusOk && !blocked;
        const tag = isUp ? '✓' : '✗';
        const reason = blocked ? ' (blocked content detected)' : '';
        console.log(`  ${tag} ${site.country} — Browser HTTP ${status}, ${responseTime}ms${reason}`);

        fetchResults[resultIndex] = {
          site_id: site.id,
          status_code: status,
          response_time_ms: responseTime,
          is_up: isUp,
          error_message: isUp ? null : `Browser: HTTP ${status}${reason}`,
          check_type: 'scheduled',
        };
      } catch (err) {
        const responseTime = Date.now();
        console.log(`  ✗ ${site.country} — Browser error: ${err.message}`);

        fetchResults[resultIndex] = {
          site_id: site.id,
          status_code: null,
          response_time_ms: null,
          is_up: false,
          error_message: `Browser: ${err.message}`.slice(0, 255),
          check_type: 'scheduled',
        };
      }
    }

    await browser.close();
  } catch (err) {
    console.error(`\n⚠ Browser check failed: ${err.message}`);
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }

  return fetchResults;
}

module.exports = { BROWSER_CHECK_HOSTS, needsBrowserCheck, recheckWithBrowser };
