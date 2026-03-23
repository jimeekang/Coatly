import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { APP_DESCRIPTION, APP_NAME } from '@/config/constants';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: '#085041',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-AU"
      suppressHydrationWarning
      className={`${inter.variable} h-full`}
    >
      <body suppressHydrationWarning className="min-h-full bg-white text-[#2C2C2A]">
        {children}
      </body>
    </html>
  );
}
