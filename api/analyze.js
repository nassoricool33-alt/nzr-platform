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
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured.' });
  }

  try {
    const { messages, ticker } = req.body;

    // Fetch real-time price from Finnhub
    let priceContext = '';
    if (ticker && finnhubKey) {
      try {
        const quoteRes = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubKey}`
        );
        const quote = await quoteRes.json();

        const profileRes = await fetch(
          `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${finnhubKey}`
        );
        const profile = await profileRes.json();

        if (quote.c) {
          priceContext = `
LIVE MARKET DATA (use these exact figures in your analysis):
- Current Price: $${quote.c}
- Today's Open: $${quote.o}
- Today's High: $${quote.h}
- Today's Low: $${quote.l}
- Previous Close: $${quote.pc}
- Change Today: $${(quote.c - quote.pc).toFixed(2)} (${(((quote.c - quote.pc) / quote.pc) * 100).toFixed(2)}%)
- Company: ${profile.name || ticker}
- Sector: ${profile.finnhubIndustry || 'N/A'}
- Market Cap: $${profile.marketCapitalization ? (profile.marketCapitalization / 1000).toFixed(1) + 'B' : 'N/A'}

Use ONLY these real prices for entry, target, and stop loss calculations.`;
        }
      } catch (priceErr) {
        priceContext = 'Live price unavailable - use best estimate.';
      }
    }

    // Inject real price data into the prompt
    const enrichedMessages = messages.map((m, i) => {
      if (i === messages.length - 1 && m.role === 'user') {
        return {
          ...m,
          content: m.content + '\n\n' + priceContext
        };
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
        messages: enrichedMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: `DeepSeek error: ${data.error?.message || response.status}`
      });
    }

    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
