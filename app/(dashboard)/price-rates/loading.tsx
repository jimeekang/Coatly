import { Skeleton } from '@/components/ui/skeleton';

export default function PriceRatesLoading() {
  return (
    <div
      className="flex min-w-0 flex-col gap-4 sm:gap-6"
      role="status"
      aria-live="polite"
    >
      <p className="sr-only">Loading price rates</p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-8 w-40 max-w-full" />
          <Skeleton className="h-4 w-[38rem] max-w-full" />
        </div>
        <Skeleton className="h-11 w-28 rounded-xl" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <section
            key={index}
            className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-40 max-w-full" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
              <Skeleton className="h-7 w-20 shrink-0 rounded-lg" />
            </div>
          </section>
        ))}
      </div>

      <div className="border-outline-variant bg-surface-container-lowest flex gap-1 overflow-hidden rounded-xl border p-1 shadow-sm">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-11 min-w-28 flex-1 rounded-xl" />
        ))}
      </div>

      <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4 shadow-sm sm:p-6">
        <div className="mb-5 space-y-2">
          <Skeleton className="h-6 w-48 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="border-outline-variant bg-surface-container-low rounded-xl border p-4"
            >
              <Skeleton className="mb-3 h-4 w-28 max-w-full" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </section>

      <div className="border-outline-variant bg-surface-container-lowest sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 shadow-md md:bottom-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40 max-w-full" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <Skeleton className="h-12 w-28 shrink-0 rounded-xl" />
      </div>
    </div>
  );
}
