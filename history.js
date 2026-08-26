// /api/history.js
// Returns historical price data for one index, used only on the /markets/:id detail page
// (spec item 37). Deploy alongside api/markets.js. Keeps the same "no fake data" rule:
// if the provider or the plan doesn't support history for a symbol/range, this returns
// a clear error rather than inventing points.

const fs = require('fs');
const path = require('path');

const PROVIDER_API_KEY = process.env.MARKET_DATA_API_KEY;

const RANGE_TO_INTERVAL = {
  '1D': { interval: '5min', outputsize: 100 },
  '1W': { interval: '30min', outputsize: 100 },
  '1M': { interval: '1day', outputsize: 30 },
  '3M': { interval: '1day', outputsize: 90 },
  '6M': { interval: '1day', outputsize: 180 },
  '1Y': { interval: '1week', outputsize: 52 },
  '5Y': { interval: '1month', outputsize: 60 },
};

function loadIndex(id) {
  const raw = fs.readFileSync(path.join(process.cwd(), 'config', 'indices.json'), 'utf8');
  const config = JSON.parse(raw);
  return config.indices.find((i) => i.id === id);
}

module.exports = async function handler(req, res) {
  const { id, range = '1M' } = req.query || {};
  const index = id && loadIndex(id);

  if (!index) return res.status(404).json({ error: 'Unknown index id.' });
  if (!PROVIDER_API_KEY) return res.status(500).json({ error: 'MARKET_DATA_API_KEY is not configured on the server.' });

  const rangeConfig = RANGE_TO_INTERVAL[range];
  if (!rangeConfig) return res.status(400).json({ error: 'Unsupported range.' });

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
      index.provider_symbol
    )}&interval=${rangeConfig.interval}&outputsize=${rangeConfig.outputsize}&apikey=${PROVIDER_API_KEY}`;
    const upstream = await fetch(url);
    if (!upstream.ok) throw new Error(`Provider request failed: ${upstream.status}`);
    const data = await upstream.json();

    if (!data.values) {
      return res.status(502).json({ error: 'Historical data unavailable for this index/range on your current plan.' });
    }

    const points = data.values
      .map((v) => ({ t: v.datetime, c: Number(v.close) }))
      .reverse();

    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ id: index.id, range, points });
  } catch (err) {
    return res.status(502).json({ error: 'Could not retrieve historical data right now.' });
  }
};
