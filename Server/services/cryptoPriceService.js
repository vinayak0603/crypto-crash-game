const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 10 });

async function getPrice(crypto) {
  const cached = cache.get(crypto);
  if (cached) return cached;

  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: crypto.toLowerCase(),
        vs_currencies: 'usd'
      }
    });

    const price = res.data[crypto.toLowerCase()].usd;
    cache.set(crypto, price);
    return price;
  } catch (error) {
    console.error(`[getPrice] Error fetching ${crypto}:`, error.message);

    // fallback prices if API fails and no cache
    if (crypto === 'bitcoin') return 60000;
    if (crypto === 'ethereum') return 3000;

    throw new Error(`Unknown crypto: ${crypto}`);
  }
}

module.exports = { getPrice };
