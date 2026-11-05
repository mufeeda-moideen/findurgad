import fs from 'fs';
import path from 'path';

const configFilePath = path.join(process.cwd(), 'data', 'config.json');

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  ownerPhone: string;
}

export function getConfig(): WhatsAppConfig {
  let fileConfig: WhatsAppConfig = {
    phoneNumberId: '',
    accessToken: '',
    verifyToken: 'voltpulse_verify_secret_123',
    ownerPhone: '918921901702',
  };

  try {
    if (fs.existsSync(configFilePath)) {
      const data = fs.readFileSync(configFilePath, 'utf-8');
      fileConfig = { ...fileConfig, ...JSON.parse(data) };
    }
  } catch {
    // ignore
  }

  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || fileConfig.phoneNumberId,
    accessToken: process.env.WHATSAPP_TOKEN || fileConfig.accessToken,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || fileConfig.verifyToken,
    ownerPhone: process.env.WHATSAPP_OWNER_PHONE || fileConfig.ownerPhone || '918921901702',
  };
}

export function saveConfig(updates: Partial<WhatsAppConfig>) {
  const current = getConfig();
  const nextConfig: WhatsAppConfig = {
    phoneNumberId: updates.phoneNumberId !== undefined ? updates.phoneNumberId : current.phoneNumberId,
    accessToken: updates.accessToken !== undefined ? updates.accessToken : current.accessToken,
    verifyToken: updates.verifyToken !== undefined ? updates.verifyToken : current.verifyToken,
    ownerPhone: updates.ownerPhone !== undefined ? updates.ownerPhone : current.ownerPhone,
  };

  const dir = path.dirname(configFilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configFilePath, JSON.stringify(nextConfig, null, 2), 'utf-8');
  return nextConfig;
}

