import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Jobs' };

export default function JobsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-bold text-pm-body">Jobs</h1>
        <p className="mt-1 text-sm text-pm-secondary">
          Track active work, site progress, and job handover from one place.
        </p>
      </div>

      <section className="rounded-2xl border border-pm-border bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-pm-secondary">
          Coming Next
        </p>
        <h2 className="mt-2 text-lg font-semibold text-pm-body">
          Job management screen is not built yet
        </h2>
        <p className="mt-2 text-sm text-pm-secondary">
          This page will hold live jobs, site notes, stage tracking, and job-level links
          back to quotes and invoices.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-pm-surface p-4">
            <p className="text-sm font-semibold text-pm-body">Active Jobs</p>
            <p className="mt-1 text-sm text-pm-secondary">
              Start, pause, and complete current projects.
            </p>
          </div>
          <div className="rounded-xl bg-pm-surface p-4">
            <p className="text-sm font-semibold text-pm-body">Site Notes</p>
            <p className="mt-1 text-sm text-pm-secondary">
              Capture prep issues, access notes, and finish changes.
            </p>
          </div>
          <div className="rounded-xl bg-pm-surface p-4">
            <p className="text-sm font-semibold text-pm-body">Linked Records</p>
            <p className="mt-1 text-sm text-pm-secondary">
              Connect jobs back to customers, quotes, and invoices.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
