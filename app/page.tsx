import Link from 'next/link';
import type { Metadata } from 'next';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { APP_DESCRIPTION, APP_NAME } from '@/config/constants';

export const metadata: Metadata = {
  title: `${APP_NAME} — Job Management for Australian Painters`,
  description: APP_DESCRIPTION,
};

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 py-10">
      <div className="max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-md">
        <div className="mb-5 flex justify-center">
          <BrandLogo width={220} height={50} priority />
        </div>
        <h1 className="sr-only">{APP_NAME}</h1>
        <p className="mb-8 text-sm leading-6 text-on-surface-variant sm:text-base">
          Quote, invoice, and manage customers faster with a workspace built for Australian
          painters.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline px-6 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    </main>
  );
}
