import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { APP_DESCRIPTION, APP_NAME } from '@/config/constants';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';
import { cn } from '@/lib/utils';

// Single app typeface. `--font-sans` feeds the Tailwind `font-sans` utility
// and the `--font-heading` alias in globals.css.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
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
  // Matches --color-surface so browser chrome blends with the app header.
  themeColor: '#FAF7F2',
  width: 'device-width',
  initialScale: 1,
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
      className={cn('h-full', manrope.variable, 'font-sans')}
    >
      <body
        suppressHydrationWarning
        className="bg-surface text-on-surface min-h-full"
      >
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
