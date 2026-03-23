import type { Metadata, Viewport } from 'next';
import { APP_DESCRIPTION, APP_NAME } from '@/config/constants';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

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
    <html lang="en-AU" suppressHydrationWarning className="h-full">
      <body suppressHydrationWarning className="min-h-full bg-white text-[#2C2C2A]">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
