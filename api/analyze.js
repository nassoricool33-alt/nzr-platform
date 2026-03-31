const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return res.status(500).json({ error: 'DEEPSEEK_API_KEY missing in Vercel env vars' });

  try {
    const body = req.body;
    const messages = body && body.messages ? body.messages : [];

    if (messages.length === 0) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    const payload = JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 900,
      messages: messages
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.deepseek.com',
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key,
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const r = https.request(options, (res2) => {
        let data = '';
        res2.on('data', c => data += c);
        res2.on('end', () => resolve({ status: res2.statusCode, body: data }));
      });

      r.on('error', reject);
      r.write(payload);
      r.end();
    });

    let parsed;
    try {
      parsed = JSON.parse(result.body);
    } catch(e) {
      return res.status(500).json({ error: 'DeepSeek response parse error: ' + result.body.slice(0, 100) });
    }

    if (result.status !== 200) {
      return res.status(result.status).json({
        error: 'DeepSeek error: ' + (parsed.error?.message || result.status)
      });
    }

    const text = (parsed.choices && parsed.choices[0] && parsed.choices[0].message)
      ? parsed.choices[0].message.content
      : '';

    return res.status(200).json({
      content: [{ type: 'text', text: text }]
    });

  } catch (err) {
    return res.status(500).json({ error: 'Handler error: ' + err.message });
  }
};
