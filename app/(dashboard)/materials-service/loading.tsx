import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';

export default function MaterialsServiceLoading() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* PageHeader */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {/* Add-item form card */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:p-6">
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-12 w-40 rounded-xl" />
      </div>

      {/* Catalogue table */}
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
