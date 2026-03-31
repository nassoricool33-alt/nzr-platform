const https = require('https');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const symbol = req.query.symbol;
  const key = process.env.FINNHUB_API_KEY;

  if (!key) {
    return res.status(500).json({ error: 'FINNHUB_API_KEY not configured' });
  }

  if (!symbol) {
    return res.status(400).json({ error: 'symbol is required' });
  }

  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`;

  https.get(url, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        const d = JSON.parse(data);
        if (!d || d.c === 0 || d.c === undefined) {
          return res.status(404).json({ error: 'No data for: ' + symbol });
        }
        return res.status(200).json({
          price: d.c,
          open: d.o,
          high: d.h,
          low: d.l,
          prevClose: d.pc,
          change: ((d.c - d.pc) / d.pc) * 100
        });
      } catch (e) {
        return res.status(500).json({ error: 'Parse error: ' + e.message });
      }
    });
  }).on('error', (e) => {
    return res.status(500).json({ error: e.message });
  });
};
