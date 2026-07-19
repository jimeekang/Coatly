import { Skeleton } from '@/components/ui/skeleton';

export default function SubscribeLoading() {
  return (
    <main
      className="bg-surface min-h-screen px-4 py-8 md:px-6"
      role="status"
      aria-live="polite"
    >
      <p className="sr-only">Loading subscription plans</p>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-center gap-8">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <section className="border-outline-variant bg-surface-container-lowest min-w-0 rounded-2xl border p-6 shadow-sm md:p-8">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-4 h-9 w-full max-w-xl" />
            <Skeleton className="mt-3 h-9 w-4/5 max-w-lg" />
            <div className="mt-5 max-w-2xl space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="border-outline-variant bg-surface-container-low rounded-2xl border p-4"
                >
                  <Skeleton className="mb-4 h-5 w-48 max-w-full" />
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border-outline-variant bg-surface-container-lowest min-w-0 rounded-2xl border p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
              <Skeleton className="h-12 w-44 rounded-xl" />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="border-outline-variant bg-surface-container-low rounded-2xl border p-5"
                >
                  <Skeleton className="mb-3 h-6 w-24" />
                  <Skeleton className="mb-5 h-9 w-32" />
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((__, featureIndex) => (
                      <Skeleton key={featureIndex} className="h-4 w-full" />
                    ))}
                  </div>
                  <Skeleton className="mt-6 h-12 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
