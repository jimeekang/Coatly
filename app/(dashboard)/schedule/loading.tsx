import { Skeleton } from '@/components/ui/skeleton';

export default function ScheduleLoading() {
  return (
    <div
      className="flex min-w-0 flex-col gap-4 sm:gap-6"
      role="status"
      aria-live="polite"
    >
      <p className="sr-only">Loading schedule and jobs</p>

      <div className="space-y-2">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <section className="border-outline-variant bg-surface-container-lowest min-w-0 overflow-hidden rounded-2xl border shadow-sm">
        <div className="border-outline-variant flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <Skeleton className="h-6 w-36 max-w-full" />
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-11 w-40 rounded-xl" />
            <Skeleton className="h-11 w-28 rounded-xl" />
          </div>
        </div>

        <div className="border-outline-variant bg-surface-container-low grid grid-cols-7 border-b p-2 sm:p-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex justify-center px-1 py-2">
              <Skeleton className="h-3 w-8 max-w-full" />
            </div>
          ))}
        </div>

        <div className="divide-outline-variant grid min-h-[28rem] grid-cols-7 divide-x">
          {Array.from({ length: 7 }).map((_, column) => (
            <div key={column} className="min-w-0 space-y-3 p-1.5 sm:p-3">
              <Skeleton className="mx-auto h-5 w-5 rounded-full" />
              {column % 2 === 0 && (
                <div className="border-outline-variant bg-surface-container-low space-y-1 rounded-xl border p-1.5 sm:p-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="hidden h-3 w-3/4 sm:block" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
