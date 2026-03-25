import { ListPageSkeleton } from '@/components/ui/skeleton';

export default function InvoicesLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="h-7 w-24 animate-pulse rounded-md bg-pm-border/60" />
        <div className="h-12 w-40 animate-pulse rounded-xl bg-pm-border/60" />
      </div>
      <ListPageSkeleton cols={5} />
    </div>
  );
}
