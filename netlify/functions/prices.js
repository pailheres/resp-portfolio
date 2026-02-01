/**
 * Netlify Serverless Function: Fetch Real-Time Stock Prices
 * Fetches current prices from Yahoo Finance for all portfolio holdings
 */

const https = require('https');

// Helper function to fetch stock data from Yahoo Finance
function fetchYahooQuote(symbol) {
  return new Promise((resolve, reject) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const result = json.chart.result[0];

          if (!result || !result.meta) {
            resolve(null);
            return;
          }

          const meta = result.meta;
          const quote = result.indicators.quote[0];

          // Get previous close for change calculation
          const currentPrice = meta.regularMarketPrice || meta.previousClose;
          const previousClose = meta.chartPreviousClose || meta.previousClose;
          const change = currentPrice - previousClose;
          const changePercent = (change / previousClose) * 100;

          resolve({
            symbol: symbol,
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            currency: meta.currency || 'CAD'
          });
        } catch (error) {
          console.error(`Error parsing ${symbol}:`, error);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.error(`Error fetching ${symbol}:`, error);
      resolve(null);
    });
  });
}

// Main handler
exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // List of all symbols to fetch (from your portfolio)
  const symbols = [
    'AAPL.TO',
    'AMZN.TO',
    'ASML.TO',
    'AYA.TO',
    'CASH.TO',
    'GIGA.V',
    'GOOG.TO',
    'MA.TO',
    'NGPE.TO',
    'NVDA.TO',
    'SVR-C.TO',
    'SURG.V',
    'TPE.TO',
    'TPU.TO',
    'TQQQ.TO',
    'XCHP.TO',
    'XIC.TO',
    'XQQ.TO',
    'XSP.TO',
    'ZGLD.TO',
    'ZWA.TO'
  ];

  try {
    console.log(`Fetching prices for ${symbols.length} symbols...`);

    // Fetch all symbols in parallel
    const pricePromises = symbols.map(symbol => fetchYahooQuote(symbol));
    const results = await Promise.all(pricePromises);

    // Build price map (symbol -> price data)
    const prices = {};
    results.forEach(result => {
      if (result) {
        prices[result.symbol] = {
          price: result.price,
          change: result.change,
          changePercent: result.changePercent,
          currency: result.currency
        };
      }
    });

    console.log(`Successfully fetched ${Object.keys(prices).length}/${symbols.length} prices`);

    // Return with cache headers (cache for 1 minute to reduce API calls)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        prices: prices,
        timestamp: new Date().toISOString(),
        cached: false
      })
    };
  } catch (error) {
    console.error('Error fetching prices:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to fetch prices',
        message: error.message
      })
    };
  }
};
