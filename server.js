import express from 'express';
import fetch from 'node-fetch';

const app = express();
// Nhận JSON
app.use(express.json({ limit: '1mb' }));

// Apps Script Web App URL của bạn
const GAS_URL = 'https://script.google.com/macros/s/AKfycby7GJoRA6wXRm8jqalZf69pvamXz0HnKt4rPxlrP2BJnmcC5Pckt83G2AnqU_dR3gIczg/exec';

// Proxy cho Zalo
app.post('/zalo-proxy', async (req, res) => {
  try {
    // (Debug) xem Zalo gửi gì tới proxy
    console.log('IN:', JSON.stringify(req.body));

    // Forward sang Apps Script
    const upstream = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });

    const text = await upstream.text(); // đọc toàn bộ để không stream
    console.log('OUT:', text);

    // Ép header chuẩn JSON và không chunked
    const bytes = Buffer.byteLength(text, 'utf8');
    res.setHeader('Content-Type', 'application/json');            // KHÔNG kèm ;charset
    res.setHeader('Cache-Control', 'no-store, no-transform');
    res.setHeader('Content-Encoding', 'identity');                // tránh nén
    res.removeHeader('Transfer-Encoding');                        // tránh chunked
    res.setHeader('Content-Length', String(bytes));               // bắt buộc
    res.setHeader('Connection', 'close');

    // Dùng end() để Node không tự thêm gì nữa
    return res.status(200).end(text, 'utf8');                     // Zalo cần 200
  } catch (err) {
    const body = JSON.stringify({
      version: "chatbot",
      content: { messages: [{ type: "text", text: `Proxy error: ${err.message}` }] }
    });
    const bytes = Buffer.byteLength(body, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Encoding', 'identity');
    res.removeHeader('Transfer-Encoding');
    res.setHeader('Content-Length', String(bytes));
    res.setHeader('Connection', 'close');
    return res.status(200).end(body, 'utf8');
  }
});

// Ping
app.get('/', (_req, res) => res.type('text').send('ok'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('listening on ' + port));
