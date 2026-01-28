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
    """Update portfolio.json with current prices (multi-account format)"""

    # Load current portfolio
    with open('portfolio.json', 'r', encoding='utf-8') as f:
        portfolio = json.load(f)

    # Check if this is multi-account format
    is_multi_account = 'accounts' in portfolio

    if is_multi_account:
        print(f"Updating prices for {len(portfolio['accounts'])} accounts...")
        print("-" * 60)

        total_cost_all = 0
        total_market_value_all = 0
        total_cash_all = 0

        # Process each account
        for account in portfolio['accounts']:
            print(f"\n{account['name']}:")
            account_cost = 0
            account_market_value = 0

            # Fetch prices for each holding
            for holding in account['holdings']:
                symbol = holding['symbol']
                print(f"  {symbol}...", end=' ')

                price_data = fetch_stock_data(symbol)

                if price_data and price_data['price']:
                    holding['currentPrice'] = round(price_data['price'], 4)  # 4 decimals for penny stocks
                    holding['change'] = round(price_data['change'], 4)
                    holding['changePercent'] = round(price_data['changePercent'], 2)

                    # Calculate market value and gains
                    holding['marketValue'] = round(holding['shares'] * holding['currentPrice'], 2)
                    holding['costBasis'] = round(holding['shares'] * holding['avgCost'], 2)
                    holding['gainLoss'] = round(holding['marketValue'] - holding['costBasis'], 2)

                    if holding['costBasis'] > 0:
                        holding['gainLossPercent'] = round((holding['gainLoss'] / holding['costBasis']) * 100, 2)
                    else:
                        holding['gainLossPercent'] = 0

                    account_cost += holding['costBasis']
                    account_market_value += holding['marketValue']

                    print(f"${price_data['price']:.2f}")
                else:
                    print("FAILED")

            # Update account summary
            account_gain = account_market_value - account_cost
            account['summary'] = {
                'totalCost': round(account_cost, 2),
                'totalMarketValue': round(account_market_value, 2),
                'totalGainLoss': round(account_gain, 2),
                'totalGainLossPercent': round((account_gain / account_cost * 100) if account_cost > 0 else 0, 2),
                'cashBalance': account['cash']
            }

            total_cost_all += account_cost
            total_market_value_all += account_market_value
            total_cash_all += account['cash']

            print(f"  Account Total: ${account_market_value:,.2f} (${account_gain:+,.2f})")

        # Update total summary
        total_gain_all = total_market_value_all - total_cost_all
        portfolio['totalSummary'] = {
            'totalCost': round(total_cost_all, 2),
            'totalMarketValue': round(total_market_value_all, 2),
            'totalGainLoss': round(total_gain_all, 2),
            'totalGainLossPercent': round((total_gain_all / total_cost_all * 100) if total_cost_all > 0 else 0, 2),
            'totalCash': round(total_cash_all, 2),
            'totalValue': round(total_market_value_all + total_cash_all, 2)
        }

        print("-" * 60)
        print(f"Total Market Value: ${total_market_value_all:,.2f} CAD")
        print(f"Total Cash: ${total_cash_all:,.2f} CAD")
        print(f"Total Portfolio Value: ${total_market_value_all + total_cash_all:,.2f} CAD")
        print(f"Total Gain/Loss: ${total_gain_all:,.2f} ({portfolio['totalSummary']['totalGainLossPercent']}%)")

    else:
        # Legacy single-account format (backward compatibility)
        print(f"Updating prices for {len(portfolio['holdings'])} holdings...")
        print("-" * 60)

        # Fetch prices for each holding
        for holding in portfolio['holdings']:
            symbol = holding['symbol']
            print(f"Fetching {symbol}...", end=' ')

            price_data = fetch_stock_data(symbol)

            if price_data and price_data['price']:
                holding['currentPrice'] = round(price_data['price'], 4)  # 4 decimals for penny stocks
                holding['change'] = round(price_data['change'], 4)
                holding['changePercent'] = round(price_data['changePercent'], 2)

                # Calculate market value and gains
                holding['marketValue'] = round(holding['shares'] * holding['currentPrice'], 2)
                holding['costBasis'] = round(holding['shares'] * holding['avgCost'], 2)
                holding['gainLoss'] = round(holding['marketValue'] - holding['costBasis'], 2)

                if holding['costBasis'] > 0:
                    holding['gainLossPercent'] = round((holding['gainLoss'] / holding['costBasis']) * 100, 2)
                else:
                    holding['gainLossPercent'] = 0

                print(f"${price_data['price']:.4f} CAD")
            else:
                print("FAILED")

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

    # Update timestamp (Eastern Time with automatic DST handling)
    portfolio['lastUpdated'] = datetime.now(ZoneInfo('America/New_York')).strftime('%Y-%m-%d %H:%M:%S %Z')

    # Save updated portfolio
    with open('portfolio.json', 'w', encoding='utf-8') as f:
        json.dump(portfolio, f, indent=2, ensure_ascii=False)

    print(f"\nPortfolio updated successfully at {portfolio['lastUpdated']}")

if __name__ == "__main__":
    update_portfolio()
