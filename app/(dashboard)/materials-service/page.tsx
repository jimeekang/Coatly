import type { Metadata } from 'next';
import { getMaterialItems } from '@/app/actions/materials';
import { MaterialItemList } from '@/components/materials/MaterialItemList';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { PageHeader } from '@/components/layout/PageHeader';

export const metadata: Metadata = { title: 'Materials & Services' };

export default async function MaterialsServicePage() {
  const { data: items, error } = await getMaterialItems();

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Material / Service"
        subtitle="Catalogue of paints, materials, supplies, and service line items used on every quote."
      />

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <MaterialItemList initialItems={items} />
    </div>
  );
}
