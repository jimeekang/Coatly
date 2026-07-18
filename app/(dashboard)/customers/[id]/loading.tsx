import { DetailPageSkeleton } from '@/components/ui/skeleton';

export default function CustomerDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl" role="status" aria-live="polite">
      <p className="sr-only">Loading customer details</p>
      <DetailPageSkeleton />
    </div>
  );
}
