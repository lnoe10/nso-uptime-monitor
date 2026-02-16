const https = require('https');
const http = require('http');

// Add your problematic URLs here
const problematicUrls = [
  'https://nsia.gov.af/home',
  'https://www.ine.gov.ao/',
  'https://www.armstat.am/',
  'https://bhas.gov.ba/',
  'https://instatgabon.org/en',
  'https://statisticsguyana.gov.gy/',
  'https://www.amar.org.ir/',
  'https://www.knbs.or.ke/',
  'https://ask.rks-gov.net/',
  'https://www.csb.gov.kw/',
  'https://www.lisgis.gov.lr/',
  'https://1212.mn/',
  'https://www.ine.gov.mz/',
  'https://www.ine.pt/',
  'https://insse.ro/',
  'https://rosstat.gov.ru/',
  'https://www.statistica.sm/pub1/StatisticaSM/',
  'http://cbssyr.sy/',
  'https://www.nso.gov.vn/'
];

// Browser-like headers
const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Connection': 'keep-alive',
};

async function diagnoseUrl(url) {
  const result = {
    url,
    timestamp: new Date().toISOString(),
    issues: [],
    recommendation: null,
  };

  // Test 1: Basic fetch with strict SSL
  try {
    const response = await fetchWithTimeout(url, { rejectUnauthorized: true });
    result.strictSslStatus = response.status;
    result.strictSslOk = true;
  } catch (error) {
    result.strictSslOk = false;
    result.strictSslError = error.code || error.message;
    
    if (error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' || 
        error.code === 'CERT_HAS_EXPIRED' ||
        error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
        error.code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
        error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
        error.code === 'ERR_TLS_CERT_ALTNAME_INVALID' ||
        error.message.includes('certificate')) {
      result.issues.push('SSL_CERTIFICATE_ERROR');
    } else if (error.code === 'ECONNREFUSED') {
      result.issues.push('CONNECTION_REFUSED');
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      result.issues.push('DNS_LOOKUP_FAILED');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT' || error.name === 'TimeoutError') {
      result.issues.push('TIMEOUT');
    } else if (error.code === 'ECONNRESET') {
      result.issues.push('CONNECTION_RESET');
    } else if (error.code === 'EHOSTUNREACH') {
      result.issues.push('HOST_UNREACHABLE');
    }
  }

  // Test 2: Fetch with relaxed SSL (if strict failed due to SSL)
  if (result.issues.includes('SSL_CERTIFICATE_ERROR')) {
    try {
      const response = await fetchWithTimeout(url, { rejectUnauthorized: false });
      result.relaxedSslStatus = response.status;
      result.relaxedSslOk = true;
    } catch (error) {
      result.relaxedSslOk = false;
      result.relaxedSslError = error.code || error.message;
    }
  }

  // Test 3: Check response body for bot detection patterns
  try {
    const response = await fetchWithTimeout(url, { 
      rejectUnauthorized: false,
      getBody: true 
    });
    
    result.finalStatus = response.status;
    result.finalHeaders = {
      server: response.headers['server'],
      'content-type': response.headers['content-type'],
    };

    const body = response.body.toLowerCase();
    
    // Check for Cloudflare
    if (body.includes('cloudflare') || 
        response.headers['server']?.includes('cloudflare')) {
      result.issues.push('CLOUDFLARE_DETECTED');
      
      if (body.includes('checking your browser') || 
          body.includes('ray id') ||
          body.includes('cf-browser-verification')) {
        result.issues.push('CLOUDFLARE_CHALLENGE');
      }
    }

    // Check for other bot detection
    if (body.includes('captcha') || body.includes('recaptcha')) {
      result.issues.push('CAPTCHA_REQUIRED');
    }

    if (body.includes('access denied') || body.includes('403 forbidden')) {
      result.issues.push('ACCESS_DENIED');
    }

    if (body.includes('blocked') || body.includes('bot detected')) {
      result.issues.push('BOT_DETECTION');
    }

    // Check for geo-blocking indicators
    if (body.includes('not available in your') ||
        (body.includes('geo') && body.includes('blocked'))) {
      result.issues.push('GEO_BLOCKING_POSSIBLE');
    }

    // Check for empty or minimal response
    if (response.body.length < 500 && response.status === 200) {
      result.issues.push('SUSPICIOUSLY_SHORT_RESPONSE');
    }

    result.bodyLength = response.body.length;
    result.bodyPreview = response.body.slice(0, 300);

  } catch (error) {
    result.bodyCheckError = error.message;
  }

  // Generate recommendation
  result.recommendation = generateRecommendation(result);

  return result;
}

function generateRecommendation(result) {
  const issues = result.issues;

  if (issues.includes('DNS_LOOKUP_FAILED')) {
    return 'SITE_UNREACHABLE: Domain does not resolve. Check if URL is correct or site is permanently down.';
  }

  if (issues.includes('CONNECTION_REFUSED')) {
    return 'SITE_DOWN: Server is not accepting connections. Likely down or blocking your IP range.';
  }

  if (issues.includes('CONNECTION_RESET') || issues.includes('HOST_UNREACHABLE')) {
    return 'SITE_UNREACHABLE: Connection was reset or host unreachable. May be down, geo-blocked, or blocking your IP.';
  }

  if (issues.includes('TIMEOUT')) {
    return 'TIMEOUT: Site is very slow or unresponsive. Consider longer timeout or may be geo-blocked.';
  }

  if (issues.includes('SSL_CERTIFICATE_ERROR') && result.relaxedSslOk) {
    return 'SSL_BYPASS: Site works with relaxed SSL. Add host to SSL_BYPASS_HOSTS in src/checker.js.';
  }

  if (issues.includes('CLOUDFLARE_CHALLENGE') || issues.includes('CAPTCHA_REQUIRED')) {
    return 'BROWSER_REQUIRED: Site has active bot protection. Use Playwright with ignoreHTTPSErrors: true.';
  }

  if (issues.includes('CLOUDFLARE_DETECTED') && result.finalStatus === 403) {
    return 'BROWSER_REQUIRED: Cloudflare is blocking requests. Use Playwright.';
  }

  if (issues.includes('ACCESS_DENIED') || issues.includes('BOT_DETECTION')) {
    return 'BROWSER_LIKELY: Getting blocked, try Playwright. If still failing, may need residential proxy.';
  }

  if (issues.includes('GEO_BLOCKING_POSSIBLE')) {
    return 'GEO_BLOCKED: May need a proxy in the target country.';
  }

  if (result.finalStatus === 200 && issues.length === 0) {
    return 'OK: Site appears to be working. Check if your crawler has different configuration.';
  }

  if (result.finalStatus >= 500) {
    return 'SERVER_ERROR: Site is returning server errors. May be temporarily down.';
  }

  return 'UNKNOWN: Manual investigation needed. Check bodyPreview for clues.';
}

function fetchWithTimeout(url, options = {}, redirectCount = 0) {
  const MAX_REDIRECTS = 10;

  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      return reject(new Error(`Too many redirects (>${MAX_REDIRECTS})`));
    }

    const timeout = options.timeout || 15000;
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: browserHeaders,
      rejectUnauthorized: options.rejectUnauthorized !== false,
      timeout: timeout,
    };

    const req = protocol.request(requestOptions, (res) => {
      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume(); // Drain the response
        const redirectUrl = new URL(res.headers.location, url).href;
        return fetchWithTimeout(redirectUrl, options, redirectCount + 1)
          .then(resolve, reject);
      }

      let body = '';

      if (options.getBody) {
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
          });
        });
      } else {
        res.resume(); // Drain the response
        resolve({
          status: res.statusCode,
          headers: res.headers,
        });
      }
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      const err = new Error('Request timed out');
      err.name = 'TimeoutError';
      reject(err);
    });

    req.end();
  });
}

async function runDiagnostics() {
  console.log('='.repeat(70));
  console.log('NSO URL Diagnostics');
  console.log('='.repeat(70));
  console.log(`Running diagnostics on ${problematicUrls.length} URLs...\n`);

  const results = [];

  for (const url of problematicUrls) {
    console.log(`Checking: ${url}`);
    try {
      const result = await diagnoseUrl(url);
      results.push(result);
      console.log(`  Status: ${result.finalStatus || 'N/A'}`);
      console.log(`  Issues: ${result.issues.length > 0 ? result.issues.join(', ') : 'None detected'}`);
      console.log(`  → ${result.recommendation}\n`);
    } catch (error) {
      console.log(`  Error: ${error.message}\n`);
      results.push({ url, error: error.message });
    }
  }

  // Summary
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const categories = {
    'SSL_BYPASS': [],
    'BROWSER_REQUIRED': [],
    'BROWSER_LIKELY': [],
    'SERVER_ERROR': [],
    'SITE_DOWN': [],
    'TIMEOUT': [],
    'GEO_BLOCKED': [],
    'OK': [],
    'OTHER': [],
  };

  for (const r of results) {
    if (!r.recommendation) {
      categories.OTHER.push(r.url);
    } else if (r.recommendation.startsWith('SSL_BYPASS')) {
      categories.SSL_BYPASS.push(r.url);
    } else if (r.recommendation.startsWith('BROWSER_REQUIRED')) {
      categories.BROWSER_REQUIRED.push(r.url);
    } else if (r.recommendation.startsWith('BROWSER_LIKELY')) {
      categories.BROWSER_LIKELY.push(r.url);
    } else if (r.recommendation.startsWith('SERVER_ERROR')) {
      categories.SERVER_ERROR.push(r.url);
    } else if (r.recommendation.startsWith('SITE_DOWN') || r.recommendation.startsWith('SITE_UNREACHABLE')) {
      categories.SITE_DOWN.push(r.url);
    } else if (r.recommendation.startsWith('TIMEOUT')) {
      categories.TIMEOUT.push(r.url);
    } else if (r.recommendation.startsWith('GEO_BLOCKED')) {
      categories.GEO_BLOCKED.push(r.url);
    } else if (r.recommendation.startsWith('OK')) {
      categories.OK.push(r.url);
    } else {
      categories.OTHER.push(r.url);
    }
  }

  for (const [category, urls] of Object.entries(categories)) {
    if (urls.length > 0) {
      console.log(`\n${category} (${urls.length}):`);
      urls.forEach(url => console.log(`  - ${url}`));
    }
  }

  // Output JSON for further processing
  const fs = require('fs');
  const path = require('path');
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const outputPath = path.join(logsDir, `diagnostic-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results saved to: ${outputPath}`);
}

runDiagnostics().catch(console.error);
