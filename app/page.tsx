import Link from 'next/link';
import type { Metadata } from 'next';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { APP_DESCRIPTION, APP_NAME } from '@/config/constants';

export const metadata: Metadata = {
  title: `${APP_NAME} — Quotes & Invoices for Australian Painters`,
  description: APP_DESCRIPTION,
};

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-surface via-surface to-primary-fixed/30">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 hidden bg-[linear-gradient(to_right,transparent_0,transparent_calc(50%-1px),rgba(11,122,100,0.08)_50%,transparent_calc(50%+1px))] lg:block"
      />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-outline-variant pb-5">
          <BrandLogo width={196} height={44} priority />
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Sign in
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] lg:gap-20 lg:py-16">
          <div className="max-w-3xl">
            <SectionLabel className="text-primary">Built for Australian painters</SectionLabel>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-[-0.03em] text-on-surface sm:max-w-2xl">
              Keep every job moving, from quote to paid.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-on-surface-variant sm:text-lg sm:leading-8">
              Create professional quotes, schedule the work, invoice customers, and follow up
              without losing the day to admin.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-base font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              >
                Start free
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-outline bg-surface-container-lowest/70 px-6 text-base font-semibold text-on-surface transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              >
                Open your workspace
              </Link>
            </div>
          </div>

          <div className="border-l border-outline pl-6 sm:pl-8 lg:pl-10">
            <SectionLabel>One workspace</SectionLabel>
            <ol className="mt-5 divide-y divide-outline-variant">
              {[
                ['01', 'Quote clearly', 'Build and send professional quotes from the job site.'],
                ['02', 'Plan the work', 'Keep customers, dates, and job details together.'],
                ['03', 'Close the loop', 'Invoice, track payment, and follow up on time.'],
              ].map(([number, title, description]) => (
                <li key={number} className="grid grid-cols-[2.5rem_1fr] gap-3 py-5 first:pt-0">
                  <span className="font-mono text-xs font-bold tracking-[0.14em] text-primary">
                    {number}
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-on-surface">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-on-surface-variant">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <footer className="border-t border-outline-variant pt-5 text-xs text-on-surface-variant">
          Quotes, invoices, scheduling, and customer follow-ups for small painting businesses.
        </footer>
      </div>
    </main>
  );
}
