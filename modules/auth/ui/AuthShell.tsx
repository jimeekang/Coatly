import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { SectionLabel } from '@/components/ui/SectionLabel';

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
  'w-full rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-lg sm:p-8';

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
    'Professional quotes and invoices ready to send to your clients.',
    'Keep every job organised from the first quote to final payment.',
  ],
}: AuthShellProps) {
  return (
    <main className="bg-surface min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <div className="grid w-full items-center gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,430px)] lg:gap-10">
          <section className="border-outline-variant bg-surface-container-low hidden rounded-2xl border p-6 shadow-sm sm:p-8 lg:block lg:p-10">
            <SectionLabel className="text-primary">{eyebrow}</SectionLabel>
            <div className="mt-4">
              <BrandLogo width={220} height={50} priority />
            </div>
            <h1 className="text-on-surface mt-8 max-w-xl text-4xl leading-tight font-semibold">
              {sideTitle}
            </h1>
            <p className="text-on-surface-variant mt-4 max-w-2xl text-base leading-7 sm:text-lg">
              {sideDescription}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {sideHighlights.map((highlight) => (
                <div
                  key={highlight}
                  className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-2xl border px-4 py-4 text-sm leading-6 shadow-sm"
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
                <SectionLabel className="text-primary">{eyebrow}</SectionLabel>
                <h2 className="text-on-surface mt-3 text-2xl leading-tight font-semibold sm:text-3xl">
                  {title}
                </h2>
                <p className="text-on-surface-variant mt-3 text-sm leading-6 sm:text-base">
                  {description}
                </p>
              </div>

              {children}
            </div>

            {footer ? (
              <div className="text-on-surface-variant mt-5 text-center text-sm leading-6">
                {footer}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
