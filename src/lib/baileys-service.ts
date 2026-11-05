import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';

const authDirPath = path.join(process.cwd(), 'data', 'baileys_auth');
const productsFilePath = path.join(process.cwd(), 'data', 'products.json');

function getProducts() {
  try {
    if (!fs.existsSync(productsFilePath)) return [];
    const data = fs.readFileSync(productsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function getMediaContent(urlOrPath: string): { url: string } | Buffer {
  if (!urlOrPath) throw new Error('Empty media path');
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return { url: urlOrPath };
  }
  const cleanPath = urlOrPath.startsWith('/') ? urlOrPath.slice(1) : urlOrPath;
  const localFile = path.join(process.cwd(), 'public', cleanPath);
  if (fs.existsSync(localFile)) {
    return fs.readFileSync(localFile);
  }
  return { url: urlOrPath };
}

interface WhatsAppDeviceState {
  sock: WASocket | null;
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected';
  qrDataUrl: string | null;
  connectedPhone: string | null;
  lastError: string | null;
  isInitializing: boolean;
}

// Global singleton to persist across Next.js API requests
const globalState: WhatsAppDeviceState = (global as unknown as { __waDeviceState?: WhatsAppDeviceState }).__waDeviceState || {
  sock: null,
  status: 'disconnected',
  qrDataUrl: null,
  connectedPhone: null,
  lastError: null,
  isInitializing: false,
};
(global as unknown as { __waDeviceState: WhatsAppDeviceState }).__waDeviceState = globalState;

export async function getWhatsAppDeviceStatus() {
  // If we already have saved credentials and socket is not yet started, try restoring connection
  if (!globalState.sock && fs.existsSync(authDirPath) && fs.readdirSync(authDirPath).length > 0) {
    if (!globalState.isInitializing) {
      initWhatsAppDevice().catch(console.error);
    }
  }

  return {
    status: globalState.status,
    qrDataUrl: globalState.qrDataUrl,
    connectedPhone: globalState.connectedPhone,
    lastError: globalState.lastError,
  };
}

export async function initWhatsAppDevice() {
  if (globalState.isInitializing) return;
  globalState.isInitializing = true;
  globalState.status = 'connecting';
  globalState.lastError = null;

  try {
    if (!fs.existsSync(authDirPath)) {
      fs.mkdirSync(authDirPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDirPath);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['FIND UR GAD', 'Chrome', '1.0.0'],
      syncFullHistory: false,
    });

    globalState.sock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, {
            margin: 2,
            width: 320,
            color: {
              dark: '#111111',
              light: '#ffffff',
            },
          });
          globalState.qrDataUrl = qrDataUrl;
          globalState.status = 'qr_ready';
          console.log('[WhatsApp Linked Device] New QR code generated.');
        } catch (qrErr) {
          console.error('[WhatsApp Linked Device] Error rendering QR code:', qrErr);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log('[WhatsApp Linked Device] Connection closed. Status code:', statusCode, 'Error:', lastDisconnect?.error);

        globalState.sock = null;
        globalState.qrDataUrl = null;
        globalState.isInitializing = false;

        if (statusCode === DisconnectReason.loggedOut) {
          globalState.status = 'disconnected';
          globalState.connectedPhone = null;
          // Clear credentials directory on logout
          if (fs.existsSync(authDirPath)) {
            fs.rmSync(authDirPath, { recursive: true, force: true });
          }
        } else {
          globalState.status = 'disconnected';
          // Auto reconnect after brief pause
          setTimeout(() => {
            initWhatsAppDevice().catch(console.error);
          }, 3000);
        }
      } else if (connection === 'open') {
        console.log('[WhatsApp Linked Device] Connected successfully!');
        globalState.status = 'connected';
        globalState.qrDataUrl = null;
        globalState.isInitializing = false;

        const rawId = sock.user?.id || '';
        const phone = rawId.split(':')[0] || rawId.split('@')[0];
        globalState.connectedPhone = phone;
      }
    });

    // Listen for incoming customer messages & Meta Ad referrals
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        // Skip messages sent by the device itself
        if (msg.key.fromMe) continue;
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid.includes('@g.us')) continue; // Skip groups

        // Extract message text
        const textBody =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          '';

        // Check for ad context information attached by Meta Click-to-WhatsApp ads
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const adTitle = contextInfo?.externalAdReply?.title || '';
        const adBody = contextInfo?.externalAdReply?.body || '';
        const adSourceUrl = contextInfo?.externalAdReply?.sourceUrl || '';

        console.log(`[WhatsApp Linked Device] Incoming message from ${remoteJid}: "${textBody}"`);
        if (adTitle) console.log(`[WhatsApp Linked Device] Ad Title: "${adTitle}"`);

        const products = getProducts();
        if (products.length === 0) continue;

        let matchedProduct = null;

        // 1. Try matching by Meta Ad ID if mentioned or query
        const query = (textBody + ' ' + adTitle + ' ' + adBody + ' ' + adSourceUrl).toLowerCase().trim();

        matchedProduct = products.find((p: { adId?: string; name: string }) => {
          const pAdId = (p.adId || '').toLowerCase().trim();
          const pName = p.name.toLowerCase().trim();

          if (pAdId && query.includes(pAdId)) return true;
          if (query.includes(pName) || pName.includes(query)) return true;

          // Check distinct words
          const words = pName.split(' ').filter((w: string) => w.length > 3);
          return words.some((w: string) => query.includes(w));
        });

        // If no match found, fallback to first product
        if (!matchedProduct && products.length > 0) {
          matchedProduct = products[0];
        }

        if (matchedProduct) {
          console.log(`[WhatsApp Linked Device] Replying with product: "${matchedProduct.name}"...`);

          try {
            // 1. Send Product Image with Caption
            if (matchedProduct.imageUrl) {
              const imageMedia = getMediaContent(matchedProduct.imageUrl);
              await sock.sendMessage(remoteJid, {
                image: imageMedia as any,
                caption: `*${matchedProduct.name}*\n\n${matchedProduct.description}`,
              });
            } else if (matchedProduct.description) {
              await sock.sendMessage(remoteJid, {
                text: `*${matchedProduct.name}*\n\n${matchedProduct.description}`,
              });
            }

            // 2. Send Recorded Voice Note (PTT = Push to Talk voice memo with green mic!)
            if (matchedProduct.voiceUrl) {
              const audioMedia = getMediaContent(matchedProduct.voiceUrl);
              await sock.sendMessage(remoteJid, {
                audio: audioMedia as any,
                mimetype: 'audio/mp4',
                ptt: true, // Appears as a real green voice memo waveform!
              });
            }

            console.log(`[WhatsApp Linked Device] Automated reply delivered to ${remoteJid}`);
          } catch (replyErr) {
            console.error('[WhatsApp Linked Device] Error sending automated reply:', replyErr);
          }
        }
      }
    });
  } catch (err) {
    console.error('[WhatsApp Linked Device] Failed to initialize:', err);
    globalState.status = 'disconnected';
    globalState.lastError = String(err);
    globalState.isInitializing = false;
  }
}

export async function disconnectWhatsAppDevice() {
  if (globalState.sock) {
    try {
      await globalState.sock.logout();
    } catch {
      // ignore
    }
    globalState.sock = null;
  }

  globalState.status = 'disconnected';
  globalState.qrDataUrl = null;
  globalState.connectedPhone = null;
  globalState.lastError = null;
  globalState.isInitializing = false;

  if (fs.existsSync(authDirPath)) {
    fs.rmSync(authDirPath, { recursive: true, force: true });
  }

  console.log('[WhatsApp Linked Device] Disconnected and session cleared.');
}
