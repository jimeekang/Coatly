import { Skeleton } from '@/components/ui/skeleton';

function FieldRow() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}

export default function PriceRatesLoading() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* PageHeader + currency chip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Rate section cards */}
      {Array.from({ length: 3 }).map((_, s) => (
        <div
          key={s}
          className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:p-6"
        >
          <Skeleton className="mb-4 h-5 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <FieldRow key={i} />
            ))}
          </div>
        </div>
      ))}

      {/* Save action */}
      <Skeleton className="h-12 w-full rounded-xl sm:w-48" />
    </div>
  );
}
