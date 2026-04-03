import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { APP_DESCRIPTION, APP_NAME } from '@/config/constants';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
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
  themeColor: '#6f4627',
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
    <html lang="en-AU" suppressHydrationWarning className={`h-full ${manrope.variable}`}>
      <body suppressHydrationWarning className="min-h-full bg-surface text-on-surface">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
