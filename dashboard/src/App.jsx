import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// ODW Color Palette
const colors = {
  primary: '#54C0DD',
  primaryDark: '#3BA8C4',
  primaryLight: '#E8F6FA',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  success: '#10B981',
  successLight: '#D1FAE5',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
};

// Helper functions
const getStatusColor = (status) => {
  if (status === true) return colors.success;
  if (status === false) return colors.error;
  return colors.gray400;
};

const getStatusText = (status) => {
  if (status === true) return 'UP';
  if (status === false) return 'DOWN';
  return 'N/A';
};

const getUptimeColor = (uptime) => {
  if (uptime === null || uptime === undefined) return colors.gray400;
  if (uptime >= 99) return colors.success;
  if (uptime >= 95) return '#22c55e';
  if (uptime >= 90) return '#84cc16';
  if (uptime >= 75) return colors.warning;
  if (uptime >= 50) return '#f97316';
  return colors.error;
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Never';
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const StatusBadge = ({ status }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: status === true ? colors.successLight : status === false ? colors.errorLight : colors.gray100,
    color: getStatusColor(status),
  }}>
    <span style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: getStatusColor(status),
    }} />
    {getStatusText(status)}
  </span>
);

const UptimeBar = ({ history }) => {
  if (!history || history.length === 0) return <span style={{ color: colors.gray400, fontSize: '12px' }}>No data</span>;
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {history.map((week, i) => (
        <div key={i} title={`Week ${history.length - i}: ${week.uptime_pct !== null ? `${week.uptime_pct}%` : 'No data'}`}
          style={{
            width: '8px', 
            height: '24px', 
            borderRadius: '2px',
            backgroundColor: week.uptime_pct === null ? colors.gray300 : week.uptime_pct >= 99 ? colors.success : week.uptime_pct >= 90 ? '#84cc16' : week.uptime_pct >= 50 ? colors.warning : colors.error,
            opacity: week.uptime_pct === null ? 0.4 : 1,
          }}
        />
      ))}
    </div>
  );
};

const StatCard = ({ label, value, color }) => (
  <div style={{
    backgroundColor: colors.white,
    borderRadius: '8px',
    padding: '16px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    minWidth: '140px',
  }}>
    <div style={{ fontSize: '13px', color: colors.gray500, marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '28px', fontWeight: '700', color: color || colors.gray800 }}>{value}</div>
  </div>
);

const INCOME_GROUP_ORDER = ['High income', 'Upper middle income', 'Lower middle income', 'Low income', 'Unclassified'];

const AggregateTable = ({ title, data }) => (
  <div style={{
    flex: '1',
    backgroundColor: colors.white,
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    minWidth: '280px',
  }}>
    <div style={{
      padding: '12px 16px',
      backgroundColor: colors.primary,
      color: colors.white,
      fontSize: '13px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>{title}</div>
    {data.map((row, idx) => (
      <div key={row.label} style={{
        display: 'grid',
        gridTemplateColumns: '1fr 60px 80px',
        gap: '8px',
        padding: '10px 16px',
        borderBottom: idx < data.length - 1 ? `1px solid ${colors.gray100}` : 'none',
        backgroundColor: idx % 2 === 0 ? colors.white : colors.gray50,
        alignItems: 'center',
        fontSize: '13px',
      }}>
        <div style={{ fontWeight: '500', color: colors.gray700 }}>{row.label}</div>
        <div style={{ textAlign: 'right', color: colors.gray500 }}>{row.count} sites</div>
        <div style={{ textAlign: 'right', fontWeight: '600', color: getUptimeColor(row.avgUptime) }}>
          {row.avgUptime !== null ? `${row.avgUptime.toFixed(1)}%` : '—'}
        </div>
      </div>
    ))}
  </div>
);

export default function App() {
  const [sites, setSites] = useState([]);
  const [weeklyHistory, setWeeklyHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('country');
  const [sortOrder, setSortOrder] = useState('asc');

  const fetchData = async () => {
    if (!supabase) { setError('Supabase not configured'); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const { data: statusData, error: statusError } = await supabase
        .from('site_status_detailed')
        .select('id, country, country_code, region, organization, url, current_status, last_checked, uptime_7d, uptime_24h, notes, income_group')
        .order('country');
      if (statusError) throw statusError;
      const { data: historyData, error: historyError } = await supabase.rpc('get_weekly_history', { weeks_back: 12 }).limit(3000);
      if (historyError) throw historyError;
      const historyBySite = {};
      historyData?.forEach(row => { if (!historyBySite[row.site_id]) historyBySite[row.site_id] = []; historyBySite[row.site_id].push(row); });

      // Find the most recent check timestamp across all sites
      const mostRecentCheck = statusData?.reduce((latest, site) => {
        if (!site.last_checked) return latest;
        const checked = new Date(site.last_checked);
        return !latest || checked > latest ? checked : latest;
      }, null);

      setSites(statusData || []); setWeeklyHistory(historyBySite); setLastUpdated(mostRecentCheck);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const interval = setInterval(fetchData, 5 * 60 * 1000); return () => clearInterval(interval); }, []);

  const regions = useMemo(() => [...new Set(sites.map(s => s.region))].filter(Boolean).sort(), [sites]);

  const filteredData = useMemo(() => {
    return sites.filter(site => {
      const matchesSearch = site.country?.toLowerCase().includes(searchTerm.toLowerCase()) || site.organization?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegion = regionFilter === 'all' || site.region === regionFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'up' && site.current_status === true) || (statusFilter === 'down' && site.current_status === false) || (statusFilter === 'unknown' && site.current_status === null);
      return matchesSearch && matchesRegion && matchesStatus;
    }).sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'country') cmp = (a.country || '').localeCompare(b.country || '');
      else if (sortBy === 'status') { const o = { true: 0, null: 1, false: 2 }; cmp = (o[a.current_status] ?? 1) - (o[b.current_status] ?? 1); }
      else if (sortBy === 'uptime') cmp = (b.uptime_7d || 0) - (a.uptime_7d || 0);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [sites, searchTerm, regionFilter, statusFilter, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = sites.length;
    const up = sites.filter(s => s.current_status === true).length;
    const down = sites.filter(s => s.current_status === false).length;
    const avgUptime = total > 0 ? sites.reduce((acc, s) => acc + (parseFloat(s.uptime_7d) || 0), 0) / total : 0;
    return { total, up, down, avgUptime };
  }, [sites]);

  const aggregates = useMemo(() => {
    const calcGroup = (groupFn, order) => {
      const groups = {};
      sites.forEach(s => {
        const key = groupFn(s) || 'Unclassified';
        if (!groups[key]) groups[key] = { uptimes: [], count: 0 };
        groups[key].count++;
        if (s.uptime_7d !== null && s.uptime_7d !== undefined) {
          groups[key].uptimes.push(parseFloat(s.uptime_7d));
        }
      });
      const entries = Object.entries(groups).map(([label, g]) => ({
        label,
        count: g.count,
        avgUptime: g.uptimes.length > 0 ? g.uptimes.reduce((a, b) => a + b, 0) / g.uptimes.length : null,
      }));
      if (order) {
        entries.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
      } else {
        entries.sort((a, b) => a.label.localeCompare(b.label));
      }
      return entries;
    };
    return {
      byRegion: calcGroup(s => s.region),
      byIncome: calcGroup(s => s.income_group, INCOME_GROUP_ORDER),
    };
  }, [sites]);

  const downloadCSV = () => {
    const headers = ['Country', 'Region', 'Organization', 'URL', 'Status', 'Uptime 7d (%)', 'Notes'];
    const rows = filteredData.map(site => [
      site.country,
      site.region,
      site.organization,
      site.url,
      site.current_status === true ? 'Up' : site.current_status === false ? 'Down' : 'Unknown',
      site.uptime_7d !== null ? parseFloat(site.uptime_7d).toFixed(1) : '',
      site.notes || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nso-uptime-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!supabase) return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.gray50, color: colors.gray800, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '600px', backgroundColor: colors.white, padding: '32px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: '16px', color: colors.gray800 }}>⚙️ Configuration Required</h1>
        <p style={{ marginBottom: '16px', color: colors.gray600 }}>Set your Supabase credentials:</p>
        <pre style={{ backgroundColor: colors.gray100, padding: '16px', borderRadius: '8px', fontSize: '13px' }}>
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.gray50, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Header */}
      <header style={{ backgroundColor: colors.primary, color: colors.white, padding: '32px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>NSO Uptime Monitor</h1>
            {lastUpdated && <span style={{ marginLeft: 'auto', fontSize: '13px', opacity: 0.9 }}>Updated {formatTimeAgo(lastUpdated)}</span>}
          </div>
          <p style={{ fontSize: '16px', margin: 0, opacity: 0.9 }}>Tracking availability of {stats.total} National Statistical Office websites worldwide</p>
        </div>
      </header>

      {/* Stats Cards */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 32px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <StatCard label="Total Sites" value={stats.total} color={colors.gray800} />
          <StatCard label="Operational" value={stats.up} color={colors.success} />
          <StatCard label="Down" value={stats.down} color={colors.error} />
          <StatCard label="Avg Uptime (7d)" value={`${stats.avgUptime.toFixed(1)}%`} color={getUptimeColor(stats.avgUptime)} />
        </div>
      </div>

      {/* Aggregate Summaries */}
      {!loading && !error && (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px 24px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <AggregateTable title="7-Day Avg Uptime by Region" data={aggregates.byRegion} />
            <AggregateTable title="7-Day Avg Uptime by Income Group" data={aggregates.byIncome} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px 24px' }}>
        <div style={{
          backgroundColor: colors.white,
          borderRadius: '8px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <input
            type="text"
            placeholder="Search countries or organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: '1',
              minWidth: '250px',
              padding: '10px 14px',
              fontSize: '14px',
              border: `1px solid ${colors.gray200}`,
              borderRadius: '6px',
              outline: 'none',
            }}
          />
          
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              fontSize: '14px',
              border: `1px solid ${colors.gray200}`,
              borderRadius: '6px',
              backgroundColor: colors.white,
              cursor: 'pointer',
            }}
          >
            <option value="all">All Regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              fontSize: '14px',
              border: `1px solid ${colors.gray200}`,
              borderRadius: '6px',
              backgroundColor: colors.white,
              cursor: 'pointer',
            }}
          >
            <option value="all">All Status</option>
            <option value="up">Operational</option>
            <option value="down">Down</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => { const [f, o] = e.target.value.split('-'); setSortBy(f); setSortOrder(o); }}
            style={{
              padding: '10px 14px',
              fontSize: '14px',
              border: `1px solid ${colors.gray200}`,
              borderRadius: '6px',
              backgroundColor: colors.white,
              cursor: 'pointer',
            }}
          >
            <option value="country-asc">Country A-Z</option>
            <option value="country-desc">Country Z-A</option>
            <option value="uptime-desc">Uptime High-Low</option>
            <option value="uptime-asc">Uptime Low-High</option>
            <option value="status-asc">Status (Up first)</option>
            <option value="status-desc">Status (Down first)</option>
          </select>

          <button
            onClick={downloadCSV}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              color: colors.white,
              backgroundColor: colors.primary,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Download CSV
          </button>

          <span style={{ marginLeft: 'auto', color: colors.gray500, fontSize: '13px' }}>
            Showing {filteredData.length} of {stats.total}
          </span>
        </div>
      </div>

      {/* Table */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <div style={{ width: '40px', height: '40px', border: `3px solid ${colors.gray200}`, borderTopColor: colors.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '400px', gap: '16px' }}>
            <div style={{ color: colors.error, fontSize: '18px' }}>⚠️ {error}</div>
            <button onClick={fetchData} style={{ backgroundColor: colors.primary, color: colors.white, border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
          </div>
        ) : (
          <div style={{ backgroundColor: colors.white, borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr 90px 140px 80px 180px',
              gap: '16px',
              padding: '14px 20px',
              backgroundColor: colors.primary,
              color: colors.white,
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              <div>Country</div>
              <div>Organization</div>
              <div>Status</div>
              <div>12-Week History</div>
              <div style={{ textAlign: 'right' }}>7D Uptime</div>
              <div>Notes</div>
            </div>

            {/* Table Rows */}
            {filteredData.map((site, idx) => (
              <div
                key={site.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr 90px 140px 80px 180px',
                  gap: '16px',
                  padding: '14px 20px',
                  borderBottom: idx < filteredData.length - 1 ? `1px solid ${colors.gray100}` : 'none',
                  backgroundColor: idx % 2 === 0 ? colors.white : colors.gray50,
                  alignItems: 'center',
                }}
              >
                <div style={{ fontWeight: '600', color: colors.gray800 }}>{site.country}</div>
                <div>
                  <div style={{ color: colors.gray700, fontSize: '14px' }}>{site.organization}</div>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: colors.primary, fontSize: '12px', textDecoration: 'none' }}
                  >
                    {site.url?.replace(/^https?:\/\//, '').split('/')[0]}
                  </a>
                </div>
                <div><StatusBadge status={site.current_status} /></div>
                <div><UptimeBar history={weeklyHistory[site.id] || []} /></div>
                <div style={{
                  textAlign: 'right',
                  fontWeight: '600',
                  color: getUptimeColor(site.uptime_7d),
                  fontSize: '14px',
                }}>
                  {site.uptime_7d !== null ? `${parseFloat(site.uptime_7d).toFixed(1)}%` : '—'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: colors.gray500,
                  fontStyle: site.notes ? 'italic' : 'normal',
                }}>
                  {site.notes || '—'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          backgroundColor: colors.primaryLight,
          borderRadius: '8px',
          padding: '20px 24px',
          borderLeft: `4px solid ${colors.primary}`,
        }}>
          <p style={{ margin: '0 0 8px 0', color: colors.gray700, fontSize: '14px' }}>
            <strong>About this monitor:</strong> Tracks website availability for National Statistical Offices worldwide. 
            Checks run hourly via automated monitoring.
          </p>
          <p style={{ margin: 0, color: colors.gray500, fontSize: '13px' }}>
            Data source: <a href="https://opendatawatch.com" style={{ color: colors.primary }}>Open Data Watch</a>
          </p>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input:focus, select:focus { border-color: ${colors.primary} !important; outline: none; }
        button:hover { background-color: ${colors.primaryDark} !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
