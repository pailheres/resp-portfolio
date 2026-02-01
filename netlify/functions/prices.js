/**
 * Netlify Serverless Function: Fetch Real-Time Stock Prices
 * Uses axios with proper rate limiting to avoid "Too Many Requests"
 */

const axios = require('axios');

// Helper to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch quote for a single symbol
async function fetchYahooQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 5000
    });

    const result = response.data?.chart?.result?.[0];

    if (!result || !result.meta) {
      console.log(`No data for ${symbol}`);
      return null;
    }

    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice || meta.previousClose;
    const previousClose = meta.chartPreviousClose || meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: symbol,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      currency: meta.currency || 'CAD'
    };
  } catch (error) {
    // Handle rate limiting
    if (error.response?.status === 429) {
      console.log(`Rate limited for ${symbol}, will retry`);
      await delay(2000);
      return fetchYahooQuote(symbol); // Retry once
    }

    console.error(`Error fetching ${symbol}:`, error.message);
    return null;
  }
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

  // List of all symbols
  const symbols = [
    'AAPL.TO', 'AMZN.TO', 'ASML.TO', 'AYA.TO', 'CASH.TO',
    'GIGA.V', 'GOOG.TO', 'MA.TO', 'NGPE.TO', 'NVDA.TO',
    'SVR-C.TO', 'SURG.V', 'TPE.TO', 'TPU.TO', 'TQQQ.TO',
    'XCHP.TO', 'XIC.TO', 'XQQ.TO', 'XSP.TO', 'ZGLD.TO', 'ZWA.TO'
  ];

  try {
    console.log(`Fetching prices for ${symbols.length} symbols...`);

    // Process in small batches with delays to avoid rate limiting
    const batchSize = 3; // Very conservative
    const results = [];

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(symbols.length / batchSize);

      console.log(`Batch ${batchNum}/${totalBatches}: ${batch.join(', ')}`);

      // Fetch batch sequentially (not parallel) to be extra safe
      for (const symbol of batch) {
        const result = await fetchYahooQuote(symbol);
        results.push(result);
        await delay(300); // 300ms between each request
      }

      // Extra delay between batches
      if (i + batchSize < symbols.length) {
        await delay(500);
      }
    }

    // Build price map
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

    const successCount = Object.keys(prices).length;
    console.log(`Success: ${successCount}/${symbols.length} prices fetched`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        prices: prices,
        timestamp: new Date().toISOString(),
        successCount: successCount,
        totalSymbols: symbols.length
      })
    };
  } catch (error) {
    console.error('Error:', error);

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
