import type { Metadata } from 'next';
import { getMaterialItems } from '@/app/actions/materials';
import { MaterialItemList } from '@/components/materials/MaterialItemList';
import { MATERIAL_ITEM_CATEGORY_LABELS } from '@/lib/supabase/validators';

export const metadata: Metadata = { title: 'Materials & Services' };

export default async function MaterialsServicePage() {
  const { data: items, error } = await getMaterialItems();

  const paintCount = items.filter((i) => i.category === 'paint').length;
  const primerCount = items.filter((i) => i.category === 'primer').length;
  const supplyCount = items.filter((i) => i.category === 'supply').length;
  const serviceCount = items.filter((i) => i.category === 'service').length;
  const otherCount = items.filter((i) => i.category === 'other').length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold text-pm-body">Materials &amp; Services</h1>
        <p className="mt-1 text-sm text-pm-secondary">
          Save reusable paints, supplies, and services to quickly add them to quotes.
        </p>
      </div>

      {/* Summary chips */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: MATERIAL_ITEM_CATEGORY_LABELS.paint, count: paintCount },
            { label: MATERIAL_ITEM_CATEGORY_LABELS.primer, count: primerCount },
            { label: MATERIAL_ITEM_CATEGORY_LABELS.supply, count: supplyCount },
            { label: MATERIAL_ITEM_CATEGORY_LABELS.service, count: serviceCount },
            { label: MATERIAL_ITEM_CATEGORY_LABELS.other, count: otherCount },
          ]
            .filter((c) => c.count > 0)
            .map((c) => (
              <span
                key={c.label}
                className="rounded-full border border-pm-border bg-white px-3 py-1 text-xs font-medium text-pm-secondary"
              >
                {c.label} · {c.count}
              </span>
            ))}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3 text-sm text-pm-coral-dark">
          {error}
        </p>
      )}

      <MaterialItemList initialItems={items} />
    </div>
  );
}
