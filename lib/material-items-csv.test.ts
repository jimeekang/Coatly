import { describe, expect, it } from 'vitest';
import { generateMaterialItemsCsv, parseMaterialItemsCsv } from '@/lib/material-items-csv';

describe('material items csv', () => {
  it('generates a csv using the supported columns', () => {
    const csv = generateMaterialItemsCsv([
      {
        id: 'item-1',
        user_id: 'user-1',
        name: 'Dulux Wash & Wear',
        category: 'paint',
        unit: '10L',
        unit_price_cents: 8950,
        notes: null,
        is_active: true,
        sort_order: 0,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
      },
      {
        id: 'item-2',
        user_id: 'user-1',
        name: 'Ceiling repaint',
        category: 'service',
        unit: 'item',
        unit_price_cents: 22500,
        notes: 'Two-coat ceiling repaint service',
        is_active: false,
        sort_order: 1,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
      },
    ]);

    expect(csv).toContain('category,brand,title,size_l,price_aud,notes,is_active');
    expect(csv).toContain('paint,,Dulux Wash & Wear,10,89.50,,true');
    expect(csv).toContain('service,,Ceiling repaint,,225.00,Two-coat ceiling repaint service,false');
  });

  it('parses material and service rows from csv', () => {
    const csv = [
      'category,brand,title,size_l,price_aud,notes,is_active',
      'paint,Dulux,Wash & Wear,10,89.50,,true',
      'service,,Ceiling repaint,,225.00,Two-coat ceiling repaint service,false',
    ].join('\n');

    const result = parseMaterialItemsCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.items).toEqual([
      {
        category: 'paint',
        name: 'Dulux Wash & Wear',
        unit: '10L',
        unit_price_cents: 8950,
        notes: undefined,
        is_active: true,
      },
      {
        category: 'service',
        name: 'Ceiling repaint',
        unit: 'item',
        unit_price_cents: 22500,
        notes: 'Two-coat ceiling repaint service',
        is_active: false,
      },
    ]);
  });

  it('returns line errors for invalid rows', () => {
    const csv = [
      'category,brand,title,size_l,price_aud,notes,is_active',
      'unknown,,Bad Row,,10,,true',
      'service,,,,-1,,maybe',
    ].join('\n');

    const result = parseMaterialItemsCsv(csv);

    expect(result.items).toEqual([]);
    expect(result.errors).toEqual([
      'Line 2: category must be one of paint, primer, supply, service, other',
      'Line 3: title is required',
    ]);
  });
});
