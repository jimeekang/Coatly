import {
  MATERIAL_ITEM_CATEGORIES,
  materialItemUpsertSchema,
  type MaterialItem,
  type MaterialItemCategory,
  type MaterialItemUpsertInput,
} from '@/lib/supabase/validators';

const CSV_HEADERS = ['category', 'brand', 'title', 'size_l', 'price_aud', 'notes', 'is_active'] as const;

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const normalized = text.replace(/^\uFEFF/, '');
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (char === '\n') {
      row.push(cell);
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = '';
      continue;
    }

    if (char !== '\r') {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) return true;
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0'].includes(normalized)) return false;

  throw new Error('is_active must be true or false');
}

function parsePriceCents(value: string) {
  const normalized = value.replace(/\$/g, '').replace(/,/g, '').trim();
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('price_aud must be a valid number');
  }

  return Math.round(parsed * 100);
}

function parseSizeLitres(value: string) {
  const normalized = value.trim().replace(/\s+/g, '').replace(/[lL]$/, '');
  if (!normalized) return '';

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('size_l must be a valid number');
  }

  return String(parsed);
}

function extractSizeLitres(unit: string) {
  const match = unit.trim().match(/^(\d+(?:\.\d+)?)\s*[lL]$/);
  return match?.[1] ?? '';
}

function normalizeCategory(value: string): MaterialItemCategory {
  const normalized = value.trim().toLowerCase();
  if (MATERIAL_ITEM_CATEGORIES.includes(normalized as MaterialItemCategory)) {
    return normalized as MaterialItemCategory;
  }

  throw new Error(`category must be one of ${MATERIAL_ITEM_CATEGORIES.join(', ')}`);
}

export function generateMaterialItemsCsv(items: MaterialItem[]) {
  const lines = [
    CSV_HEADERS.join(','),
    ...items.map((item) => {
      const row = {
        category: item.category,
        brand: '',
        title: item.name,
        size_l: item.category === 'service' ? '' : extractSizeLitres(item.unit),
        price_aud: (item.unit_price_cents / 100).toFixed(2),
        notes: item.category === 'service' ? item.notes ?? '' : '',
        is_active: item.is_active ? 'true' : 'false',
      };

      return CSV_HEADERS.map((header) => escapeCsvCell(row[header])).join(',');
    }),
  ];

  return lines.join('\n');
}

export function parseMaterialItemsCsv(text: string): {
  items: MaterialItemUpsertInput[];
  errors: string[];
} {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { items: [], errors: ['CSV is empty.'] };
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const getColumnIndex = (name: (typeof CSV_HEADERS)[number]) => headers.indexOf(name);
  const missingRequired = ['category', 'title', 'price_aud'].filter((name) => !headers.includes(name));
  if (missingRequired.length > 0) {
    return {
      items: [],
      errors: [`Missing required column(s): ${missingRequired.join(', ')}`],
    };
  }

  const items: MaterialItemUpsertInput[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((row, index) => {
    const lineNumber = index + 2;
    const valueFor = (name: (typeof CSV_HEADERS)[number]) => {
      const columnIndex = getColumnIndex(name);
      return columnIndex >= 0 ? row[columnIndex] ?? '' : '';
    };

    try {
      const category = normalizeCategory(valueFor('category'));
      const title = valueFor('title').trim();
      if (!title) {
        throw new Error('title is required');
      }

      const input: MaterialItemUpsertInput =
        category === 'service'
          ? {
              category,
              name: title,
              unit: 'item',
              unit_price_cents: parsePriceCents(valueFor('price_aud')),
              notes: valueFor('notes').trim() || undefined,
              is_active: parseBoolean(valueFor('is_active')),
            }
          : {
              category,
              name: [valueFor('brand').trim(), title].filter(Boolean).join(' '),
              unit: parseSizeLitres(valueFor('size_l'))
                ? `${parseSizeLitres(valueFor('size_l'))}L`
                : 'item',
              unit_price_cents: parsePriceCents(valueFor('price_aud')),
              notes: undefined,
              is_active: parseBoolean(valueFor('is_active')),
            };

      const parsed = materialItemUpsertSchema.safeParse(input);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Invalid row');
      }

      items.push(input);
    } catch (error) {
      errors.push(`Line ${lineNumber}: ${error instanceof Error ? error.message : 'Invalid row'}`);
    }
  });

  if (items.length === 0 && errors.length === 0) {
    errors.push('CSV does not contain any data rows.');
  }

  return { items, errors };
}
