"""
Automated Price Updater for GitHub Actions
Fetches live prices and updates portfolio.json
"""

import json
import yfinance as yf
from datetime import datetime
from zoneinfo import ZoneInfo

def fetch_stock_data(symbol):
    """Fetch current price and changes from Yahoo Finance"""
    try:
        stock = yf.Ticker(symbol)
        info = stock.info

        return {
            'price': info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose'),
            'change': info.get('regularMarketChange', 0),
            'changePercent': info.get('regularMarketChangePercent', 0),
            'currency': info.get('currency', 'CAD')
        }
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        return None

def update_portfolio():
    """Update portfolio.json with current prices"""

    # Load current portfolio
    with open('portfolio.json', 'r', encoding='utf-8') as f:
        portfolio = json.load(f)

    print(f"Updating prices for {len(portfolio['holdings'])} holdings...")
    print("-" * 60)

    # Fetch prices for each holding
    for holding in portfolio['holdings']:
        symbol = holding['symbol']
        print(f"Fetching {symbol}...", end=' ')

        price_data = fetch_stock_data(symbol)

        if price_data and price_data['price']:
            holding['currentPrice'] = round(price_data['price'], 2)
            holding['change'] = round(price_data['change'], 2)
            holding['changePercent'] = round(price_data['changePercent'], 2)

            # Calculate market value and gains
            holding['marketValue'] = round(holding['shares'] * holding['currentPrice'], 2)
            holding['costBasis'] = round(holding['shares'] * holding['avgCost'], 2)
            holding['gainLoss'] = round(holding['marketValue'] - holding['costBasis'], 2)

            if holding['costBasis'] > 0:
                holding['gainLossPercent'] = round((holding['gainLoss'] / holding['costBasis']) * 100, 2)
            else:
                holding['gainLossPercent'] = 0

            print(f"${price_data['price']:.2f} CAD")
        else:
            print("FAILED")

    # Update timestamp (Eastern Time with automatic DST handling)
    portfolio['lastUpdated'] = datetime.now(ZoneInfo('America/New_York')).strftime('%Y-%m-%d %H:%M:%S %Z')

    # Calculate totals
    total_cost = sum(h.get('costBasis', 0) for h in portfolio['holdings'])
    total_market_value = sum(h.get('marketValue', 0) for h in portfolio['holdings'])
    total_gain = total_market_value - total_cost

    portfolio['summary'] = {
        'totalCost': round(total_cost, 2),
        'totalMarketValue': round(total_market_value, 2),
        'totalGainLoss': round(total_gain, 2),
        'totalGainLossPercent': round((total_gain / total_cost * 100) if total_cost > 0 else 0, 2)
    }

    print("-" * 60)
    print(f"Total Market Value: ${total_market_value:,.2f} CAD")
    print(f"Total Gain/Loss: ${total_gain:,.2f} ({portfolio['summary']['totalGainLossPercent']}%)")

    # Save updated portfolio
    with open('portfolio.json', 'w', encoding='utf-8') as f:
        json.dump(portfolio, f, indent=2, ensure_ascii=False)

    print(f"\nPortfolio updated successfully at {portfolio['lastUpdated']}")

if __name__ == "__main__":
    update_portfolio()
