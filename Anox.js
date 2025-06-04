const fs = require('fs');
const http = require('http');
const { WebSocketServer } = require('ws');
const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');

const PORT = 3000;
const SESSION_FILE = './session.json';
const { state, saveState } = useSingleFileAuthState(SESSION_FILE);

let wsClient = null;

// HTML पेज जिसमें QR दिखेगा
const html = `
<!DOCTYPE html>
<html>
<head>
  <title>WhatsApp QR Login</title>
</head>
<body>
  <h2>WhatsApp QR Code Login</h2>
  <pre id="qr" style="font-size: 18px; background: #eee; padding: 10px;"></pre>
  <script>
    const qrElem = document.getElementById('qr');
    const ws = new WebSocket('ws://' + location.host);

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if(data.qr) {
        qrElem.textContent = data.qr;
      }
      if(data.status) {
        qrElem.textContent = data.status;
      }
    };
  </script>
</body>
</html>
`;

// HTTP Server जो HTML serve करेगा
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

// WebSocket Server QR भेजने के लिए
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  wsClient = ws;
});

async function startWhatsApp() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    const { qr, connection, lastDisconnect } = update;

    if(qr && wsClient) {
      wsClient.send(JSON.stringify({ qr }));
    }

    if(connection === 'open') {
      console.log('✅ WhatsApp Connected!');
      if(wsClient) wsClient.send(JSON.stringify({ status: 'WhatsApp Connected!' }));
    }

    if(connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== 401);
      console.log('Connection closed. Reconnect?', shouldReconnect);
      if(shouldReconnect) startWhatsApp();
    }
  });
}

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

startWhatsApp();
