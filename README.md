# RESP Portfolio Tracker

Live, interactive portfolio dashboard for Canadian RESP accounts

**Live URL:** https://pailheres.github.io/resp-portfolio/

## 🏗️ Architecture

This project uses **two repositories**:

1. **[resp-portfolio-archive](https://github.com/pailheres/resp-portfolio-archive)** (PRIVATE)
   - Stores all CSV transaction history
   - Processes CSVs to generate portfolio.json
   - Full transaction history beyond broker's 2-year limit

2. **[resp-portfolio](https://github.com/pailheres/resp-portfolio)** (PUBLIC - this repo)
   - GitHub Pages dashboard
   - Displays portfolio.json (summary only, no transaction details)
   - Automated price updates via GitHub Actions

## 🔄 Workflow

### 1. Export CSV from brokerage

Download your transaction history CSV from your broker's website.

### 2. Archive CSV (in private repo)

```bash
cd D:/devel/github/resp-portfolio-archive

# Copy new CSV to archive
cp "MULTI_YYYYMMDD.csv" csvs/

# Commit to archive
git add csvs/MULTI_YYYYMMDD.csv
git commit -m "Add CSV export from YYYY-MM-DD"
git push
```

### 3. Generate portfolio.json

```bash
# Still in resp-portfolio-archive/
python process_csv.py
```

This merges **ALL** CSVs in the archive and outputs to this public repo.

### 4. Push updated portfolio

```bash
cd ../resp-portfolio/github-pages
git add portfolio.json
git commit -m "Update portfolio"
git push
```

GitHub Actions will automatically update prices within minutes.

## ⏰ Automated Price Updates

GitHub Actions fetches live prices from Yahoo Finance and updates portfolio.json:

- **Weekdays only:** 10:00 AM, 2:00 PM, 4:30 PM EST
- **No weekends/nights** (markets closed)
- **Manual trigger:** GitHub Actions tab → "Update Portfolio Prices" → Run workflow

## 📁 Files

- `index.html` - Dashboard UI
- `app.js` - Loads prices from portfolio.json and renders dashboard
- `styles.css` - Styling
- `portfolio.json` - Holdings summary (PUBLIC, no transaction details)
- `update_prices.py` - GitHub Actions script to fetch Yahoo Finance prices
- `.github/workflows/update-prices.yml` - Automated price update schedule

## 🔒 Privacy

- ✅ **Transaction CSVs stay in private repo** (never public)
- ✅ **portfolio.json only has summary:** symbol, shares, avg cost
- ✅ **No transaction history exposed** (dates, amounts, etc.)
- ✅ **Live prices from Yahoo Finance** (server-side via GitHub Actions)
- ✅ **No API keys needed** (yfinance is free)

## 📱 Features

- **Real-time prices** updated 3x daily during market hours
- **Auto-refresh** every 5 minutes in browser
- **Mobile responsive** design
- **Color-coded gains/losses** (green/red)
- **Total portfolio value** with cash balance
- **Individual stock performance** with daily changes
- **Multi-year transaction history** (merged from archive repo)

## 🛠️ Symbol Mapping

If Yahoo Finance uses different symbols than your broker, edit the symbol_map in the archive repo's `process_csv.py`:

```python
symbol_map = {
    'NVDA': 'NVDA.TO',      # CDR mapping
    'GOOG': 'GOOG.TO',      # CDR mapping
    'SVR.C': 'SVR-C.TO',    # Dot vs hyphen
}
```

## 📊 Current Portfolio

- **15 holdings** (tech CDRs, ETFs, precious metals)
- **TSX-listed** stocks and ETFs
- **CAD denominated** (Canadian dollar)

## 🌐 Access

Share the live URL with your kids:
**https://pailheres.github.io/resp-portfolio/**

Updates automatically - they'll always see current prices and holdings!

## 🔗 Related

- [Private CSV Archive Repo](https://github.com/pailheres/resp-portfolio-archive) - Transaction history storage
