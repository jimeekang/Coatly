import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/branding/BrandLogo';

type AuthShellProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  sideTitle?: string;
  sideDescription?: string;
  sideHighlights?: string[];
};

const cardClassName =
  'w-full rounded-[28px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(22,42,42,0.08)] backdrop-blur sm:p-8';

export function AuthShell({
  eyebrow = 'Painter workspace',
  title,
  description,
  children,
  footer,
  sideTitle = 'The calm admin layer for busy painting teams.',
  sideDescription = 'Keep quotes, invoices, and customer follow-up moving without losing the grounded, professional feel your clients expect.',
  sideHighlights = [
    'Mobile-first forms sized for job sites and one-handed use.',
    'Warm, professional documents that match the Coatly brand language.',
    'A consistent surface system so every screen feels like the same app.',
  ],
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,94,60,0.12),_transparent_28%),linear-gradient(180deg,_#fcf9f4_0%,_#f2eee9_45%,_#ebe6df_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <div className="grid w-full items-center gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,430px)] lg:gap-10">
          <section className="rounded-[32px] border border-white/70 bg-white/50 p-6 shadow-[0_24px_60px_rgba(22,42,42,0.06)] backdrop-blur sm:p-8 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-pm-teal-hover/80">
              {eyebrow}
            </p>
            <div className="mt-4">
              <BrandLogo width={220} height={50} priority />
            </div>
            <h1 className="mt-8 max-w-xl text-4xl font-semibold leading-tight text-pm-body sm:text-[44px]">
              {sideTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-pm-secondary sm:text-lg">
              {sideDescription}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {sideHighlights.map((highlight) => (
                <div
                  key={highlight}
                  className="rounded-2xl border border-pm-border/70 bg-white/80 px-4 py-4 text-sm leading-6 text-pm-body shadow-sm"
                >
                  {highlight}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className={cardClassName}>
              <div className="mb-8">
                <div className="mb-5 lg:hidden">
                  <BrandLogo width={176} height={40} priority />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pm-teal-hover/70">
                  {eyebrow}
                </p>
                <h2 className="mt-3 text-[30px] font-semibold leading-tight text-pm-body sm:text-[34px]">
                  {title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-pm-secondary sm:text-base">
                  {description}
                </p>
              </div>

              {children}
            </div>

            {footer ? (
              <div className="mt-5 text-center text-sm leading-6 text-pm-secondary">{footer}</div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
