/**
 * Cleanup Old Data
 * 
 * Removes uptime check records older than retention period.
 * Run daily via GitHub Actions to keep database size manageable.
 */

const { supabase } = require('../src/supabase');

const retentionDays = parseInt(process.env.RETENTION_DAYS) || 90;

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
