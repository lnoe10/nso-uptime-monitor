import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Helper functions
const getStatusColor = (status) => {
  if (status === true) return '#10b981';
  if (status === false) return '#ef4444';
  return '#6b7280';
};

const getStatusText = (status) => {
  if (status === true) return 'up';
  if (status === false) return 'down';
  return 'unknown';
};

const getUptimeColor = (uptime) => {
  if (uptime === null || uptime === undefined) return '#6b7280';
  if (uptime >= 99) return '#10b981';
  if (uptime >= 95) return '#22c55e';
  if (uptime >= 90) return '#84cc16';
  if (uptime >= 75) return '#eab308';
  if (uptime >= 50) return '#f97316';
  return '#ef4444';
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

const StatusIndicator = ({ status }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <div style={{
      width: '10px', height: '10px', borderRadius: '50%',
      backgroundColor: getStatusColor(status),
      boxShadow: status === true ? '0 0 8px #10b981' : status === false ? '0 0 8px #ef4444' : 'none',
    }} />
    <span style={{ fontSize: '12px', fontWeight: '500', color: getStatusColor(status), textTransform: 'uppercase' }}>
      {getStatusText(status)}
    </span>
  </div>
);

const UptimeBar = ({ history }) => {
  if (!history || history.length === 0) return <span style={{ color: '#64748b', fontSize: '12px' }}>No data</span>;
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {history.map((week, i) => (
        <div key={i} title={`Week ${history.length - i}: ${week.uptime_pct !== null ? `${week.uptime_pct}%` : 'No data'}`}
          style={{
            width: '6px', height: '20px', borderRadius: '2px',
            backgroundColor: week.uptime_pct === null ? '#374151' : week.uptime_pct >= 99 ? '#10b981' : week.uptime_pct >= 90 ? '#84cc16' : week.uptime_pct >= 50 ? '#eab308' : '#ef4444',
            opacity: week.uptime_pct === null ? 0.3 : 1,
          }}
        />
      ))}
    </div>
  );
};

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
      const { data: statusData, error: statusError } = await supabase.from('site_status_detailed').select('*').order('country');
      if (statusError) throw statusError;
      const { data: historyData, error: historyError } = await supabase.rpc('get_weekly_history', { weeks_back: 12 });
      if (historyError) throw historyError;
      const historyBySite = {};
      historyData?.forEach(row => { if (!historyBySite[row.site_id]) historyBySite[row.site_id] = []; historyBySite[row.site_id].push(row); });
      setSites(statusData || []); setWeeklyHistory(historyBySite); setLastUpdated(new Date());
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
    const total = sites.length, up = sites.filter(s => s.current_status === true).length, down = sites.filter(s => s.current_status === false).length, unknown = sites.filter(s => s.current_status === null).length;
    const avgUptime = total > 0 ? sites.reduce((acc, s) => acc + (parseFloat(s.uptime_7d) || 0), 0) / total : 0;
    return { total, up, down, unknown, avgUptime };
  }, [sites]);

  if (!supabase) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '600px', backgroundColor: '#1e293b', padding: '32px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h1 style={{ marginBottom: '16px', color: '#f8fafc' }}>⚙️ Configuration Required</h1>
        <p style={{ marginBottom: '16px', color: '#94a3b8' }}>Set your Supabase credentials:</p>
        <pre style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', fontSize: '13px' }}>
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace" }}>
      <header style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderBottom: '1px solid #334155', padding: '24px 32px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 12px #10b981', animation: 'pulse 2s infinite' }} />
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>NSO Uptime Monitor</h1>
            {lastUpdated && <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '12px' }}>Updated {formatTimeAgo(lastUpdated)}</span>}
          </div>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>Monitoring {stats.total} National Statistical Office websites worldwide</p>
        </div>
      </header>

      <div style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#64748b', fontSize: '13px' }}>OPERATIONAL</span><span style={{ color: '#10b981', fontWeight: '600', fontSize: '18px' }}>{stats.up}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#64748b', fontSize: '13px' }}>DOWN</span><span style={{ color: '#ef4444', fontWeight: '600', fontSize: '18px' }}>{stats.down}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#64748b', fontSize: '13px' }}>UNKNOWN</span><span style={{ color: '#6b7280', fontWeight: '600', fontSize: '18px' }}>{stats.unknown}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}><span style={{ color: '#64748b', fontSize: '13px' }}>AVG UPTIME (7d)</span><span style={{ color: getUptimeColor(stats.avgUptime), fontWeight: '600', fontSize: '18px' }}>{stats.avgUptime.toFixed(1)}%</span></div>
        </div>
      </div>

      <div style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="Search countries or organizations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px 14px', color: '#e2e8f0', fontSize: '14px', width: '280px', outline: 'none' }} />
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px 14px', color: '#e2e8f0', fontSize: '14px', cursor: 'pointer' }}>
            <option value="all">All Regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px 14px', color: '#e2e8f0', fontSize: '14px', cursor: 'pointer' }}>
            <option value="all">All Status</option>
            <option value="up">Operational</option>
            <option value="down">Down</option>
            <option value="unknown">Unknown</option>
          </select>
          <select value={`${sortBy}-${sortOrder}`} onChange={(e) => { const [f, o] = e.target.value.split('-'); setSortBy(f); setSortOrder(o); }} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px 14px', color: '#e2e8f0', fontSize: '14px', cursor: 'pointer' }}>
            <option value="country-asc">Country A-Z</option>
            <option value="country-desc">Country Z-A</option>
            <option value="uptime-desc">Uptime High-Low</option>
            <option value="uptime-asc">Uptime Low-High</option>
            <option value="status-asc">Status (Up first)</option>
            <option value="status-desc">Status (Down first)</option>
          </select>
          <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '13px' }}>Showing {filteredData.length} of {stats.total}</span>
        </div>
      </div>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #334155', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '400px', gap: '16px' }}>
            <div style={{ color: '#ef4444', fontSize: '18px' }}>⚠️ {error}</div>
            <button onClick={fetchData} style={{ backgroundColor: '#334155', color: '#e2e8f0', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
          </div>
        ) : (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 90px 180px 100px', gap: '16px', padding: '14px 20px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              <div>Country</div><div>Organization</div><div>Status</div><div>12-Week History</div><div style={{ textAlign: 'right' }}>Uptime</div>
            </div>
            {filteredData.map((site, idx) => (
              <div key={site.id} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 90px 180px 100px', gap: '16px', padding: '14px 20px', borderBottom: idx < filteredData.length - 1 ? '1px solid #334155' : 'none', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(15, 23, 42, 0.3)' }}>
                <div style={{ fontWeight: '500', color: '#f1f5f9' }}>{site.country}</div>
                <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                  <span>{site.organization}</span><br />
                  <a href={site.url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontSize: '11px', textDecoration: 'none' }}>{site.url?.replace(/^https?:\/\//, '').split('/')[0]}</a>
                </div>
                <div><StatusIndicator status={site.current_status} /></div>
                <div><UptimeBar history={weeklyHistory[site.id] || []} /></div>
                <div style={{ textAlign: 'right', fontWeight: '600', color: getUptimeColor(site.uptime_7d), fontSize: '14px' }}>{site.uptime_7d !== null ? `${parseFloat(site.uptime_7d).toFixed(1)}%` : '—'}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', fontSize: '12px', color: '#64748b' }}>
          <p style={{ margin: '0 0 8px 0' }}><strong style={{ color: '#94a3b8' }}>About:</strong> Tracks NSO website availability worldwide. Checks run hourly via GitHub Actions.</p>
          <p style={{ margin: 0 }}>Source: <a href="https://opendatawatch.com" style={{ color: '#60a5fa' }}>Open Data Watch</a></p>
        </div>
      </main>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
