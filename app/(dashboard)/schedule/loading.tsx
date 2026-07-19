import { Skeleton } from '@/components/ui/skeleton';

export default function ScheduleLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      {/* PageHeader */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {/* Calendar card */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:p-5">
        {/* Toolbar: view toggle + month navigation */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Skeleton className="h-11 w-24 rounded-xl" />
            <Skeleton className="h-11 w-24 rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-11 w-11 rounded-xl" />
          </div>
        </div>

        {/* Weekday header row */}
        <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>

        {/* Day cells — 6 weeks */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: 42 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-square w-full rounded-lg sm:aspect-[4/5]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
