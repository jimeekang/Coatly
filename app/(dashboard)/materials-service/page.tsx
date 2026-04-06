import type { Metadata } from 'next';
import { getMaterialItems } from '@/app/actions/materials';
import { MaterialItemList } from '@/components/materials/MaterialItemList';

export const metadata: Metadata = { title: 'Materials & Services' };

export default async function MaterialsServicePage() {
  const { data: items, error } = await getMaterialItems();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold text-pm-body">Materials &amp; Services</h1>
        <p className="mt-1 text-sm text-pm-secondary">
          Save reusable paints, supplies, and services to quickly add them to quotes. Search and filter by category from the list below.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3 text-sm text-pm-coral-dark">
          {error}
        </p>
      )}

      <MaterialItemList initialItems={items} />
    </div>
  );
}
