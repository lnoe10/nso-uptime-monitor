# NSO Uptime Monitor

A free, automated uptime monitoring system for National Statistical Office websites worldwide. Tracks ~200 NSO sites hourly and provides a public dashboard showing availability status and historical uptime.

![Dashboard Preview](docs/dashboard-preview.png)

## Features

- ⏰ **Hourly monitoring** via GitHub Actions (free)
- 📊 **12-week history** with visual sparklines
- 🌍 **Global coverage** of ~200 NSOs across all regions
- 🔍 **Filtering & search** by country, region, or status
- 📈 **Uptime percentages** calculated automatically
- 🆓 **Zero cost** using GitHub Actions + Supabase free tiers

## Architecture

```
GitHub Actions (hourly cron)
        │
        ▼
   Node.js Checker ──────▶ Supabase (PostgreSQL)
                                   │
                                   ▼
                          React Dashboard
```

## Quick Start

### 1. Fork this repository

### 2. Set up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the schema from `scripts/schema.sql`
4. Go to Settings → API and copy your:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - `anon` public key

### 3. Configure GitHub Secrets

In your forked repo, go to Settings → Secrets and variables → Actions:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon/public key |

### 4. Import NSO Sites

```bash
# Install dependencies
npm install

# Import sites from CSV
npm run import-sites
```

Or manually add sites via Supabase dashboard.

### 5. Enable GitHub Actions

Go to Actions tab and enable workflows. The uptime checker will run automatically every hour.

### 6. Deploy Dashboard

**Option A: Vercel (recommended)**
```bash
npm run build
npx vercel deploy
```

**Option B: GitHub Pages**
```bash
npm run build
# Push dist/ to gh-pages branch
```

**Option C: Observable**
Import the Observable notebook from `dashboard/observable-notebook.js`

## Project Structure

```
nso-uptime-monitor/
├── .github/
│   └── workflows/
│       ├── uptime-check.yml      # Hourly monitoring job
│       └── daily-report.yml      # Daily summary (optional)
├── src/
│   ├── checker.js                # Main monitoring script
│   ├── supabase.js               # Database client
│   └── utils.js                  # Helper functions
├── scripts/
│   ├── schema.sql                # Database schema
│   ├── import-sites.js           # Import NSO sites from CSV
│   └── seed-data.js              # Sample data for testing
├── dashboard/
│   ├── index.html                # Static dashboard
│   ├── App.jsx                   # React dashboard component
│   └── observable-notebook.js    # Observable version
├── data/
│   └── nso-sites.csv             # NSO sites list
├── package.json
└── README.md
```

## Configuration

Edit `config.js` to customize:

```javascript
module.exports = {
  // Timeout for each site check (ms)
  CHECK_TIMEOUT: 30000,
  
  // Concurrent checks (be nice to servers)
  BATCH_SIZE: 10,
  
  // User agent for requests
  USER_AGENT: 'NSO-Uptime-Monitor/1.0 (https://opendatawatch.com)',
  
  // History retention (days)
  RETENTION_DAYS: 90
};
```

## API Endpoints

The dashboard fetches data from Supabase REST API:

| Endpoint | Description |
|----------|-------------|
| `GET /rest/v1/site_status` | Current status of all sites |
| `GET /rest/v1/nso_sites` | List of monitored sites |
| `POST /rest/v1/rpc/get_weekly_history` | Weekly uptime aggregates |

## Contributing

1. Fork the repository
2. Add new NSO sites to `data/nso-sites.csv`
3. Submit a pull request

## Data Sources

NSO website URLs sourced from [Open Data Watch](https://opendatawatch.com/knowledge-partnership/national-statistical-offices-online/).

## License

MIT License - see [LICENSE](LICENSE)

## Acknowledgments

- [Open Data Watch](https://opendatawatch.com) for maintaining the NSO directory
- [Supabase](https://supabase.com) for free PostgreSQL hosting
- [GitHub Actions](https://github.com/features/actions) for free CI/CD
