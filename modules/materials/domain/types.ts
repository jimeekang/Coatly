import { z } from 'zod';

export const MATERIAL_ITEM_CATEGORIES = [
  'paint',
  'primer',
  'supply',
  'service',
  'other',
] as const;

export type MaterialItemCategory = (typeof MATERIAL_ITEM_CATEGORIES)[number];

export const MATERIAL_ITEM_CATEGORY_LABELS: Record<
  MaterialItemCategory,
  string
> = {
  paint: 'Paint',
  primer: 'Primer',
  supply: 'Supply',
  service: 'Service',
  other: 'Other',
};

export const materialItemUpsertSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or less'),
  category: z.enum(MATERIAL_ITEM_CATEGORIES).default('other'),
  unit: z
    .string()
    .trim()
    .min(1, 'Unit is required')
    .max(50, 'Unit must be 50 characters or less')
    .default('item'),
  unit_price_cents: z
    .number()
    .int('Price must be a whole number of cents')
    .min(0, 'Price must be zero or greater'),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes must be 500 characters or less')
    .optional()
    .transform((value) => value ?? null),
  is_active: z.boolean().default(true),
});

export type MaterialItemUpsertInput = z.input<
  typeof materialItemUpsertSchema
>;
export type MaterialItemUpsert = z.output<typeof materialItemUpsertSchema>;

export type MaterialItem = {
  id: string;
  user_id: string;
  name: string;
  category: MaterialItemCategory;
  unit: string;
  unit_price_cents: number;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
