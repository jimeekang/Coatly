import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerDetailLoading() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-4 md:max-w-2xl">
      {/* PageHeader (back + title) */}
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>

      <div className="flex flex-col gap-4">
        {/* Contact / details card */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:p-6">
          <Skeleton className="mb-4 h-5 w-32" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        </div>

        {/* Related quotes + invoices */}
        {Array.from({ length: 2 }).map((_, s) => (
          <div
            key={s}
            className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:p-6"
          >
            <Skeleton className="mb-4 h-5 w-28" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant px-4 py-3"
                >
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
