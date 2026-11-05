import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/whatsapp';

export async function GET() {
  const config = getConfig();
  return NextResponse.json({
    phoneNumberId: config.phoneNumberId,
    verifyToken: config.verifyToken,
    ownerPhone: config.ownerPhone,
    hasToken: Boolean(config.accessToken),
    tokenPreview: config.accessToken ? `${config.accessToken.substring(0, 8)}...` : '',
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    saveConfig(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
