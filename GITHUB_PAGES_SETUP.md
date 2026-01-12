# GitHub Pages Portfolio Tracker - Setup Guide

Complete guide to deploy your RESP portfolio tracker on GitHub Pages.

## What You're Building

A live, interactive portfolio dashboard that:
- ✅ Fetches real-time prices from Yahoo Finance (browser-side)
- ✅ Shows gains/losses with green/red colors
- ✅ Updates automatically every 5 minutes
- ✅ Works on phones, tablets, computers
- ✅ Keeps transaction history private (only summary is public)
- ✅ Free hosting forever

---

## Files Overview

### **Private (never committed):**
- `MULTI_20260107.csv` - Your transaction history (stays on your computer)

### **Public (committed to GitHub):**
- `portfolio.json` - Holdings summary (no transaction details)
- `index.html` - Dashboard page
- `app.js` - JavaScript application
- `styles.css` - Styling
- `process_csv.py` - Script to convert CSV to JSON

---

## Step-by-Step Setup

### Step 1: Test Locally First

**Create portfolio.json from your CSV:**

```bash
cd D:\devel\github\resp-portfolio-tracker\github-pages
python process_csv.py ../MULTI_20260107.csv
```

This creates `portfolio.json` with your current holdings (no transaction history).

**Review portfolio.json:**
- Open it in a text editor
- Verify it only has summary data (shares, average cost)
- No dates, no transaction details

**Test the dashboard locally:**

1. Open `index.html` in your browser (double-click it)
2. You might see CORS errors (expected - we'll fix with GitHub Pages)
3. Or use a simple local server:

```bash
# Python 3
python -m http.server 8000

# Then open: http://localhost:8000
```

---

### Step 2: Create GitHub Repository

**Option A: Using GitHub.com (Easiest)**

1. Go to [github.com](https://github.com)
2. Click **New repository** (+ button, top right)
3. Name: `resp-portfolio` (or whatever you want)
4. Description: "Family RESP Portfolio Tracker"
5. **Public** (required for free GitHub Pages)
6. **DO NOT** initialize with README
7. Click **Create repository**

**Option B: Using GitHub Desktop**

1. Open GitHub Desktop
2. File > New Repository
3. Name: `resp-portfolio`
4. Local path: `D:\devel\github\resp-portfolio-tracker\github-pages`
5. **Uncheck** "Initialize with README"
6. Click **Create Repository**

---

### Step 3: Prepare Files for Commit

**Move to the github-pages folder:**

```bash
cd D:\devel\github\resp-portfolio-tracker\github-pages
```

**Initialize git (if not done):**

```bash
git init
git branch -M main
```

**Verify .gitignore is working:**

```bash
git status
```

**You should see:**
- ✅ portfolio.json
- ✅ index.html
- ✅ app.js
- ✅ styles.css
- ✅ .gitignore
- ❌ MULTI_*.csv (should NOT appear - it's private!)

**If you see the CSV file, STOP and fix .gitignore first!**

---

### Step 4: Commit and Push

**Add files:**

```bash
git add .
git commit -m "Initial commit: RESP portfolio tracker"
```

**Connect to GitHub:**

```bash
git remote add origin https://github.com/YOUR_USERNAME/resp-portfolio.git
```

Replace `YOUR_USERNAME` with your GitHub username.

**Push to GitHub:**

```bash
git push -u origin main
```

---

### Step 5: Enable GitHub Pages

**On GitHub.com:**

1. Go to your repository: `https://github.com/YOUR_USERNAME/resp-portfolio`
2. Click **Settings** (gear icon, top right)
3. Scroll down to **Pages** (left sidebar)
4. Under "Source":
   - Branch: **main**
   - Folder: **/ (root)**
5. Click **Save**

**Wait 1-2 minutes**, then refresh the page.

You'll see: "Your site is published at `https://YOUR_USERNAME.github.io/resp-portfolio/`"

---

### Step 6: View Your Dashboard!

Open the URL in your browser:

```
https://YOUR_USERNAME.github.io/resp-portfolio/
```

**You should see:**
- Your portfolio with live prices
- Green/red colors for gains/losses
- Holdings table
- Total value, cash balance

**Share this URL with your family!**

---

## Updating Your Portfolio

**When you buy/sell stocks (monthly):**

1. **Export new CSV from broker**

2. **Generate updated portfolio.json:**
   ```bash
   cd D:\devel\github\resp-portfolio-tracker\github-pages
   python process_csv.py MULTI_20260107.csv
   ```

3. **Commit and push:**
   ```bash
   git add portfolio.json
   git commit -m "Update portfolio - January 2026"
   git push
   ```

4. **Wait 1-2 minutes** - GitHub Pages will auto-deploy

5. **Refresh the dashboard** - kids see updated holdings!

**That's it!** No manual price updates needed - Yahoo Finance provides live prices.

---

## Customization

### Change Names

Edit `index.html`, line 12:
```html
<p class="subtitle">RESP Account Investment Tracker</p>
```

Change to whatever you want!

### Change Colors

Edit `styles.css`, lines 3-5:
```css
--positive-color: #16a34a;  /* Green for gains */
--negative-color: #dc2626;  /* Red for losses */
--primary-color: #2563eb;   /* Blue for header */
```

### Add More Symbols

The script automatically handles all stocks in your CSV. Just add them to the CSV and run `process_csv.py`.

---

## Troubleshooting

### Dashboard shows "Unable to load portfolio data"

**Problem:** portfolio.json not found or invalid

**Solution:**
1. Check the browser console (F12)
2. Verify portfolio.json exists
3. Check JSON syntax: [jsonlint.com](https://jsonlint.com)

### Prices not loading (shows --)

**Problem:** Yahoo Finance API blocked or symbol incorrect

**Solution:**
1. Check browser console for CORS errors
2. Verify symbols in portfolio.json (e.g., "NVDA.TO" not "NVDA")
3. Wait a few minutes - Yahoo might be rate-limiting

### CSV file appears in git status

**DANGER:** Your private data is about to be committed!

**Solution:**
1. **DO NOT commit!**
2. Check .gitignore includes `*.csv`
3. Run: `git reset` to unstage
4. Run: `git status` to verify CSV is gone

### Changes not appearing on GitHub Pages

**Problem:** Cached or deploy delay

**Solution:**
1. Wait 2-3 minutes
2. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Check GitHub Actions tab for deployment status

---

## Privacy & Security

### What's Public:
- Current holdings (symbols, shares, average cost)
- Your first names (beneficiaries)
- Cash balance
- Dashboard code

### What's Private:
- Transaction history (dates, individual purchases)
- Account numbers
- Your brokerage details
- Full transaction CSV

### Keeping it Secure:
1. **Never commit CSV files** - .gitignore protects you
2. **Review portfolio.json** before each commit
3. **Use private repo** if you're worried (requires GitHub Pro)
4. **Don't include sensitive data** in portfolio.json

---

## Advanced: Auto-Update with GitHub Actions

Want prices to update automatically without running the Python script?

**Create `.github/workflows/update.yml`:**

```yaml
name: Update Portfolio
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install pandas
      - name: Update portfolio
        run: |
          # Your custom update logic here
          # This requires storing portfolio data differently
          echo "Portfolio updated"
      - name: Commit changes
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add portfolio.json
          git commit -m "Auto-update portfolio" || echo "No changes"
          git push
```

**Note:** This requires a different approach since your CSV is private. You'd need to:
1. Store holdings summary in a different format
2. Or manually trigger updates when you have new data

---

## Next Steps

1. ✅ Test the dashboard locally
2. ✅ Create GitHub repo
3. ✅ Push code
4. ✅ Enable GitHub Pages
5. ✅ Share URL with kids
6. ✅ Monthly: update portfolio.json and push

**Enjoy your automated portfolio tracker!** 🚀📈

---

## Support

- GitHub Pages docs: [pages.github.com](https://pages.github.com)
- Yahoo Finance API: Works from browser, no auth needed
- Questions? Check the main TROUBLESHOOTING.md

**Made with care for RESP Account** ❤️
