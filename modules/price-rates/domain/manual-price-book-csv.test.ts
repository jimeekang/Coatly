import { describe, expect, it } from 'vitest';
import {
  generateManualPriceBookCsv,
  generateManualPriceBookTemplateCsv,
  parseManualPriceBookCsv,
} from '@/modules/price-rates/domain/manual-price-book-csv';
import type { MaterialItem } from '@/modules/materials/domain/types';

describe('manual price book CSV', () => {
  it('parses simple Excel CSV rows into service catalogue inputs', () => {
    const parsed = parseManualPriceBookCsv(
      [
        'Service / Item,Unit,Price,Category,Customer Description',
        'Door repaint,each,$250.00,service,Includes door and frame',
        'Wall painting,sqm,18.5,,Two coats',
      ].join('\n')
    );

    expect(parsed.errors).toEqual([]);
    expect(parsed.items).toEqual([
      {
        name: 'Door repaint',
        unit: 'each',
        unit_price_cents: 25000,
        category: 'service',
        notes: 'Includes door and frame',
        is_active: true,
      },
      {
        name: 'Wall painting',
        unit: 'sqm',
        unit_price_cents: 1850,
        category: 'service',
        notes: 'Two coats',
        is_active: true,
      },
    ]);
  });

  it('defaults blank categories to service explicitly', () => {
    const parsed = parseManualPriceBookCsv(
      ['Service / Item,Unit,Price,Category', 'Wall painting,sqm,18.50,'].join(
        '\n'
      )
    );

    expect(parsed.errors).toEqual([]);
    expect(parsed.items[0]).toEqual(
      expect.objectContaining({
        category: 'service',
      })
    );
  });

  it('rejects missing required columns and duplicate rows', () => {
    expect(
      parseManualPriceBookCsv('Service / Item,Price\nDoor,100').errors
    ).toEqual(['Missing required column(s): unit']);

    expect(
      parseManualPriceBookCsv(
        ['Service / Item,Unit,Price', 'Door,each,100', 'Door,each,120'].join(
          '\n'
        )
      ).errors
    ).toEqual(['Line 3: Duplicate Service / Item + Unit row']);
  });

  it('rejects unsupported manual price book units', () => {
    const parsed = parseManualPriceBookCsv(
      ['Service / Item,Unit,Price', 'Door repaint,linear metre,100'].join('\n')
    );

    expect(parsed.items).toEqual([]);
    expect(parsed.errors).toEqual([
      'Line 2: Unit must be one of each, sqm, lm, room, hour, day, fixed',
    ]);
  });

  it('rejects malformed price values instead of partially parsing them', () => {
    expect(
      parseManualPriceBookCsv(
        ['Service / Item,Unit,Price', 'Door repaint,each,100abc'].join('\n')
      ).errors
    ).toEqual(['Line 2: Price must be a valid AUD number']);

    expect(
      parseManualPriceBookCsv(
        ['Service / Item,Unit,Price', 'Door repaint,each,12.3.4'].join('\n')
      ).errors
    ).toEqual(['Line 2: Price must be a valid AUD number']);
  });

  it('does not treat a valid row as duplicate when an earlier matching row failed validation', () => {
    const parsed = parseManualPriceBookCsv(
      [
        'Service / Item,Unit,Price',
        'Door repaint,each,bad-price',
        'Door repaint,each,120',
      ].join('\n')
    );

    expect(parsed.items).toEqual([
      expect.objectContaining({
        name: 'Door repaint',
        unit: 'each',
        unit_price_cents: 12000,
      }),
    ]);
    expect(parsed.errors).toEqual(['Line 2: Price must be a valid AUD number']);
  });

  it('returns a clear message when a blank template is imported', () => {
    expect(
      parseManualPriceBookCsv(generateManualPriceBookTemplateCsv()).errors
    ).toEqual(['Add at least one price row before importing.']);
  });

  it('exports an Excel-friendly CSV with the simple price book headers', () => {
    const item: MaterialItem = {
      id: 'item-1',
      user_id: 'user-1',
      name: 'Patch repair',
      category: 'service',
      unit: 'fixed',
      unit_price_cents: 18000,
      notes: 'Small patch',
      is_active: true,
      sort_order: 0,
      created_at: '2026-06-03T00:00:00.000Z',
      updated_at: '2026-06-03T00:00:00.000Z',
    };

    expect(generateManualPriceBookCsv([item])).toBe(
      [
        'Service / Item,Unit,Price,Category,Customer Description',
        'Patch repair,fixed,180.00,service,Small patch',
      ].join('\n')
    );
  });

  it('exports legacy item units as each for the simple manual template', () => {
    const item: MaterialItem = {
      id: 'item-1',
      user_id: 'user-1',
      name: 'Ceiling repaint',
      category: 'service',
      unit: 'item',
      unit_price_cents: 22500,
      notes: null,
      is_active: true,
      sort_order: 0,
      created_at: '2026-06-03T00:00:00.000Z',
      updated_at: '2026-06-03T00:00:00.000Z',
    };

    expect(generateManualPriceBookCsv([item])).toContain(
      'Ceiling repaint,each,225.00,service,'
    );
  });

  it('round-trips exported catalogue rows through the simple import parser', () => {
    const csv = generateManualPriceBookCsv([
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
        created_at: '2026-06-03T00:00:00.000Z',
        updated_at: '2026-06-03T00:00:00.000Z',
      },
    ]);

    const parsed = parseManualPriceBookCsv(csv);

    expect(parsed.errors).toEqual([]);
    expect(parsed.items).toEqual([
      expect.objectContaining({
        name: 'Dulux Wash & Wear',
        category: 'paint',
        unit: 'each',
        unit_price_cents: 8950,
      }),
    ]);
  });

  it('round-trips commas quotes BOM CRLF and multiline descriptions', () => {
    const csv = generateManualPriceBookCsv([
      {
        id: 'item-1',
        user_id: 'user-1',
        name: 'Door, frame "refresh"',
        category: 'service',
        unit: 'each',
        unit_price_cents: 25000,
        notes: 'Includes prep\nTwo coats',
        is_active: true,
        sort_order: 0,
        created_at: '2026-06-03T00:00:00.000Z',
        updated_at: '2026-06-03T00:00:00.000Z',
      },
    ]);

    const parsed = parseManualPriceBookCsv(`\uFEFF${csv}`);

    expect(parsed.errors).toEqual([]);
    expect(parsed.items).toEqual([
      expect.objectContaining({
        name: 'Door, frame "refresh"',
        notes: 'Includes prep\nTwo coats',
      }),
    ]);
  });

  it('generates a blank template with only the supported headers', () => {
    expect(generateManualPriceBookTemplateCsv()).toBe(
      'Service / Item,Unit,Price,Category,Customer Description'
    );
  });
});
