import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getConfig } from '@/lib/whatsapp';

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

// Meta Webhook Verification Handshake
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const config = getConfig();

  if (mode === 'subscribe' && token === config.verifyToken) {
    console.log('[Meta Webhook] Handshake verified successfully.');
    return new Response(challenge, { status: 200 });
  }

  return new Response('Verification failed: token mismatch', { status: 403 });
}

// Helper to call Meta WhatsApp Graph API
async function sendWhatsAppMessage(phoneNumberId: string, accessToken: string, payload: unknown) {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    return result;
  } catch (err) {
    console.error('[Meta Webhook] Error sending message:', err);
    return null;
  }
}

// Handle Incoming WhatsApp Messages triggered from Meta Ads
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = getConfig();

    if (!config.phoneNumberId || !config.accessToken) {
      console.warn('[Meta Webhook] Missing WhatsApp credentials in config.');
      return NextResponse.json({ status: 'credentials_missing' }, { status: 200 });
    }

    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    // Only process actual customer messages (ignore status delivery updates)
    if (message) {
      const customerPhone = message.from;
      // Meta Click-to-WhatsApp ads attach a "referral" object with the ad ID
      const adId = message.referral?.source_id;
      const adHeadline = message.referral?.headline || '';
      const textBody = message.text?.body || '';

      console.log(`[Meta Webhook] Received message from ${customerPhone}. Ad ID: ${adId || 'None'}`);

      const products = getProducts();
      // Match product by Meta Ad ID or fallback to first product
      let matchedProduct = null;

      if (adId) {
        matchedProduct = products.find((p: { adId: string }) => p.adId && p.adId.trim() === adId.trim());
      }

      // If no direct ad ID match, check if ad headline mentions product name
      if (!matchedProduct && adHeadline) {
        matchedProduct = products.find((p: { name: string }) =>
          adHeadline.toLowerCase().includes(p.name.toLowerCase())
        );
      }

      // If customer sent a text message, check if it matches product name or Ad ID
      if (!matchedProduct && textBody) {
        const query = textBody.toLowerCase().trim();
        matchedProduct = products.find((p: { name: string; adId: string }) => {
          const pName = p.name.toLowerCase();
          const pAdId = (p.adId || '').toLowerCase();
          return (
            query.includes(pName) ||
            pName.includes(query) ||
            (pAdId && query.includes(pAdId)) ||
            (pAdId && pAdId.includes(query)) ||
            pName.split(' ').some((word: string) => word.length > 3 && query.includes(word))
          );
        });
      }

      // Default fallback to first active product if only one exists or for testing
      if (!matchedProduct && products.length > 0) {
        matchedProduct = products[0];
      }

      if (matchedProduct) {
        console.log(`[Meta Webhook] Matched product: ${matchedProduct.name}. Sending responses...`);

        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const baseUrl = `${proto}://${host}`;

        const fullImageUrl = matchedProduct.imageUrl
          ? (matchedProduct.imageUrl.startsWith('http') ? matchedProduct.imageUrl : `${baseUrl}${matchedProduct.imageUrl}`)
          : null;

        const fullVoiceUrl = matchedProduct.voiceUrl
          ? (matchedProduct.voiceUrl.startsWith('http') ? matchedProduct.voiceUrl : `${baseUrl}${matchedProduct.voiceUrl}`)
          : null;

        // 1. Send Product Image
        if (fullImageUrl) {
          await sendWhatsAppMessage(config.phoneNumberId, config.accessToken, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: customerPhone,
            type: 'image',
            image: { link: fullImageUrl },
          });
        }

        const cleanOwnerPhone = (config.ownerPhone || '').replace(/[^0-9]/g, '');

        // 2. Send Product Description + Human Staff Chat Link
        if (matchedProduct.description) {
          const humanChatLink = cleanOwnerPhone
            ? `\n\n💬 *Want to speak directly with our team?*\nTap to chat with us: https://wa.me/${cleanOwnerPhone}`
            : '';

          await sendWhatsAppMessage(config.phoneNumberId, config.accessToken, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: customerPhone,
            type: 'text',
            text: {
              body: `*${matchedProduct.name}*\n\n${matchedProduct.description}${humanChatLink}`,
            },
          });
        }

        // 3. Send Staff Voice Recording (Audio)
        if (fullVoiceUrl) {
          await sendWhatsAppMessage(config.phoneNumberId, config.accessToken, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: customerPhone,
            type: 'audio',
            audio: { link: fullVoiceUrl },
          });
        }

        // 4. Instant Alert to Store Owner's Personal WhatsApp for Manual Takeover
        if (cleanOwnerPhone && customerPhone !== cleanOwnerPhone) {
          await sendWhatsAppMessage(config.phoneNumberId, config.accessToken, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanOwnerPhone,
            type: 'text',
            text: {
              body: `🚨 *New Customer Enquiry from Meta Ad!*\n\n• *Product:* ${matchedProduct.name}\n• *Customer Phone:* +${customerPhone}\n• *Customer Message:* "${textBody || 'Clicked Ad'}"\n\n👉 *Tap below to reply directly from your personal WhatsApp:*\nhttps://wa.me/${customerPhone}`,
            },
          });
        }
      }
    }

    // Meta requires a fast HTTP 200 response
    return NextResponse.json({ status: 'EVENT_RECEIVED' });
  } catch (error) {
    console.error('[Meta Webhook] Error processing event:', error);
    return NextResponse.json({ status: 'error', error: String(error) }, { status: 200 });
  }
}
