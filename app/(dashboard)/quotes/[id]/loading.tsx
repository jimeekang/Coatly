import { Skeleton } from '@/components/ui/skeleton';

export default function QuoteDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl pb-24">
      {/* Back nav */}
      <div className="mb-4">
        <Skeleton className="h-4 w-24" />
      </div>

      {/* detail head */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-11 w-20 rounded-xl" />
        </div>
      </div>

      {/* detail grid: main card + sidebar */}
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        {/* Main card: line items + totals */}
        <div className="self-start rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <Skeleton className="mb-3 h-4 w-24" />

          {/* Table header — md+ only */}
          <div className="hidden gap-3 border-b border-outline-variant pb-2 md:grid md:grid-cols-[1fr_90px_90px_90px]">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>

          {/* Line item rows */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 border-t border-outline-variant py-3 first:border-t-0"
            >
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}

          {/* Totals band */}
          <div className="mt-5 space-y-2 border-t-2 border-outline-variant pt-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center justify-between border-t border-outline-variant pt-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>

        {/* Sidebar meta-boxes */}
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 shadow-sm"
            >
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
