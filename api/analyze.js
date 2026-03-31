export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { symbol } = req.query;
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return res.status(500).json({ error: 'FINNHUB_API_KEY not set' });
  try {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`);
    const d = await r.json();
    return res.status(200).json({
      price: d.c, open: d.o, high: d.h, low: d.l,
      prevClose: d.pc,
      change: ((d.c - d.pc) / d.pc) * 100
    });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}
