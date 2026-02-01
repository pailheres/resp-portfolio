/**
 * Netlify Serverless Function: Fetch Real-Time Stock Prices
 * Uses yahoo-finance2 library with proper rate limiting
 */

const yahooFinance = require('yahoo-finance2').default;

// Helper to add delay between requests (rate limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch quote for a single symbol with retry logic
async function fetchQuoteWithRetry(symbol, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const quote = await yahooFinance.quote(symbol);

      if (!quote || !quote.regularMarketPrice) {
        console.log(`No price data for ${symbol}`);
        return null;
      }

      const currentPrice = quote.regularMarketPrice;
      const previousClose = quote.regularMarketPreviousClose || currentPrice;
      const change = quote.regularMarketChange || (currentPrice - previousClose);
      const changePercent = quote.regularMarketChangePercent || ((change / previousClose) * 100);

      return {
        symbol: symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        currency: quote.currency || 'CAD'
      };
    } catch (error) {
      if (i < retries) {
        console.log(`Retry ${i + 1} for ${symbol}`);
        await delay(1000); // Wait 1 second before retry
      } else {
        console.error(`Failed to fetch ${symbol}:`, error.message);
        return null;
      }
    }
  }
  return null;
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

    // Fetch in batches to avoid rate limiting
    const batchSize = 5;
    const results = [];

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}`);

      const batchPromises = batch.map(symbol => fetchQuoteWithRetry(symbol));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < symbols.length) {
        await delay(500); // 500ms between batches
      }
    }

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
        cached: false,
        successCount: Object.keys(prices).length,
        totalSymbols: symbols.length
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
