import { Skeleton } from '@/components/ui/skeleton';

export default function MaterialsServiceLoading() {
  return (
    <div
      className="flex min-w-0 flex-col gap-4 sm:gap-6"
      role="status"
      aria-live="polite"
    >
      <p className="sr-only">Loading materials and services</p>

      <div className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-[34rem] max-w-full" />
      </div>

      <section className="border-outline-variant bg-surface-container-low rounded-2xl border p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Skeleton className="h-11 w-full rounded-xl lg:max-w-xl" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 w-24 rounded-xl" />
            <Skeleton className="h-11 w-28 rounded-xl" />
            <Skeleton className="h-11 w-28 rounded-xl" />
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </section>

      <div className="border-outline-variant bg-surface-container-lowest hidden overflow-hidden rounded-2xl border md:block">
        <div className="border-outline-variant bg-surface-container-low grid grid-cols-[minmax(0,2fr)_8rem_8rem_7rem] gap-4 border-b px-5 py-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-20 max-w-full" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="border-outline-variant grid grid-cols-[minmax(0,2fr)_8rem_8rem_7rem] items-center gap-4 border-b px-5 py-4 last:border-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-28 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <div className="flex justify-end gap-2">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-11 w-11 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      <div className="border-outline-variant bg-surface-container-lowest overflow-hidden rounded-2xl border md:hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="border-outline-variant flex min-w-0 items-center gap-3 border-b p-4 last:border-0"
          >
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36 max-w-full" />
              <Skeleton className="h-3 w-24 max-w-full" />
            </div>
            <Skeleton className="h-11 w-20 shrink-0 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
