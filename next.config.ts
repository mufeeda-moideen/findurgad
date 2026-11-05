import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: [
    '@whiskeysockets/baileys',
    'ws',
    'bufferutil',
    'utf-8-validate',
    'pino',
    'pino-pretty',
    'qrcode',
  ],
};

export default nextConfig;
