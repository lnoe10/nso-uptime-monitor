/**
 * Import NSO Sites
 * 
 * Imports NSO sites from CSV file into Supabase database.
 * 
 * Usage:
 *   npm run import-sites
 *   npm run import-sites -- --file custom-sites.csv
 */

const { supabase } = require('../src/supabase');
const fs = require('fs');
const path = require('path');
const { parseCSV, normalizeUrl, normalizeRegion } = require('../src/utils/csv');

/**
 * Main import function
 */
async function importSites(csvPath) {
  console.log('═'.repeat(60));
  console.log('NSO Sites Importer');
  console.log('═'.repeat(60));
  
  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: File not found: ${csvPath}`);
    console.error('');
    console.error('Expected CSV format:');
    console.error('  country,country_code,region,organization,url');
    console.error('  "United States",USA,Americas,"U.S. Census Bureau",https://www.census.gov');
    process.exit(1);
  }
  
  // Read and parse CSV
  console.log(`\nReading: ${csvPath}`);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  
  console.log(`Found ${rows.length} sites in CSV.\n`);
  
  // Validate and transform data
  const sites = [];
  const errors = [];
  
  rows.forEach((row, i) => {
    const lineNum = i + 2; // Account for header and 0-index
    
    // Required fields
    if (!row.country) {
      errors.push(`Line ${lineNum}: Missing country`);
      return;
    }
    if (!row.url) {
      errors.push(`Line ${lineNum}: Missing URL for ${row.country}`);
      return;
    }
    
    const url = normalizeUrl(row.url);
    if (!url) {
      errors.push(`Line ${lineNum}: Invalid URL for ${row.country}`);
      return;
    }
    
    sites.push({
      country: row.country.trim(),
      country_code: row.country_code?.trim().toUpperCase() || null,
      region: normalizeRegion(row.region),
      organization: row.organization?.trim() || 'National Statistical Office',
      url: url,
      is_active: true,
    });
  });
  
  // Report validation errors
  if (errors.length > 0) {
    console.log('Validation errors:');
    errors.forEach(e => console.log(`  ⚠ ${e}`));
    console.log('');
  }
  
  if (sites.length === 0) {
    console.error('No valid sites to import.');
    process.exit(1);
  }
  
  // Check for duplicates in input
  const urlCounts = {};
  sites.forEach(s => {
    urlCounts[s.url] = (urlCounts[s.url] || 0) + 1;
  });
  const duplicates = Object.entries(urlCounts).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log('Duplicate URLs in CSV:');
    duplicates.forEach(([url, count]) => console.log(`  ⚠ ${url} (${count} times)`));
    console.log('');
  }
  
  // Upsert sites (insert or update on conflict)
  console.log(`Importing ${sites.length} sites to database...`);
  
  let imported = 0;
  let updated = 0;
  let failed = 0;
  
  // Process in batches to avoid timeouts
  const BATCH_SIZE = 50;
  
  for (let i = 0; i < sites.length; i += BATCH_SIZE) {
    const batch = sites.slice(i, i + BATCH_SIZE);
    
    const { data, error } = await supabase
      .from('nso_sites')
      .upsert(batch, {
        onConflict: 'url',
        ignoreDuplicates: false,
      })
      .select();
    
    if (error) {
      console.error(`Error importing batch ${i}-${i + batch.length}:`, error.message);
      failed += batch.length;
    } else {
      imported += data.length;
      console.log(`  Processed ${Math.min(i + BATCH_SIZE, sites.length)}/${sites.length}`);
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('═'.repeat(60));
  console.log(`Total in CSV:    ${rows.length}`);
  console.log(`Valid sites:     ${sites.length}`);
  console.log(`Imported/Updated: ${imported}`);
  if (failed > 0) {
    console.log(`Failed:          ${failed}`);
  }
  if (errors.length > 0) {
    console.log(`Skipped (errors): ${errors.length}`);
  }
  
  // Verify by fetching count
  const { count } = await supabase
    .from('nso_sites')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\nTotal sites in database: ${count}`);
  console.log('═'.repeat(60));
}

// Get CSV path from arguments or use default
const args = process.argv.slice(2);
const dataDir = path.resolve(__dirname, '..', 'data');
let csvPath = path.join(dataDir, 'nso-sites.csv');

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && args[i + 1]) {
    csvPath = path.resolve(args[i + 1]);
  }
}

// Security: Validate that the path is within the data directory
if (!csvPath.startsWith(dataDir)) {
  console.error('Error: CSV file must be located in the data/ directory');
  console.error(`  Allowed directory: ${dataDir}`);
  console.error(`  Requested path: ${csvPath}`);
  process.exit(1);
}

// Security: Validate file extension
if (!csvPath.toLowerCase().endsWith('.csv')) {
  console.error('Error: File must have a .csv extension');
  process.exit(1);
}

// Run if executed directly (not imported as module)
if (require.main === module) {
  importSites(csvPath).catch(console.error);
}
