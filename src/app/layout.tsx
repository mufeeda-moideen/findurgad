import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FIND UR GAD | Admin & WhatsApp Product Automation',
  description: 'Find Ur Gad - Gadgets, Accessories, Custom Cases. Your Tech Destination with Meta Click-to-WhatsApp automation.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-[#111111] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
