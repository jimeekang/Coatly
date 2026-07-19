import { Skeleton } from '@/components/ui/skeleton';

export default function SubscribeLoading() {
  return (
    <main className="min-h-screen bg-surface px-4 py-8 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center gap-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          {/* Info card */}
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-md md:p-8">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="mt-3 h-9 w-full max-w-md" />
            <Skeleton className="mt-2 h-9 w-3/4" />
            <Skeleton className="mt-4 h-4 w-full max-w-xl" />
            <Skeleton className="mt-2 h-4 w-2/3" />

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-outline bg-surface-container-low px-4 py-4"
                >
                  <Skeleton className="h-4 w-40" />
                  <div className="mt-3 flex flex-col gap-2">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-5/6" />
                    <Skeleton className="h-3.5 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing card */}
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-md md:p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-4 h-10 w-32" />
            <Skeleton className="mt-2 h-4 w-48" />

            <div className="mt-6 flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>

            <Skeleton className="mt-6 h-14 w-full rounded-xl" />
          </section>
        </div>
      </div>
    </main>
  );
}
