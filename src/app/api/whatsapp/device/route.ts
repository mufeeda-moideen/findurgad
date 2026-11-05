import { NextResponse } from 'next/server';
import {
  getWhatsAppDeviceStatus,
  initWhatsAppDevice,
  disconnectWhatsAppDevice,
} from '@/lib/baileys-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getWhatsAppDeviceStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { status: 'error', lastError: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === 'connect') {
      await initWhatsAppDevice();
      const status = await getWhatsAppDeviceStatus();
      return NextResponse.json({ success: true, ...status });
    }

    if (action === 'disconnect') {
      await disconnectWhatsAppDevice();
      return NextResponse.json({ success: true, status: 'disconnected' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

