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
    <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(10,174,143,0.18),_transparent_38%),linear-gradient(180deg,_#f7fbfb_0%,_#eef5f4_100%)] px-6 py-10">
      <div className="max-w-md rounded-[28px] border border-white/70 bg-white/90 p-8 text-center shadow-[0_24px_60px_rgba(22,42,42,0.08)] backdrop-blur">
        <div className="mb-5 flex justify-center">
          <BrandLogo width={220} height={50} priority />
        </div>
        <h1 className="sr-only">{APP_NAME}</h1>
        <p className="mb-8 text-sm leading-6 text-pm-secondary sm:text-base">
          Quote, invoice, and manage customers faster with a workspace built for Australian
          painters.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-pm-teal px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-pm-border px-6 py-3 text-sm font-semibold text-pm-body transition-colors hover:bg-pm-surface"
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    </main>
  );
}
