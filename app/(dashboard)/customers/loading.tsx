import { ListPageSkeleton } from '@/components/ui/skeleton';

export default function CustomersLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="h-7 w-28 animate-pulse rounded-md bg-pm-border/60" />
        <div className="h-12 w-40 animate-pulse rounded-xl bg-pm-border/60" />
      </div>
      <ListPageSkeleton cols={4} />
    </div>
  );
}
