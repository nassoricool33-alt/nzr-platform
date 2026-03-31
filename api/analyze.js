export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;

  if (!deepseekKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured in Vercel environment variables.' });
  }

  try {
    const { messages, ticker } = req.body;

    // Fetch live price from Finnhub if we have the key and ticker
    let priceContext = '';
    if (ticker && finnhubKey) {
      try {
        const quoteRes = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubKey}`
        );
        const quote = await quoteRes.json();
        if (quote && quote.c) {
          const chg = ((quote.c - quote.pc) / quote.pc * 100).toFixed(2);
          priceContext = `\n\nLIVE MARKET DATA - use these exact figures:\nCurrent Price: $${quote.c}\nOpen: $${quote.o}\nHigh: $${quote.h}\nLow: $${quote.l}\nPrev Close: $${quote.pc}\nChange: ${chg}%\nBase ALL entry zones, targets, and stops on current price $${quote.c}.`;
        }
      } catch (e) {
        // continue without live price
      }
    }

    // Add live price to last user message
    const enriched = (messages || []).map((m, i) => {
      if (i === messages.length - 1 && m.role === 'user') {
        return { ...m, content: m.content + priceContext };
      }
      return m;
    });

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 900,
        messages: enriched,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: `DeepSeek API error: ${data.error?.message || response.status}`
      });
    }

    const text = data.choices?.[0]?.message?.content || '';

    // Return in the format the frontend expects
    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
