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
    <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(139,94,60,0.12),transparent_38%),linear-gradient(180deg,#fcf9f4_0%,#f2eee9_100%)] px-6 py-10">
      <div className="max-w-md rounded-[28px] border border-white/70 bg-white/90 p-8 text-center shadow-[0_24px_60px_rgba(22,42,42,0.08)] backdrop-blur">
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
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline px-6 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    </main>
  );
}
