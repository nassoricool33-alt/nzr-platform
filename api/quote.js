export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { symbol } = req.query;
  const key = process.env.FINNHUB_API_KEY;

  if (!key) {
    return res.status(500).json({ error: 'FINNHUB_API_KEY not configured' });
  }

  if (!symbol) {
    return res.status(400).json({ error: 'symbol is required' });
  }

  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`
    );
    const d = await r.json();

    if (!d || d.c === 0) {
      return res.status(404).json({ error: 'No data for symbol: ' + symbol });
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
    return res.status(500).json({ error: e.message });
  }
}
```

Click **Commit changes**.

---

## Step 2 — Confirm `FINNHUB_API_KEY` is in Vercel

Go to **Vercel → Settings → Environment Variables**

You need to see this:

| Name | Value |
|---|---|
| `DEEPSEEK_API_KEY` | `sk-...` ✅ |
| `FINNHUB_API_KEY` | `your finnhub key` ✅ |

If `FINNHUB_API_KEY` is missing → add it → **Redeploy**.

---

## Step 3 — Test the quote API directly

Open this URL in your browser (replace with your actual domain):
```
https://nzr-platform.vercel.app/api/quote?symbol=AAPL
