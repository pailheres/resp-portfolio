# Claude Context: RESP Portfolio Tracker (Public Repo)

## Project Overview

**Live Dashboard:** https://pailheres.github.io/resp-portfolio/

This is the **PUBLIC** GitHub Pages repository that displays a portfolio tracker for Canadian RESP (Registered Education Savings Plan) accounts. It shows current holdings, live prices, and gains/losses without exposing any transaction history.

## Repository Structure

```
resp-portfolio/ (PUBLIC)
├── index.html              # Dashboard UI
├── app.js                  # Fetches data from portfolio.json and renders
├── styles.css              # Styling
├── portfolio.json          # Holdings summary (NO transaction details)
├── update_prices.py        # GitHub Actions script to fetch Yahoo prices
├── .github/workflows/
│   └── update-prices.yml   # Automated price updates (3x daily, weekdays only)
├── README.md               # User documentation
└── claude.md               # This file (for Claude context)
```

## Related Repository

**[resp-portfolio-archive](https://github.com/pailheres/resp-portfolio-archive)** (PRIVATE)
- Contains all CSV transaction history
- Has `process_csv.py` that merges CSVs and outputs to this repo's `portfolio.json`
- See `../resp-portfolio-archive/claude.md` for details

## Data Flow

```
Brokerage Export → MULTI_YYYYMMDD.csv
                        ↓
[PRIVATE REPO: resp-portfolio-archive]
    csvs/MULTI_*.csv (stored permanently)
         ↓
    process_csv.py (merges all CSVs)
         ↓
[PUBLIC REPO: resp-portfolio]
    portfolio.json (summary only: symbol, shares, avgCost)
         ↓
    GitHub Actions (update_prices.py)
         ↓
    portfolio.json (+ currentPrice, marketValue, gains)
         ↓
    GitHub Pages (index.html + app.js)
         ↓
    Live Dashboard
```

## portfolio.json Format

```json
{
  "lastUpdated": "2026-01-11 15:50:25",
  "cash": 6854.25,
  "holdings": [
    {
      "symbol": "NVDA.TO",          // Yahoo Finance symbol
      "brokerSymbol": "NVDA",       // Broker's symbol
      "displayName": "NVIDIA CORP CDR C$HDG",
      "shares": 20.0,
      "avgCost": 39.83,
      "currentPrice": 41.93,        // Added by update_prices.py
      "marketValue": 838.60,        // Added by update_prices.py
      "gainLoss": 42.00,            // Added by update_prices.py
      "gainLossPercent": 5.27       // Added by update_prices.py
    }
  ],
  "summary": {                      // Added by update_prices.py
    "totalCost": 18335.15,
    "totalMarketValue": 22488.30,
    "totalGainLoss": 4153.15,
    "totalGainLossPercent": 22.65
  }
}
```

## GitHub Actions Workflow

**Schedule:** Weekdays only (Mon-Fri)
- 10:00 AM EST (15:00 UTC) - After market open
- 2:00 PM EST (19:00 UTC) - Midday update
- 4:30 PM EST (21:30 UTC) - After market close

**Manual Trigger:** GitHub Actions tab → "Update Portfolio Prices" → Run workflow

**What it does:**
1. Checks out repo
2. Installs Python + yfinance
3. Runs `update_prices.py`
4. Commits updated `portfolio.json` if prices changed
5. Pushes to main branch
6. GitHub Pages auto-deploys (~2 min)

## Symbol Mapping

Some broker symbols differ from Yahoo Finance symbols. Mapping is done in the **archive repo's** `process_csv.py`:

```python
symbol_map = {
    'NVDA': 'NVDA.TO',      # CDR needs .TO suffix
    'GOOG': 'GOOG.TO',      # CDR needs .TO suffix
    'AMZN': 'AMZN.TO',      # CDR needs .TO suffix
    'ASML': 'ASML.TO',      # CDR needs .TO suffix
    'SVR.C': 'SVR-C.TO',    # Broker uses dot, Yahoo uses hyphen
}
```

## Current Holdings (15 stocks)

**Tech CDRs:** NVDA, GOOG, AMZN, ASML
**ETFs:** TPU, TPE, XSP, XQQ, XCHP, TQQQ, NGPE, ZWA
**Precious Metals:** ZGLD (gold), SVR.C (silver)
**Mining:** AYA (gold/silver mining)

All TSX-listed, CAD denominated.

## Key Technical Details

**Frontend:**
- Vanilla JavaScript (no frameworks)
- Fetches portfolio.json every page load
- Auto-refreshes every 5 minutes
- Mobile responsive (flexbox + media queries)
- Color coding: green = gains, red = losses
- Dark mode (default) with light mode toggle
- Theme preference saved to localStorage
- Compact design optimized for mobile and desktop
- Sticky ticker column for horizontal scrolling on mobile

**Backend:**
- No traditional backend (static GitHub Pages)
- Python scripts run via GitHub Actions
- yfinance library for stock prices (free, no API key)

**Privacy:**
- Transaction CSVs never committed to this repo
- portfolio.json has NO dates, NO transaction amounts
- Only current holdings summary exposed

**Design Features:**
- Theme toggle button in header (🌙/☀️)
- Responsive breakpoints: 768px and 480px
- Sticky first column (ticker) on mobile horizontal scroll
- Progressive column hiding on smaller screens (Avg Cost, then Name)
- CSS custom properties for easy theme switching

## Common Tasks

### Update portfolio after new transactions

```bash
# 1. In private repo
cd D:/devel/github/resp-portfolio-archive
cp "MULTI_YYYYMMDD.csv" csvs/
git add csvs/ && git commit -m "Add CSV" && git push
python process_csv.py

# 2. In public repo
cd ../resp-portfolio-tracker
git add portfolio.json
git commit -m "Update portfolio"
git push
```

### Add new symbol mapping

Edit `../resp-portfolio-archive/process_csv.py` line ~110:
```python
symbol_map = {
    'NEW_BROKER_SYMBOL': 'YAHOO_SYMBOL.TO',
}
```

### Manually trigger price update

```bash
gh workflow run update-prices.yml
```

Or via GitHub web UI: Actions tab → Update Portfolio Prices → Run workflow

### Test locally

```bash
python -m http.server 8000
# Open http://localhost:8000
```

## User Context

**Who:** User (pailheres) managing RESP accounts
**Brokerage:** Canadian broker (French CSV exports)
**CSV Format:** Semicolon delimited, French decimal format (comma = decimal point)
**CSV Columns:** Operation, Quantite, Montant net, Symbole, Encaisse courante
**Transaction Types:** Achat (buy), Vente (sell), Cotisation (contribution), Subvention (grant), IQEE (Quebec grant)

## Important Notes

- Single combined dashboard view
- CSV exports are reverse chronological (newest first)
- Cash balance must be read from FIRST row (most recent)
- Symbol mapping handles CDRs and dot/hyphen differences
- GitHub Actions saves on cost by not running nights/weekends

## File Locations

**Local directories:**
- Public repo: `D:\devel\github\resp-portfolio-tracker\`
- Private repo: `D:\devel\github\resp-portfolio-archive\`

**GitHub:**
- Public: https://github.com/pailheres/resp-portfolio
- Private: https://github.com/pailheres/resp-portfolio-archive
- Live site: https://pailheres.github.io/resp-portfolio/

## Troubleshooting

**Issue:** Stock showing "--" for prices
**Fix:** Check symbol mapping in archive repo's process_csv.py

**Issue:** Cash balance outdated
**Fix:** Run process_csv.py in archive repo with latest CSV

**Issue:** GitHub Actions failing
**Fix:** Check yfinance can fetch symbol (test with `yf.Ticker('SYMBOL.TO').info`)

**Issue:** Dashboard not updating
**Fix:** Hard refresh browser (Ctrl+Shift+R), check GitHub Actions ran successfully

## Development History

- Started as Google Sheets attempt (GOOGLEFINANCE didn't support CDRs)
- Tried browser-side Yahoo Finance fetch (CORS blocked)
- Solution: GitHub Actions server-side price fetching
- Split into 2 repos to handle multi-year CSV history beyond broker's 2-year limit
