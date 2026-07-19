import { Skeleton } from '@/components/ui/skeleton';

function FieldRow() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
      {/* PageHeader */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {/* Business profile form */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:p-6">
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <FieldRow key={i} />
          ))}
        </div>
        <Skeleton className="mt-6 h-12 w-40 rounded-xl" />
      </div>

      {/* Google Calendar card */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container p-5">
        <Skeleton className="mb-3 h-5 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="mt-4 h-11 w-40 rounded-xl" />
      </div>

      {/* Linked sections (Price Rates, Billing) */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-outline-variant bg-surface-container p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </div>
            <Skeleton className="h-11 w-36 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
