const https = require('https');

module.exports = async function handler(req, res) {
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

  if (!deepseekKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured' });
  }

  try {
    const { messages } = req.body;

    const payload = JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 900,
      messages: messages,
    });

    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.deepseek.com',
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const apiReq = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => resolve({ status: apiRes.statusCode, body: data }));
      });

      apiReq.on('error', reject);
      apiReq.write(payload);
      apiReq.end();
    });

    const data = JSON.parse(response.body);

    if (response.status !== 200) {
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
};
```

Click **Commit changes**.

---

## Then Redeploy

Vercel → **Deployments** → **"..."** → **Redeploy** → wait 30 seconds → test again:
```
https://nzr-platform.vercel.app/api/quote?symbol=AAPL
