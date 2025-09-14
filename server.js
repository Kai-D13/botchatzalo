import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.disable('x-powered-by');
// ĐỌC JSON BODY
app.use(express.json({ limit: '1mb' }));

// URL Apps Script của bạn:
const GAS_URL = 'https://script.google.com/macros/s/AKfycby7GJoRA6wXRm8jqalZf69pvamXz0HnKt4rPxlrP2BJnmcC5Pckt83G2AnqU_dR3gIczg/exec';

// Health check
app.get('/', (req, res) => res.type('text').send('ok'));

// Proxy Zalo -> GAS (đảm bảo Content-Length)
app.post('/zalo-proxy', async (req, res) => {
  try {
    const upstream = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });

    const text = await upstream.text(); // đọc TRỌN body
    const ct = upstream.headers.get('content-type') || 'application/json';

    // Quan trọng: tự set Content-Length, không dùng res.json (tránh chunked)
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'no-store');
    res.set('Content-Encoding', 'identity'); // chống nén
    res.set('Content-Length', Buffer.byteLength(text, 'utf8'));

    return res.status(200).send(text); // Zalo yêu cầu 200
  } catch (e) {
    const body = JSON.stringify({
      version: "chatbot",
      content: { messages: [{ type: "text", text: `Proxy error: ${e.message}` }] }
    });
    res.set('Content-Type', 'application/json');
    res.set('Cache-Control', 'no-store');
    res.set('Content-Encoding', 'identity');
    res.set('Content-Length', Buffer.byteLength(body, 'utf8'));
    return res.status(200).send(body);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('listening on ' + port));
