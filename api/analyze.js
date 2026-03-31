const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return res.status(500).json({ error: 'DEEPSEEK_API_KEY missing' });

  const messages = (req.body && req.body.messages) ? req.body.messages : [];
  if (!messages.length) return res.status(400).json({ error: 'No messages' });

  const payload = JSON.stringify({ model: 'deepseek-chat', max_tokens: 900, messages });

  try {
    const result = await new Promise((resolve, reject) => {
      const opts = {
        hostname: 'api.deepseek.com',
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key,
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      const r = https.request(opts, (apiRes) => {
        let d = '';
        apiRes.on('data', c => d += c);
        apiRes.on('end', () => resolve({ status: apiRes.statusCode, body: d }));
      });
      r.on('error', reject);
      r.write(payload);
      r.end();
    });

    let parsed;
    try { parsed = JSON.parse(result.body); }
    catch(e) { return res.status(500).json({ error: 'Parse error: ' + result.body.slice(0, 100) }); }

    if (result.status !== 200) {
      return res.status(result.status).json({ error: 'DeepSeek: ' + (parsed.error?.message || result.status) });
    }

    const text = parsed.choices?.[0]?.message?.content || '';
    return res.status(200).json({ content: [{ type: 'text', text }] });

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
};
