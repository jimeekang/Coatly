import Link from 'next/link';

export function UpgradePrompt({
  badge = 'Pro Feature',
  title,
  description,
  href = '/settings',
  ctaLabel = 'View Plans',
}: {
  badge?: string;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
}) {
  return (
    <section className="rounded-2xl border border-outline-variant bg-gradient-to-br from-surface via-surface-container-low to-primary-container/40 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {badge}
      </p>
      <h2 className="mt-2 text-xl font-bold text-on-surface">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={href}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-opacity hover:opacity-90 sm:px-5"
        >
          {ctaLabel}
        </Link>
        <Link
          href="/settings"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-outline-variant bg-surface-container px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high active:bg-outline-variant sm:px-5"
        >
          Compare Plans
        </Link>
      </div>
    </section>
  );
}
