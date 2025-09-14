import http from 'http';
import fetch from 'node-fetch';

const GAS_URL =
  'https://script.google.com/macros/s/AKfycby7GJoRA6wXRm8jqalZf69pvamXz0HnKt4rPxlrP2BJnmcC5Pckt83G2AnqU_dR3gIczg/exec';

const sendJson = (res, statusCode, text) => {
  const buf = Buffer.from(text, 'utf8');
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Encoding': 'identity',
    'Cache-Control': 'no-store, no-transform',
    'Content-Length': buf.length,
    'Connection': 'close'
  });
  res.end(buf);
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    const buf = Buffer.from('ok', 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Content-Length': buf.length,
      'Connection': 'close'
    });
    return res.end(buf);
  }

  if (req.method === 'POST' && req.url === '/zalo-proxy') {
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end', async () => {
      // 1) XÁC THỰC JSON
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch (e) {
        const out = JSON.stringify({
          version: 'chatbot',
          content: { messages: [
            { type: 'text',
              text: `❌ Proxy: JSON không hợp lệ. Body nhận được (50 ký tự đầu): ${String(raw).slice(0,50)}`
            }
          ] }
        });
        return sendJson(res, 200, out);
      }

      // 2) FORWARD JSON HỢP LỆ SANG GAS
      try {
        const upstream = await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const text = await upstream.text();
        return sendJson(res, 200, text); // trả y nguyên cho Zalo
      } catch (err) {
        const out = JSON.stringify({
          version: 'chatbot',
          content: { messages: [{ type: 'text', text: `Proxy error: ${err.message}` }] }
        });
        return sendJson(res, 200, out);
      }
    });
    return;
  }

  const nf = Buffer.from('Not Found', 'utf8');
  res.writeHead(404, {
    'Content-Type': 'text/plain',
    'Content-Length': nf.length,
    'Connection': 'close'
  });
  res.end(nf);
});

server.listen(process.env.PORT || 3000);
