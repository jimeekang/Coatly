import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6"
      role="status"
      aria-live="polite"
    >
      <p className="sr-only">Loading settings</p>

      <div className="space-y-2">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-5 shadow-sm sm:p-6">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Skeleton className="h-12 w-full rounded-xl md:w-52" />
        </div>
      </section>

      <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-48 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
          <Skeleton className="h-11 w-full shrink-0 rounded-xl sm:w-36" />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <section
            key={index}
            className="border-outline-variant bg-surface-container-low rounded-2xl border p-5"
          >
            <Skeleton className="mb-2 h-5 w-44 max-w-full" />
            <Skeleton className="mb-4 h-4 w-full" />
            <Skeleton className="h-11 w-32 rounded-xl" />
          </section>
        ))}
      </div>
    </div>
  );
}
