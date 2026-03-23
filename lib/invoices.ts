import type { InvoiceCreateInput } from '@/lib/supabase/validators';
import { invoiceCreateSchema } from '@/lib/supabase/validators';
import { createServerClient } from '@/lib/supabase/server';
import type { InvoiceCustomerSummary, InvoiceListItem, InvoiceWithCustomer } from '@/types/invoice';

type AppSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

type CustomerRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  company_name?: string | null;
};

type QuoteRecord = {
  id: string;
  quote_number: string;
  title: string | null;
  customer_id: string;
  total_cents: number;
  status: string;
  valid_until: string | null;
};

type InvoiceRecord = {
  id: string;
  user_id: string;
  customer_id: string;
  quote_id: string | null;
  invoice_number: string;
  status: string;
  invoice_type: string;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type InvoiceLineItemRecord = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  gst_cents: number;
  total_cents: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type InvoiceListRow = InvoiceRecord & {
  customer: CustomerRecord | CustomerRecord[] | null;
  line_items?: Pick<InvoiceLineItemRecord, 'id'>[] | null;
};

type InvoiceDetailRow = InvoiceRecord & {
  customer: CustomerRecord | CustomerRecord[] | null;
  line_items: InvoiceLineItemRecord[] | null;
};

type ParsedInvoiceCreate =
  | { success: false; error: string }
  | {
      success: true;
      data: {
        customer_id: string;
        quote_id: string | null;
        status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
        invoice_type: 'full' | 'deposit' | 'progress' | 'final';
        due_date: string | null;
        notes: string | null;
        line_items: Array<{
          description: string;
          quantity: number;
          unit_price_cents: number;
        }>;
      };
    };

function getSingleRelation<T>(relation: T | T[] | null): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

export function buildCustomerAddress(customer: CustomerRecord | null) {
  if (!customer) return null;

  const address = [
    customer.address_line1,
    customer.city,
    customer.state,
    customer.postcode,
  ]
    .map((value) => value?.trim() ?? '')
    .filter(Boolean)
    .join(', ');

  return address || null;
}

export function formatCustomerAddress(
  customer:
    | CustomerRecord
    | {
        address: string | null;
      }
    | null
) {
  if (!customer) return '';
  if ('address' in customer) return customer.address ?? '';

  return buildCustomerAddress(customer) ?? '';
}

export function formatCustomerLocation(
  customer:
    | CustomerRecord
    | {
        city?: string | null;
        state?: string | null;
        address: string | null;
      }
    | null
) {
  if (!customer) return 'Unassigned';
  if ('city' in customer || 'state' in customer) {
    const location = [customer.city, customer.state].filter(Boolean).join(', ');
    if (location) return location;
  }

  return formatCustomerAddress(customer) || 'Unassigned';
}

function mapCustomerSummary(customer: CustomerRecord | null): InvoiceCustomerSummary {
  return {
    id: customer?.id ?? '',
    name: customer?.name ?? 'Unknown customer',
    email: customer?.email ?? null,
    phone: customer?.phone ?? null,
    address: buildCustomerAddress(customer),
  };
}

export function mapInvoiceListItem(row: InvoiceListRow): InvoiceListItem {
  const customer = getSingleRelation(row.customer);

  return {
    id: row.id,
    user_id: row.user_id,
    customer_id: row.customer_id,
    quote_id: row.quote_id,
    invoice_number: row.invoice_number,
    status: row.status as InvoiceListItem['status'],
    invoice_type: row.invoice_type as InvoiceListItem['invoice_type'],
    subtotal_cents: row.subtotal_cents,
    gst_cents: row.gst_cents,
    total_cents: row.total_cents,
    amount_paid_cents: row.amount_paid_cents,
    due_date: row.due_date,
    paid_at: row.paid_at,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer: mapCustomerSummary(customer),
    balance_cents: Math.max(row.total_cents - row.amount_paid_cents, 0),
    line_item_count: row.line_items?.length ?? 0,
  };
}

export function mapInvoiceDetail(row: InvoiceDetailRow): InvoiceWithCustomer {
  const customer = getSingleRelation(row.customer);

  return {
    id: row.id,
    user_id: row.user_id,
    customer_id: row.customer_id,
    quote_id: row.quote_id,
    invoice_number: row.invoice_number,
    status: row.status as InvoiceWithCustomer['status'],
    invoice_type: row.invoice_type as InvoiceWithCustomer['invoice_type'],
    subtotal_cents: row.subtotal_cents,
    gst_cents: row.gst_cents,
    total_cents: row.total_cents,
    amount_paid_cents: row.amount_paid_cents,
    due_date: row.due_date,
    paid_at: row.paid_at,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer: mapCustomerSummary(customer),
    line_items: row.line_items ?? [],
  };
}

export function calculateInvoiceTotals(
  lineItems: Array<{ description: string; quantity: number; unit_price_cents: number }>
) {
  const calculatedLineItems = lineItems.map((item, index) => {
    const total_cents = Math.round(item.quantity * item.unit_price_cents);
    const gst_cents = Math.round(total_cents * 0.1);

    return {
      description: item.description,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      total_cents,
      gst_cents,
      sort_order: index,
    };
  });

  const subtotal_cents = calculatedLineItems.reduce((sum, item) => sum + item.total_cents, 0);
  const gst_cents = calculatedLineItems.reduce((sum, item) => sum + item.gst_cents, 0);

  return {
    subtotal_cents,
    gst_cents,
    total_cents: subtotal_cents + gst_cents,
  };
}

export function parseInvoiceCreateInput(input: InvoiceCreateInput): ParsedInvoiceCreate {
  const parsed = invoiceCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invoice details could not be validated.',
    };
  }

  return {
    success: true,
    data: {
      customer_id: parsed.data.customer_id,
      quote_id: parsed.data.quote_id ?? null,
      status: parsed.data.status,
      invoice_type: parsed.data.invoice_type,
      due_date: parsed.data.due_date ?? null,
      notes: parsed.data.notes?.trim() || null,
      line_items: parsed.data.line_items.map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
      })),
    },
  };
}

export async function getInvoiceCustomerOptions(supabase: AppSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, email, phone, company_name, address_line1, city, state, postcode')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('name', { ascending: true });

  return {
    data: (data as CustomerRecord[] | null)?.map((customer) => ({
      id: customer.id,
      name: customer.name,
      company_name: customer.company_name ?? null,
      email: customer.email,
      phone: customer.phone,
      address: buildCustomerAddress(customer),
    })) ?? [],
    error: error?.message ?? null,
  };
}

export async function getInvoiceQuoteOptions(supabase: AppSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('quotes')
    .select('id, quote_number, title, customer_id, total_cents, status, valid_until')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return {
    data: (data as QuoteRecord[] | null)?.map((quote) => ({
      id: quote.id,
      quote_number: quote.quote_number,
      title: quote.title,
      customer_id: quote.customer_id,
      total_cents: quote.total_cents,
      status: quote.status,
      valid_until: quote.valid_until,
    })) ?? [],
    error: error?.message ?? null,
  };
}
