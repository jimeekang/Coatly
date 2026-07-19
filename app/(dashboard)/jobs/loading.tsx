import { Skeleton, ListPageSkeleton } from '@/components/ui/skeleton';

export default function JobsLoading() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <ListPageSkeleton cols={5} />
    </div>
  );
}
