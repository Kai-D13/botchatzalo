import http from 'http';
import fetch from 'node-fetch';

const GAS_URL =
  'https://script.google.com/macros/s/AKfycby7GJoRA6wXRm8jqalZf69pvamXz0HnKt4rPxlrP2BJnmcC5Pckt83G2AnqU_dR3gIczg/exec';

const server = http.createServer(async (req, res) => {
  // Ping
  if (req.method === 'GET' && req.url === '/') {
    const body = Buffer.from('ok', 'utf8');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', body.length);
    res.setHeader('Connection', 'close');
    return res.end(body);
  }

  // Proxy cho Zalo
  if (req.method === 'POST' && req.url === '/zalo-proxy') {
    try {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        // Forward y nguyên JSON nhận được
        const upstream = await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body || '{}'
        });

        const text = await upstream.text();   // đọc trọn để tránh stream/chunk
        const buf  = Buffer.from(text, 'utf8');

        // Ép header đúng chuẩn Zalo yêu cầu
        res.statusCode = 200;                 // Zalo cần 200
        res.setHeader('Content-Type', 'application/json'); // KHÔNG ;charset
        res.setHeader('Cache-Control', 'no-store, no-transform');
        res.setHeader('Content-Encoding', 'identity');     // không nén
        res.setHeader('Content-Length', buf.length);       // bắt buộc
        res.setHeader('Connection', 'close');              // tránh giữ kết nối
        return res.end(buf);
      });
    } catch (err) {
      const text = JSON.stringify({
        version: 'chatbot',
        content: { messages: [{ type: 'text', text: `Proxy error: ${err.message}` }] }
      });
      const buf = Buffer.from(text, 'utf8');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Encoding', 'identity');
      res.setHeader('Content-Length', buf.length);
      res.setHeader('Connection', 'close');
      return res.end(buf);
    }
    return;
  }

  // 404 các route khác
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  const notFound = Buffer.from('Not Found', 'utf8');
  res.setHeader('Content-Length', notFound.length);
  res.setHeader('Connection', 'close');
  res.end(notFound);
});

server.listen(process.env.PORT || 3000);
