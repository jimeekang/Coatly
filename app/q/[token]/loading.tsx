import { Skeleton } from '@/components/ui/skeleton';

export default function PublicQuoteLoading() {
  return (
    <main
      className="bg-surface min-h-screen px-4 py-6 sm:px-6 sm:py-10"
      role="status"
      aria-live="polite"
    >
      <p className="sr-only">Loading quote</p>

      <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:items-start">
        <section className="border-outline-variant bg-surface-container-lowest min-w-0 overflow-hidden rounded-2xl border shadow-sm">
          <div className="bg-primary-container text-on-primary-container p-5 sm:p-6">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="bg-primary-fixed/60 h-5 w-36" />
                <Skeleton className="bg-primary-fixed/60 h-8 w-72 max-w-full" />
                <Skeleton className="bg-primary-fixed/60 h-4 w-44 max-w-full" />
              </div>
              <Skeleton className="bg-primary-fixed/60 h-11 w-24 shrink-0 rounded-full" />
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-36 max-w-full" />
                </div>
              ))}
            </div>

            <section className="border-outline-variant overflow-hidden rounded-xl border">
              <div className="border-outline-variant bg-surface-container-low border-b px-4 py-3">
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="divide-outline-variant divide-y px-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex min-w-0 items-center gap-4 py-4"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-48 max-w-full" />
                      <Skeleton className="h-3 w-32 max-w-full" />
                    </div>
                    <Skeleton className="h-4 w-20 shrink-0" />
                  </div>
                ))}
              </div>
            </section>

            <section className="border-outline-variant bg-surface-container-low rounded-2xl border p-4 lg:hidden">
              <Skeleton className="mb-4 h-5 w-28" />
              <Skeleton className="mb-3 h-8 w-40" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </section>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="border-outline-variant bg-surface-container-lowest hidden rounded-2xl border p-5 shadow-sm lg:block">
            <Skeleton className="mb-4 h-4 w-24" />
            <Skeleton className="mb-5 h-9 w-40 max-w-full" />
            <div className="border-outline-variant space-y-3 border-t pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </section>
          <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-5 shadow-sm">
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="mb-3 h-4 w-full" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </section>
        </aside>
      </div>
    </main>
  );
}
