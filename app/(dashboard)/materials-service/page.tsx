import type { Metadata } from 'next';
import { getMaterialItems } from '@/app/actions/materials';
import { MaterialItemList } from '@/components/materials/MaterialItemList';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { PageHeader } from '@/components/layout/PageHeader';

export const metadata: Metadata = { title: 'Materials & Services' };

export default async function MaterialsServicePage() {
  const { data: items, error } = await getMaterialItems();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Materials & Services"
        subtitle="Save reusable paints, supplies, and services to quickly add them to quotes. Search and filter by category from the list below."
      />

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <MaterialItemList initialItems={items} />
    </div>
  );
}
