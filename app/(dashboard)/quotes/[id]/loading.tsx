import { Skeleton } from '@/components/ui/skeleton';

export default function QuoteDetailLoading() {
  return (
    <div
      className="mx-auto w-full max-w-4xl pb-24"
      role="status"
      aria-live="polite"
    >
      <p className="sr-only">Loading quote</p>

      <Skeleton className="mb-5 h-11 w-28 rounded-xl" />

      <div className="mb-4 flex min-w-0 items-end justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-44 max-w-full" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-11 w-20 rounded-xl" />
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)]">
        <section className="border-outline-variant bg-surface-container-lowest min-w-0 rounded-2xl border p-4 shadow-sm">
          <Skeleton className="mb-4 h-5 w-28" />
          <div className="border-outline-variant hidden grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem] gap-3 border-b pb-2 md:grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-3 w-14 max-w-full" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="border-outline-variant grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b py-4 last:border-0 md:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem]"
            >
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-28 max-w-full" />
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="hidden h-4 w-16 md:block" />
              <Skeleton className="hidden h-4 w-16 md:block" />
            </div>
          ))}
          <div className="border-outline-variant mt-5 ml-auto w-full max-w-xs space-y-3 border-t pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </section>

        <aside className="min-w-0 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <section
              key={index}
              className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4 shadow-sm"
            >
              <Skeleton className="mb-4 h-5 w-32 max-w-full" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}
