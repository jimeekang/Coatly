import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Material / Service' };

export default function MaterialsServicePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-bold text-pm-body">Material / Service</h1>
        <p className="mt-1 text-sm text-pm-secondary">
          Keep your pricing items in one place for paints, prep work, and common services.
        </p>
      </div>

      <section className="rounded-2xl border border-pm-border bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-pm-secondary">
          Coming Next
        </p>
        <h2 className="mt-2 text-lg font-semibold text-pm-body">
          Material and service library is not built yet
        </h2>
        <p className="mt-2 text-sm text-pm-secondary">
          This page will hold reusable rate cards, service items, and material lists that
          can feed quotes and invoices.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-pm-surface p-4">
            <p className="text-sm font-semibold text-pm-body">Materials</p>
            <p className="mt-1 text-sm text-pm-secondary">
              Store paints, sundries, and supplier references.
            </p>
          </div>
          <div className="rounded-xl bg-pm-surface p-4">
            <p className="text-sm font-semibold text-pm-body">Services</p>
            <p className="mt-1 text-sm text-pm-secondary">
              Save common labour items like prep, patching, and finishing.
            </p>
          </div>
          <div className="rounded-xl bg-pm-surface p-4">
            <p className="text-sm font-semibold text-pm-body">Reusable Pricing</p>
            <p className="mt-1 text-sm text-pm-secondary">
              Reuse standard items across quotes, jobs, and invoices.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
