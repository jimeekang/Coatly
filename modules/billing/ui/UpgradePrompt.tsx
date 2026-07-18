'use client';

import Link from 'next/link';
import { SectionLabel } from '@/components/ui/SectionLabel';

export function UpgradePrompt({
  badge = 'Pro Feature',
  title,
  description,
  href = '/settings/billing',
  ctaLabel = 'View Plans',
}: {
  badge?: string;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
}) {
  return (
    <section className="border-outline-variant from-surface via-surface-container-low to-primary-container/40 rounded-2xl border bg-gradient-to-br p-5 shadow-sm">
      <SectionLabel className="text-primary">{badge}</SectionLabel>
      <h2 className="text-on-surface mt-2 text-xl font-bold">{title}</h2>
      <p className="text-on-surface-variant mt-2 max-w-2xl text-sm">
        {description}
      </p>
      <div className="mt-4">
        <Link
          href={href}
          className="bg-primary text-on-primary focus-visible:ring-primary focus-visible:ring-offset-surface inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:px-5"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
