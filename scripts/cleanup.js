/**
 * Cleanup Old Data
 * 
 * Removes uptime check records older than retention period.
 * Run daily via GitHub Actions to keep database size manageable.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const retentionDays = parseInt(process.env.RETENTION_DAYS) || 90;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log('═'.repeat(60));
  console.log('Database Cleanup');
  console.log('═'.repeat(60));
  console.log(`Retention period: ${retentionDays} days`);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  console.log(`Deleting checks before: ${cutoffDate.toISOString()}`);
  
  // Get count before deletion
  const { count: beforeCount } = await supabase
    .from('uptime_checks')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total checks before cleanup: ${beforeCount}`);
  
  // Delete old records
  const { error, count: deletedCount } = await supabase
    .from('uptime_checks')
    .delete({ count: 'exact' })
    .lt('checked_at', cutoffDate.toISOString());
  
  if (error) {
    throw new Error(`Cleanup failed: ${error.message}`);
  }
  
  // Get count after deletion
  const { count: afterCount } = await supabase
    .from('uptime_checks')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\nDeleted: ${deletedCount || 0} records`);
  console.log(`Total checks after cleanup: ${afterCount}`);
  console.log('═'.repeat(60));
}

cleanup().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
