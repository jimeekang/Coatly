// Structural copies of the manual price book (material) contract. Price Rates
// owns its CSV import/export contract, so nothing in price-rates/domain imports
// materials/domain. These are structurally identical to the canonical material
// types, keeping real material rows assignable across the boundary.
const MANUAL_PRICE_BOOK_CATEGORIES = [
  'paint',
  'primer',
  'supply',
  'service',
  'other',
] as const;
type ManualPriceBookCategory = (typeof MANUAL_PRICE_BOOK_CATEGORIES)[number];

type ManualPriceBookItem = {
  id: string;
  user_id: string;
  name: string;
  category: ManualPriceBookCategory;
  unit: string;
  unit_price_cents: number;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ManualPriceBookUpsertInput = {
  name: string;
  category?: ManualPriceBookCategory;
  unit?: string;
  unit_price_cents: number;
  notes?: string;
  is_active?: boolean;
};

const EXPORT_HEADERS = [
  'Service / Item',
  'Unit',
  'Price',
  'Category',
  'Customer Description',
] as const;

const REQUIRED_COLUMNS = ['service_item', 'unit', 'price'] as const;
export const MANUAL_PRICE_BOOK_UNITS = [
  'each',
  'sqm',
  'lm',
  'room',
  'hour',
  'day',
  'fixed',
] as const;

const HEADER_ALIASES: Record<
  (typeof REQUIRED_COLUMNS)[number] | 'category' | 'description',
  string[]
> = {
  service_item: ['service_item', 'service', 'item', 'title', 'name'],
  unit: ['unit'],
  price: ['price', 'price_aud', 'aud', 'rate', 'unit_price'],
  category: ['category'],
  description: ['description', 'customer_description', 'notes'],
};

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\/+/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
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

function parsePriceCents(value: string) {
  const normalized = value.trim().replace(/^\$/, '').replace(/,/g, '');

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Price must be a valid AUD number');
  }

  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Price must be a valid AUD number');
  }

  return Math.round(parsed * 100);
}

function normalizeCategory(value: string): ManualPriceBookCategory {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return 'service';

  const category = MANUAL_PRICE_BOOK_CATEGORIES.find(
    (item) => item === normalized
  );
  if (category) return category;

  throw new Error(
    `Category must be blank or one of ${MANUAL_PRICE_BOOK_CATEGORIES.join(', ')}`
  );
}

function normalizeUnit(value: string) {
  const normalized = value.trim().toLowerCase();
  if ((MANUAL_PRICE_BOOK_UNITS as readonly string[]).includes(normalized)) {
    return normalized;
  }

  throw new Error(`Unit must be one of ${MANUAL_PRICE_BOOK_UNITS.join(', ')}`);
}

function exportUnit(unit: string) {
  const normalized = unit.trim().toLowerCase();
  if (normalized === 'item') return 'each';
  if ((MANUAL_PRICE_BOOK_UNITS as readonly string[]).includes(normalized)) {
    return normalized;
  }

  return 'each';
}

function findColumnIndex(headers: string[], key: keyof typeof HEADER_ALIASES) {
  return headers.findIndex((header) => HEADER_ALIASES[key].includes(header));
}

export function generateManualPriceBookCsv(items: ManualPriceBookItem[]) {
  const lines = [
    EXPORT_HEADERS.join(','),
    ...items.map((item) =>
      [
        item.name,
        exportUnit(item.unit),
        (item.unit_price_cents / 100).toFixed(2),
        item.category,
        item.notes ?? '',
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  return lines.join('\n');
}

export function generateManualPriceBookTemplateCsv() {
  return EXPORT_HEADERS.join(',');
}

export function parseManualPriceBookCsv(text: string): {
  items: ManualPriceBookUpsertInput[];
  errors: string[];
} {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { items: [], errors: ['CSV is empty.'] };
  }

  const headers = rows[0].map(normalizeHeader);
  const columnIndexes = {
    service_item: findColumnIndex(headers, 'service_item'),
    unit: findColumnIndex(headers, 'unit'),
    price: findColumnIndex(headers, 'price'),
    category: findColumnIndex(headers, 'category'),
    description: findColumnIndex(headers, 'description'),
  };

  const missingRequired = REQUIRED_COLUMNS.filter(
    (name) => columnIndexes[name] < 0
  );
  if (missingRequired.length > 0) {
    return {
      items: [],
      errors: [`Missing required column(s): ${missingRequired.join(', ')}`],
    };
  }

  const items: ManualPriceBookUpsertInput[] = [];
  const errors: string[] = [];
  const seenKeys = new Set<string>();

  rows.slice(1).forEach((row, index) => {
    const lineNumber = index + 2;
    const valueFor = (name: keyof typeof columnIndexes) => {
      const columnIndex = columnIndexes[name];
      return columnIndex >= 0 ? (row[columnIndex] ?? '') : '';
    };

    try {
      const name = valueFor('service_item').trim();
      const unit = normalizeUnit(valueFor('unit'));

      if (!name) throw new Error('Service / Item is required');

      const duplicateKey = `${name.toLowerCase()}::${unit.toLowerCase()}`;
      if (seenKeys.has(duplicateKey)) {
        throw new Error('Duplicate Service / Item + Unit row');
      }

      const input = {
        name,
        unit,
        unit_price_cents: parsePriceCents(valueFor('price')),
        category: normalizeCategory(valueFor('category')),
        notes: valueFor('description').trim() || undefined,
        is_active: true,
      };

      seenKeys.add(duplicateKey);
      items.push(input);
    } catch (error) {
      errors.push(
        `Line ${lineNumber}: ${
          error instanceof Error ? error.message : 'Invalid row'
        }`
      );
    }
  });

  if (items.length === 0 && errors.length === 0) {
    errors.push('Add at least one price row before importing.');
  }

  return { items, errors };
}
