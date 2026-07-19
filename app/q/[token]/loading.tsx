import { Skeleton } from '@/components/ui/skeleton';

export default function PublicQuoteLoading() {
  return (
    <main className="min-h-screen bg-surface px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          {/* Business header band */}
          <div className="border-b border-outline-variant bg-surface-container-low px-5 py-6 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-3.5 w-28" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
          </div>

          {/* Quote meta */}
          <div className="grid gap-4 px-5 py-6 sm:grid-cols-2 sm:px-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            ))}
          </div>

          {/* Line item rows */}
          <div className="px-5 sm:px-8">
            <div className="border-t border-outline-variant py-3">
              <Skeleton className="h-3 w-24" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 border-t border-outline-variant py-4"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>

          {/* Totals band */}
          <div className="mt-2 space-y-2 border-t-2 border-outline-variant px-5 py-6 sm:px-8">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center justify-between border-t border-outline-variant pt-3">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-7 w-28" />
            </div>
          </div>
        </div>

        {/* Action button */}
        <Skeleton className="mt-5 h-14 w-full rounded-xl" />
      </div>
    </main>
  );
}
