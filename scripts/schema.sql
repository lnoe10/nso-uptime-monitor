-- NSO Uptime Monitor Database Schema
-- Run this in Supabase SQL Editor to set up your database

-- ============================================
-- TABLES
-- ============================================

-- Table: NSO Sites
-- Stores information about each National Statistical Office website
CREATE TABLE IF NOT EXISTS nso_sites (
  id SERIAL PRIMARY KEY,
  country TEXT NOT NULL,
  country_code CHAR(3),  -- ISO 3166-1 alpha-3
  region TEXT NOT NULL,
  organization TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Uptime Checks
-- Stores the result of each uptime check
CREATE TABLE IF NOT EXISTS uptime_checks (
  id BIGSERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES nso_sites(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  status_code INTEGER,
  response_time_ms INTEGER,
  is_up BOOLEAN NOT NULL,
  error_message TEXT,
  check_type TEXT DEFAULT 'scheduled'  -- 'scheduled', 'manual', 'incident'
);

-- Table: Incidents (optional - for tracking extended outages)
CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES nso_sites(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60
  ) STORED,
  is_resolved BOOLEAN DEFAULT false,
  notes TEXT
);

-- ============================================
-- INDEXES
-- ============================================

-- Fast lookups for recent checks
CREATE INDEX IF NOT EXISTS idx_checks_site_checked 
  ON uptime_checks(site_id, checked_at DESC);

-- Fast filtering by time
CREATE INDEX IF NOT EXISTS idx_checks_checked_at 
  ON uptime_checks(checked_at DESC);

-- Fast filtering by status
CREATE INDEX IF NOT EXISTS idx_checks_is_up 
  ON uptime_checks(is_up);

-- Region filtering
CREATE INDEX IF NOT EXISTS idx_sites_region 
  ON nso_sites(region);

-- Active sites only
CREATE INDEX IF NOT EXISTS idx_sites_active 
  ON nso_sites(is_active) WHERE is_active = true;

-- ============================================
-- VIEWS
-- ============================================

-- View: Current Site Status
-- Combines site info with latest check result
CREATE OR REPLACE VIEW site_status AS
SELECT 
  s.id,
  s.country,
  s.country_code,
  s.region,
  s.organization,
  s.url,
  s.is_active,
  latest.is_up AS current_status,
  latest.checked_at AS last_checked,
  latest.status_code,
  latest.response_time_ms,
  latest.error_message
FROM nso_sites s
LEFT JOIN LATERAL (
  SELECT is_up, checked_at, status_code, response_time_ms, error_message
  FROM uptime_checks
  WHERE site_id = s.id
  ORDER BY checked_at DESC
  LIMIT 1
) latest ON true
WHERE s.is_active = true;

-- View: Site Status with Uptime Stats
-- Includes calculated uptime percentages
CREATE OR REPLACE VIEW site_status_detailed AS
SELECT 
  ss.*,
  stats.uptime_24h,
  stats.uptime_7d,
  stats.uptime_30d,
  stats.uptime_90d,
  stats.checks_24h,
  stats.avg_response_time_24h
FROM site_status ss
LEFT JOIN LATERAL (
  SELECT
    ROUND(
      COUNT(*) FILTER (WHERE is_up AND checked_at > NOW() - INTERVAL '24 hours') * 100.0 /
      NULLIF(COUNT(*) FILTER (WHERE checked_at > NOW() - INTERVAL '24 hours'), 0),
      2
    ) AS uptime_24h,
    ROUND(
      COUNT(*) FILTER (WHERE is_up AND checked_at > NOW() - INTERVAL '7 days') * 100.0 /
      NULLIF(COUNT(*) FILTER (WHERE checked_at > NOW() - INTERVAL '7 days'), 0),
      2
    ) AS uptime_7d,
    ROUND(
      COUNT(*) FILTER (WHERE is_up AND checked_at > NOW() - INTERVAL '30 days') * 100.0 /
      NULLIF(COUNT(*) FILTER (WHERE checked_at > NOW() - INTERVAL '30 days'), 0),
      2
    ) AS uptime_30d,
    ROUND(
      COUNT(*) FILTER (WHERE is_up AND checked_at > NOW() - INTERVAL '90 days') * 100.0 /
      NULLIF(COUNT(*) FILTER (WHERE checked_at > NOW() - INTERVAL '90 days'), 0),
      2
    ) AS uptime_90d,
    COUNT(*) FILTER (WHERE checked_at > NOW() - INTERVAL '24 hours') AS checks_24h,
    ROUND(AVG(response_time_ms) FILTER (WHERE checked_at > NOW() - INTERVAL '24 hours')) AS avg_response_time_24h
  FROM uptime_checks
  WHERE site_id = ss.id
) stats ON true;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Get Weekly Uptime History
-- Returns uptime percentage per week for the last N weeks
CREATE OR REPLACE FUNCTION get_weekly_history(weeks_back INTEGER DEFAULT 12)
RETURNS TABLE (
  site_id INTEGER,
  week_start DATE,
  week_number INTEGER,
  total_checks BIGINT,
  successful_checks BIGINT,
  uptime_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.site_id,
    DATE_TRUNC('week', uc.checked_at)::DATE AS week_start,
    ROW_NUMBER() OVER (PARTITION BY uc.site_id ORDER BY DATE_TRUNC('week', uc.checked_at) DESC)::INTEGER AS week_number,
    COUNT(*) AS total_checks,
    COUNT(*) FILTER (WHERE uc.is_up) AS successful_checks,
    ROUND(COUNT(*) FILTER (WHERE uc.is_up) * 100.0 / NULLIF(COUNT(*), 0), 1) AS uptime_pct
  FROM uptime_checks uc
  WHERE uc.checked_at > NOW() - (weeks_back || ' weeks')::INTERVAL
  GROUP BY uc.site_id, DATE_TRUNC('week', uc.checked_at)
  ORDER BY uc.site_id, week_start DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Daily Uptime History
-- Returns uptime percentage per day for the last N days
CREATE OR REPLACE FUNCTION get_daily_history(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  site_id INTEGER,
  check_date DATE,
  total_checks BIGINT,
  successful_checks BIGINT,
  uptime_pct NUMERIC,
  avg_response_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.site_id,
    DATE(uc.checked_at) AS check_date,
    COUNT(*) AS total_checks,
    COUNT(*) FILTER (WHERE uc.is_up) AS successful_checks,
    ROUND(COUNT(*) FILTER (WHERE uc.is_up) * 100.0 / NULLIF(COUNT(*), 0), 1) AS uptime_pct,
    ROUND(AVG(uc.response_time_ms) FILTER (WHERE uc.is_up)) AS avg_response_ms
  FROM uptime_checks uc
  WHERE uc.checked_at > NOW() - (days_back || ' days')::INTERVAL
  GROUP BY uc.site_id, DATE(uc.checked_at)
  ORDER BY uc.site_id, check_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Global Stats
-- Returns aggregate statistics across all sites
CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS TABLE (
  total_sites BIGINT,
  sites_up BIGINT,
  sites_down BIGINT,
  sites_unknown BIGINT,
  global_uptime_24h NUMERIC,
  global_uptime_7d NUMERIC,
  avg_response_time NUMERIC,
  total_checks_today BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.id) AS total_sites,
    COUNT(DISTINCT s.id) FILTER (WHERE latest.is_up = true) AS sites_up,
    COUNT(DISTINCT s.id) FILTER (WHERE latest.is_up = false) AS sites_down,
    COUNT(DISTINCT s.id) FILTER (WHERE latest.is_up IS NULL) AS sites_unknown,
    ROUND(
      COUNT(*) FILTER (WHERE c.is_up AND c.checked_at > NOW() - INTERVAL '24 hours') * 100.0 /
      NULLIF(COUNT(*) FILTER (WHERE c.checked_at > NOW() - INTERVAL '24 hours'), 0),
      2
    ) AS global_uptime_24h,
    ROUND(
      COUNT(*) FILTER (WHERE c.is_up AND c.checked_at > NOW() - INTERVAL '7 days') * 100.0 /
      NULLIF(COUNT(*) FILTER (WHERE c.checked_at > NOW() - INTERVAL '7 days'), 0),
      2
    ) AS global_uptime_7d,
    ROUND(AVG(c.response_time_ms) FILTER (WHERE c.is_up AND c.checked_at > NOW() - INTERVAL '24 hours')) AS avg_response_time,
    COUNT(*) FILTER (WHERE c.checked_at > NOW() - INTERVAL '24 hours') AS total_checks_today
  FROM nso_sites s
  LEFT JOIN LATERAL (
    SELECT is_up
    FROM uptime_checks
    WHERE site_id = s.id
    ORDER BY checked_at DESC
    LIMIT 1
  ) latest ON true
  LEFT JOIN uptime_checks c ON c.site_id = s.id
  WHERE s.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup Old Checks
-- Removes checks older than retention period (run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_checks(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM uptime_checks
  WHERE checked_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on tables
ALTER TABLE nso_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE uptime_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Public read access (for dashboard)
CREATE POLICY "Public read access for sites"
  ON nso_sites FOR SELECT
  USING (true);

CREATE POLICY "Public read access for checks"
  ON uptime_checks FOR SELECT
  USING (true);

CREATE POLICY "Public read access for incidents"
  ON incidents FOR SELECT
  USING (true);

-- Service role can do everything (for the checker script)
CREATE POLICY "Service role full access for sites"
  ON nso_sites FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access for checks"
  ON uptime_checks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access for incidents"
  ON incidents FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sites_updated_at
  BEFORE UPDATE ON nso_sites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SAMPLE DATA (optional - for testing)
-- ============================================

-- Uncomment to add a few sample sites for testing
/*
INSERT INTO nso_sites (country, country_code, region, organization, url) VALUES
  ('United States', 'USA', 'Americas', 'U.S. Census Bureau', 'https://www.census.gov'),
  ('United Kingdom', 'GBR', 'Europe', 'Office for National Statistics', 'https://www.ons.gov.uk'),
  ('Germany', 'DEU', 'Europe', 'Federal Statistical Office', 'https://www.destatis.de'),
  ('Japan', 'JPN', 'Asia', 'Statistics Bureau', 'https://www.stat.go.jp'),
  ('Kenya', 'KEN', 'Africa', 'Kenya National Bureau of Statistics', 'https://www.knbs.or.ke')
ON CONFLICT (url) DO NOTHING;
*/
