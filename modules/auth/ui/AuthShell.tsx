import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { SectionLabel } from '@/components/shared/SectionLabel';

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
  'w-full rounded-2xl border border-outline-variant bg-surface-container-lowest/95 p-6 shadow-lg backdrop-blur sm:p-8';

export function AuthShell({
  eyebrow = 'Painter workspace',
  title,
  description,
  children,
  footer,
  sideTitle = 'Less admin. More time on the tools.',
  sideDescription = 'Quotes, invoices, scheduling and customer follow-ups in one place — built for Australian painting businesses.',
  sideHighlights = [
    'Send professional quotes and invoices from any job site.',
    'Follow-up reminders so no quote goes cold.',
    'Works one-handed on your phone, even with gloves on.',
  ],
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-surface via-surface-container-low to-surface-container px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <div className="grid w-full items-center gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,430px)] lg:gap-10">
          <section className="hidden lg:block rounded-2xl border border-outline-variant bg-surface-container-lowest/60 p-6 shadow-lg backdrop-blur sm:p-8 lg:p-10">
            <SectionLabel className="tracking-[0.18em] text-primary/80">
              {eyebrow}
            </SectionLabel>
            <div className="mt-4">
              <BrandLogo width={220} height={50} priority />
            </div>
            <h1 className="mt-8 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.02em] text-on-surface">
              {sideTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant sm:text-lg">
              {sideDescription}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {sideHighlights.map((highlight) => (
                <div
                  key={highlight}
                  className="rounded-2xl border border-outline-variant bg-surface-container-lowest/80 px-4 py-4 text-sm leading-6 text-on-surface shadow-sm"
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
                <SectionLabel className="tracking-[0.18em] text-primary/80">
                  {eyebrow}
                </SectionLabel>
                <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] text-on-surface">
                  {title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant sm:text-base">
                  {description}
                </p>
              </div>

              {children}
            </div>

            {footer ? (
              <div className="mt-5 text-center text-sm leading-6 text-on-surface-variant">{footer}</div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
