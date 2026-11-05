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

async function sendWhatsApp(phoneNumberId: string, accessToken: string, payload: unknown) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function POST(request: Request) {
  try {
    const { testPhone, productId } = await request.json();
    const config = getConfig();

    if (!config.phoneNumberId || !config.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Phone Number ID and Meta Access Token are required.' },
        { status: 400 }
      );
    }

    const cleanPhone = (testPhone || '918921901702').replace(/[^0-9]/g, '');

    // If a specific product was requested
    if (productId) {
      const products = getProducts();
      const product = products.find((p: { id: string }) => p.id === productId) || products[0];

      if (product) {
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const baseUrl = `${proto}://${host}`;

        const fullImageUrl = product.imageUrl
          ? (product.imageUrl.startsWith('http') ? product.imageUrl : `${baseUrl}${product.imageUrl}`)
          : null;

        const fullVoiceUrl = product.voiceUrl
          ? (product.voiceUrl.startsWith('http') ? product.voiceUrl : `${baseUrl}${product.voiceUrl}`)
          : null;

        // 1. Send Product Image
        if (fullImageUrl) {
          await sendWhatsApp(config.phoneNumberId, config.accessToken, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'image',
            image: { link: fullImageUrl },
          });
        }

        // 2. Send Product Description
        if (product.description) {
          await sendWhatsApp(config.phoneNumberId, config.accessToken, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: {
              body: `*${product.name}*\n\n${product.description}`,
            },
          });
        }

        // 3. Send Staff Voice Recording (Audio)
        if (fullVoiceUrl) {
          await sendWhatsApp(config.phoneNumberId, config.accessToken, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'audio',
            audio: { link: fullVoiceUrl },
          });
        }

        return NextResponse.json({
          success: true,
          message: `Product info for ${product.name} sent to ${cleanPhone}`,
        });
      }
    }

    // Default connection test message
    const data = await sendWhatsApp(config.phoneNumberId, config.accessToken, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        body: '🎉 *VoltPulse WhatsApp Automation Active!*\n\nYour Meta Cloud API is successfully connected. When customers click your Facebook / Instagram ads, your product image, description, and staff voice note will be sent automatically!',
      },
    });

    if (data?.error) {
      return NextResponse.json(
        { success: false, error: data.error.message || 'Meta API returned an error' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, metaResponse: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
