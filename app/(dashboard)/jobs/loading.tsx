import { Skeleton } from '@/components/ui/skeleton';

export default function JobsLoading() {
  return (
    <div
      className="flex min-w-0 flex-col gap-4 sm:gap-6"
      role="status"
      aria-live="polite"
    >
      <p className="sr-only">Loading jobs</p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-8 w-48 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-12 w-32 rounded-xl" />
      </div>

      <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem]">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <section
            key={index}
            className="border-outline-variant bg-surface-container-lowest min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5"
          >
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4 max-w-64" />
                <Skeleton className="h-4 w-1/2 max-w-44" />
              </div>
              <Skeleton className="h-7 w-20 shrink-0 rounded-full" />
            </div>
            <div className="border-outline-variant mt-5 grid grid-cols-2 gap-3 border-t pt-4">
              <Skeleton className="h-4 w-28 max-w-full" />
              <Skeleton className="ml-auto h-4 w-24 max-w-full" />
              <Skeleton className="h-4 w-32 max-w-full" />
              <Skeleton className="ml-auto h-4 w-20 max-w-full" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
