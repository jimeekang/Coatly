import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { buildQuoteCustomerAddress } from '@/lib/quotes';
import type {
  Customer,
  CustomerCreateInput,
  CustomerUpdateInput,
} from '@/types/customer';
import type { AppDatabase } from '@/types/app-database';

type CustomerRow = AppDatabase['public']['Tables']['customers']['Row'];
type CustomerInsertRow = AppDatabase['public']['Tables']['customers']['Insert'];
type CustomerUpdateRow = AppDatabase['public']['Tables']['customers']['Update'];
type CustomerCreatePayload = Omit<CustomerInsertRow, 'user_id'>;
type SerializedCustomerRow = Pick<
  CustomerRow,
  | 'id'
  | 'user_id'
  | 'name'
  | 'email'
  | 'phone'
  | 'address_line1'
  | 'address_line2'
  | 'city'
  | 'state'
  | 'postcode'
  | 'notes'
  | 'is_archived'
  | 'created_at'
  | 'updated_at'
>;

export const CUSTOMER_API_SELECT =
  'id, user_id, name, email, phone, address_line1, address_line2, city, state, postcode, notes, is_archived, created_at, updated_at';

const optionalTextSchema = z
  .union([z.string(), z.literal(''), z.null()])
  .optional()
  .transform((value) => normalizeOptionalText(value));

const optionalEmailSchema = z
  .union([z.string().email('Invalid email address'), z.literal(''), z.null()])
  .optional()
  .transform((value) => normalizeOptionalEmail(value));

const customerCreateSchema = z.object({
  name: z.string().trim().min(1, 'Customer name is required'),
  email: optionalEmailSchema,
  phone: optionalTextSchema,
  address: optionalTextSchema,
  notes: optionalTextSchema,
});

const customerUpdateSchema = z
  .object({
    name: z.string().trim().min(1, 'Customer name is required').optional(),
    email: optionalEmailSchema,
    phone: optionalTextSchema,
    address: optionalTextSchema,
    notes: optionalTextSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

export function parseCustomerCreateInput(input: unknown): {
  data: CustomerCreateInput | null;
  error: string | null;
} {
  const result = customerCreateSchema.safeParse(input);

  if (!result.success) {
    return {
      data: null,
      error: result.error.issues[0]?.message ?? 'Invalid request body.',
    };
  }

  return { data: result.data, error: null };
}

export function parseCustomerUpdateInput(input: unknown): {
  data: CustomerUpdateInput | null;
  error: string | null;
} {
  const result = customerUpdateSchema.safeParse(input);

  if (!result.success) {
    return {
      data: null,
      error: result.error.issues[0]?.message ?? 'Invalid request body.',
    };
  }

  return { data: result.data, error: null };
}

export function serializeCustomer(row: SerializedCustomerRow): Customer {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: buildQuoteCustomerAddress(row),
    notes: row.notes,
    is_archived: row.is_archived,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function buildCreateCustomerPayload(input: CustomerCreateInput): CustomerCreatePayload {
  return {
    name: input.name.trim(),
    email: normalizeOptionalEmail(input.email),
    phone: normalizeOptionalText(input.phone),
    address_line1: normalizeOptionalText(input.address),
    address_line2: null,
    city: null,
    state: null,
    postcode: null,
    notes: normalizeOptionalText(input.notes),
  };
}

export function buildUpdateCustomerPayload(input: CustomerUpdateInput): CustomerUpdateRow {
  const payload: CustomerUpdateRow = {};

  if ('name' in input) {
    payload.name = input.name?.trim();
  }

  if ('email' in input) {
    payload.email = normalizeOptionalEmail(input.email);
  }

  if ('phone' in input) {
    payload.phone = normalizeOptionalText(input.phone);
  }

  if ('address' in input) {
    payload.address_line1 = normalizeOptionalText(input.address);
    payload.address_line2 = null;
    payload.city = null;
    payload.state = null;
    payload.postcode = null;
  }

  if ('notes' in input) {
    payload.notes = normalizeOptionalText(input.notes);
  }

  return payload;
}

export async function findDuplicateCustomer(
  supabase: SupabaseClient<AppDatabase>,
  userId: string,
  name: string,
  address: string | null,
  excludeId?: string
): Promise<{ data: Customer | null; error: string | null }> {
  const normalizedName = normalizeComparisonValue(name);
  const normalizedAddress = normalizeComparisonValue(address);

  if (!normalizedName || !normalizedAddress) {
    return { data: null, error: null };
  }

  const query = supabase
    .from('customers')
    .select(CUSTOMER_API_SELECT)
    .eq('user_id', userId)
    .eq('is_archived', false)
    .ilike('name', name.trim());

  const result = await (excludeId ? query.neq('id', excludeId) : query).limit(50);

  if (result.error) {
    return { data: null, error: result.error.message };
  }

  const duplicate = (result.data ?? []).find((row) => {
    const current = row as SerializedCustomerRow;

    return (
      normalizeComparisonValue(current.name) === normalizedName &&
      normalizeComparisonValue(buildQuoteCustomerAddress(current)) === normalizedAddress
    );
  });

  return {
    data: duplicate ? serializeCustomer(duplicate as SerializedCustomerRow) : null,
    error: null,
  };
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalEmail(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized ? normalized : null;
}

function normalizeComparisonValue(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
}
