# NSO Uptime Monitor — Claude Project Context

## What This Project Does
Monitors availability of 198 National Statistical Office (NSO) websites worldwide. Checks run hourly via GitHub Actions, results stored in Supabase, displayed on a React dashboard.

## Architecture

### Three-Pass Checking System
1. **Fetch checker** (`src/checker.js`) — runs hourly at minute 0, checks all 198 sites via HTTP fetch
2. **Playwright browser fallback** (`src/browser-check.js`) — immediately after fetch pass, re-checks 15 bot-protected sites using headless Chromium
3. **UptimeRobot sync** (`src/uptimerobot-sync.js`) — runs at minute 30, syncs results for 2 sites that block all datacenter IPs

### Frontend
- React dashboard (`dashboard/src/App.jsx`)
- Queries `site_status_detailed` Supabase view — picks latest `uptime_checks` row per site by `checked_at DESC`
- 12-week history via `get_weekly_history` RPC with `.limit(3000)` (Supabase `max_rows` set to 3000)

## Key Files
| File | Purpose |
|------|---------|
| `src/checker.js` | Main fetch checker, orchestrates all passes |
| `src/browser-check.js` | Playwright browser fallback module |
| `src/uptimerobot-sync.js` | UptimeRobot API sync |
| `dashboard/src/App.jsx` | React frontend |
| `.github/workflows/uptime-check.yml` | Hourly check workflow (includes Playwright Chromium install + cache) |
| `.github/workflows/uptimerobot-sync.yml` | UptimeRobot sync workflow |
| `data/nso-sites.csv` | Source of truth for site URLs and metadata |
| `scripts/import-sites.js` | Syncs CSV into Supabase `nso_sites` table (`npm run import-sites`) |

## Adding / Updating Countries
1. Edit `data/nso-sites.csv` (source of truth)
2. Run `SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx npm run import-sites` — upserts on URL, safe to run against full CSV
3. The checker reads from the Supabase `nso_sites` table, not the CSV directly

Credentials are in Supabase dashboard under **Settings → API**. You can also store them in a local `.env` file (gitignored, never commit it), but `import-sites` does not auto-load `.env` — pass credentials inline as above.

> **Warning:** The import upserts on `url` after stripping trailing slashes. If you change a URL in the CSV, the old URL row remains in Supabase and must be manually deleted via SQL. Changing a URL without cleaning up the old row creates a duplicate, which will cause the dashboard to show stale history for the old URL alongside the new one. Country names/metadata changes (no URL change) update automatically.

## Important Invariants
- **When adding a site to browser check**: also remove it from `MONITOR_NAME_TO_COUNTRY_CODE` in `uptimerobot-sync.js` — otherwise UptimeRobot sync overwrites browser check results at :30
- **When adding a site to UptimeRobot-only**: also add its hostname to `UPTIMEROBOT_ONLY_HOSTS` in `checker.js` — prevents fetch checker from overwriting UptimeRobot results at :00
- **`package-lock.json` must be committed** when changing dependencies — `npm ci` in CI requires it to be in sync
- **`gh` CLI is not installed locally** — workflow triggers must be done via GitHub UI

## Current Browser Check Sites (21 sites)
In `src/browser-check.js` → `BROWSER_CHECK_HOSTS`:
- Bosnia (`bhas.gov.ba`), Portugal (`www.ine.pt`), Guyana (`statisticsguyana.gov.gy`)
- Armenia (`www.armstat.am`), Kosovo (`ask.rks-gov.net`), Kuwait (`www.csb.gov.kw`)
- Rwanda (`www.statistics.gov.rw`), Antigua & Barbuda (`statistics.gov.ag`)
- Senegal (`www.ansd.sn`), Solomon Islands (`www.statistics.gov.sb`), Vanuatu (`vbos.gov.vu`)
- Bangladesh (`www.bbs.gov.bd`), Cook Islands (`stats.gov.ck`), Uganda (`www.ubos.org`)
- Russia (`rosstat.gov.ru`) — also has SSL bypass in fetch checker
- San Marino (`www.statistica.sm`)
- Algeria (`www.ons.dz`), France (`www.insee.fr`), India (`www.mospi.gov.in`)
- South Korea (`kostat.go.kr`), Malaysia (`www.dosm.gov.my`)

## UptimeRobot-Only Sites (skip DB insert in fetch checker)
In `src/checker.js` → `UPTIMEROBOT_ONLY_HOSTS`:
- **Romania** (`insse.ro`) — drops connections from all datacenter IPs; UptimeRobot also fails (likely HEAD vs GET issue — may be fixed by upgrading to UptimeRobot paid plan to enable GET monitoring); has a database note

## Sites That Block All External Monitoring
These are confirmed up in a real browser but unreachable from all datacenter IPs including UptimeRobot. They show as down in the dashboard with a database note explaining why:
- **Angola** (`www.ine.gov.ao`) — 405 error on UptimeRobot (HEAD not supported), also fails browser check from GitHub Actions IPs. May be fixable with UptimeRobot paid GET monitoring.

## SSL Bypass Sites
In `src/checker.js` → `SSL_BYPASS_HOSTS` (fetch checker uses `rejectUnauthorized: false`):
Afghanistan, Kenya, Liberia, Mongolia, Mozambique, Russia, Vietnam

Browser check also uses `ignoreHTTPSErrors: true` so SSL issues don't affect browser-checked sites.

## Remaining Genuinely Down Sites (~6)
Iran and others — confirmed actually down, not a monitoring configuration issue.

## Testing
- `npm test` — runs Jest test suite (51 tests)
- Playwright mocked with `{ virtual: true }` in tests since browser binary not installed locally
- Tests live in `tests/` directory

## Workflow Timing
- Fetch checker: minute 0 every hour
- UptimeRobot sync: minute 30 every hour
- The timing gap is why `UPTIMEROBOT_ONLY_HOSTS` is necessary — without it, the :00 fetch checker overwrites the :30 UptimeRobot result

## Supabase Notes
- `max_rows` API setting: 3000 (required for 198 sites × 12 weeks history)
- `notes` column on `nso_sites` is purely cosmetic, has no effect on checks
- Sites currently up have had their notes cleared; only genuinely problematic sites have notes
