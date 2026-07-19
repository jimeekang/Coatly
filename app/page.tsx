import Link from 'next/link';
import type { Metadata } from 'next';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { APP_DESCRIPTION, APP_NAME } from '@/config/constants';

export const metadata: Metadata = {
  title: `${APP_NAME} — Quotes & Invoices for Australian Painters`,
  description: APP_DESCRIPTION,
};

export default function LandingPage() {
  return (
    <main className="bg-surface flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="border-outline-variant bg-surface-container-lowest max-w-md rounded-2xl border p-8 text-center shadow-lg">
        <div className="mb-5 flex justify-center">
          <BrandLogo width={220} height={50} priority />
        </div>
        <h1 className="sr-only">{APP_NAME}</h1>
        <p className="text-on-surface-variant mb-8 text-sm leading-6 sm:text-base">
          Quote, invoice, and manage customers faster with a workspace built for
          Australian painters.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 inline-flex min-h-12 items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/30 inline-flex min-h-12 items-center justify-center rounded-xl border px-6 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    </main>
  );
}
