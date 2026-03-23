import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Schedule' };

export default function SchedulePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-bold text-pm-body">Schedule</h1>
        <p className="mt-1 text-sm text-pm-secondary">
          Plan upcoming work, site visits, and painting days across the week.
        </p>
      </div>

      <section className="rounded-2xl border border-pm-border bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-pm-secondary">
          Coming Next
        </p>
        <h2 className="mt-2 text-lg font-semibold text-pm-body">
          Scheduling view is not built yet
        </h2>
        <p className="mt-2 text-sm text-pm-secondary">
          This page will become the job calendar for site bookings, painter allocation,
          and due-date planning.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-pm-surface p-4">
            <p className="text-sm font-semibold text-pm-body">Weekly Planner</p>
            <p className="mt-1 text-sm text-pm-secondary">
              See booked jobs, quote visits, and invoice due dates at a glance.
            </p>
          </div>
          <div className="rounded-xl bg-pm-surface p-4">
            <p className="text-sm font-semibold text-pm-body">Crew Allocation</p>
            <p className="mt-1 text-sm text-pm-secondary">
              Assign painters and split work across each day.
            </p>
          </div>
          <div className="rounded-xl bg-pm-surface p-4">
            <p className="text-sm font-semibold text-pm-body">Reminders</p>
            <p className="mt-1 text-sm text-pm-secondary">
              Track follow-ups, deposits, and client callbacks.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
