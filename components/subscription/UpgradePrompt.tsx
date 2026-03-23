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
    <section className="rounded-3xl border border-pm-border bg-gradient-to-br from-white via-pm-surface to-pm-teal-light p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pm-teal">
        {badge}
      </p>
      <h2 className="mt-2 text-xl font-bold text-pm-body">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-pm-secondary">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={href}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-pm-teal px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover"
        >
          {ctaLabel}
        </Link>
        <Link
          href="/settings"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-pm-border bg-white px-4 py-3 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface"
        >
          Compare Plans
        </Link>
      </div>
    </section>
  );
}
