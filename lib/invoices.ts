import type { InvoiceCreateInput } from '@/lib/supabase/validators';
import { invoiceCreateSchema } from '@/lib/supabase/validators';
import { createServerClient } from '@/lib/supabase/server';
import type {
  InvoiceCustomerSummary,
  InvoiceListItem,
  InvoiceStatus,
  InvoicePaymentMethod,
  InvoiceWithCustomer,
} from '@/types/invoice';
import { getGSTFromExAmount } from '@/utils/gst';

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
  subtotal_cents: number;
  total_cents: number;
  deposit_percent: number | null;
  status: string;
  valid_until: string | null;
  line_items:
    | Array<{
        name: string;
        quantity: number;
        unit_price_cents: number;
        total_cents: number;
        notes: string | null;
        is_optional: boolean | null;
        is_selected: boolean | null;
      }>
    | null;
};

type LinkedInvoiceRecord = {
  id?: string;
  quote_id: string | null;
  subtotal_cents: number;
  total_cents?: number;
  status: string;
  created_at?: string;
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
  business_abn: string | null;
  payment_terms: string | null;
  bank_details: string | null;
  due_date: string | null;
  paid_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
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
        business_abn: string | null;
        payment_terms: string | null;
        bank_details: string | null;
        due_date: string | null;
        paid_date: string | null;
        payment_method: InvoicePaymentMethod | null;
        notes: string | null;
        line_items: Array<{
          description: string;
          quantity: number;
          unit_price_cents: number;
        }>;
      };
    };

export type QuoteInvoiceLinkState = {
  linked_invoice_count: number;
  has_linked_invoices: boolean;
  billed_subtotal_cents: number;
  billed_total_cents: number;
};

const EMPTY_QUOTE_INVOICE_LINK_STATE: QuoteInvoiceLinkState = {
  linked_invoice_count: 0,
  has_linked_invoices: false,
  billed_subtotal_cents: 0,
  billed_total_cents: 0,
};

export function buildQuoteInvoiceStageMap(
  linkedInvoices:
    | Array<{
        id: string;
        quote_id: string | null;
        created_at: string;
      }>
    | null
    | undefined
) {
  const byQuoteId = new Map<string, Array<{ id: string; created_at: string }>>();

  for (const invoice of linkedInvoices ?? []) {
    if (!invoice.quote_id) continue;

    const group = byQuoteId.get(invoice.quote_id) ?? [];
    group.push({
      id: invoice.id,
      created_at: invoice.created_at,
    });
    byQuoteId.set(invoice.quote_id, group);
  }

  const byInvoiceId = new Map<string, string>();

  for (const invoices of byQuoteId.values()) {
    invoices.sort((left, right) => {
      const leftTime = new Date(left.created_at).getTime();
      const rightTime = new Date(right.created_at).getTime();

      if (leftTime !== rightTime) return leftTime - rightTime;
      return left.id.localeCompare(right.id);
    });

    const total = invoices.length;
    invoices.forEach((invoice, index) => {
      byInvoiceId.set(invoice.id, `${index + 1}/${total}`);
    });
  }

  return byInvoiceId;
}

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

export function getSydneyTodayDateString(now: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function resolveInvoiceStatus(
  status: InvoiceStatus,
  dueDate: string | null,
  paidDate: string | null,
  now: Date = new Date()
): InvoiceStatus {
  if (status === 'paid' || paidDate) return 'paid';
  if (status !== 'sent') return status;
  if (!dueDate) return status;

  return dueDate < getSydneyTodayDateString(now) ? 'overdue' : status;
}

export function mapInvoiceListItem(row: InvoiceListRow): InvoiceListItem {
  const customer = getSingleRelation(row.customer);
  const status = resolveInvoiceStatus(
    row.status as InvoiceStatus,
    row.due_date,
    row.paid_date ?? null
  );

  return {
    id: row.id,
    user_id: row.user_id,
    customer_id: row.customer_id,
    quote_id: row.quote_id,
    invoice_number: row.invoice_number,
    status,
    invoice_type: row.invoice_type as InvoiceListItem['invoice_type'],
    subtotal_cents: row.subtotal_cents,
    gst_cents: row.gst_cents,
    total_cents: row.total_cents,
    amount_paid_cents: row.amount_paid_cents,
    business_abn: row.business_abn ?? null,
    payment_terms: row.payment_terms ?? null,
    bank_details: row.bank_details ?? null,
    due_date: row.due_date,
    paid_date: row.paid_date ?? null,
    paid_at: row.paid_at,
    payment_method: (row.payment_method as InvoicePaymentMethod | null) ?? null,
    notes: row.notes,
    quote_stage_label: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer: mapCustomerSummary(customer),
    balance_cents: Math.max(row.total_cents - row.amount_paid_cents, 0),
    line_item_count: row.line_items?.length ?? 0,
  };
}

export function mapInvoiceDetail(row: InvoiceDetailRow): InvoiceWithCustomer {
  const customer = getSingleRelation(row.customer);
  const status = resolveInvoiceStatus(
    row.status as InvoiceStatus,
    row.due_date,
    row.paid_date ?? null
  );

  return {
    id: row.id,
    user_id: row.user_id,
    customer_id: row.customer_id,
    quote_id: row.quote_id,
    invoice_number: row.invoice_number,
    status,
    invoice_type: row.invoice_type as InvoiceWithCustomer['invoice_type'],
    subtotal_cents: row.subtotal_cents,
    gst_cents: row.gst_cents,
    total_cents: row.total_cents,
    amount_paid_cents: row.amount_paid_cents,
    business_abn: row.business_abn ?? null,
    payment_terms: row.payment_terms ?? null,
    bank_details: row.bank_details ?? null,
    due_date: row.due_date,
    paid_date: row.paid_date ?? null,
    paid_at: row.paid_at,
    payment_method: (row.payment_method as InvoicePaymentMethod | null) ?? null,
    notes: row.notes,
    quote_stage_label: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer: mapCustomerSummary(customer),
    line_items: row.line_items ?? [],
  };
}

export function calculateInvoiceTotals(
  lineItems: Array<{ description: string; quantity: number; unit_price_cents: number }>
) {
  const { subtotal_cents, gst_cents, total_cents } = calculateInvoiceLineItemTotals(lineItems);

  return {
    subtotal_cents,
    gst_cents,
    total_cents,
  };
}

export function calculateInvoiceLineItemTotals(
  lineItems: Array<{ description: string; quantity: number; unit_price_cents: number }>
) {
  const calculatedLineItems = lineItems.map((item, index) => {
    const total_cents = Math.round(item.quantity * item.unit_price_cents);
    const gst_cents = getGSTFromExAmount(total_cents);

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
    line_items: calculatedLineItems,
    subtotal_cents,
    gst_cents,
    total_cents: subtotal_cents + gst_cents,
  };
}

export function buildQuoteInvoiceLinkStateMap(
  linkedInvoices: LinkedInvoiceRecord[] | null | undefined
) {
  const byQuoteId = new Map<string, QuoteInvoiceLinkState>();

  for (const invoice of linkedInvoices ?? []) {
    if (!invoice.quote_id) continue;

    const current =
      byQuoteId.get(invoice.quote_id) ?? {
        ...EMPTY_QUOTE_INVOICE_LINK_STATE,
      };

    current.linked_invoice_count += 1;
    current.has_linked_invoices = true;

    if (invoice.status !== 'cancelled') {
      current.billed_subtotal_cents += invoice.subtotal_cents;
      current.billed_total_cents += invoice.total_cents ?? invoice.subtotal_cents;
    }

    byQuoteId.set(invoice.quote_id, current);
  }

  return byQuoteId;
}

export async function getQuoteInvoiceLinkState(
  supabase: AppSupabaseClient,
  userId: string,
  quoteId: string
) {
  const { data, error } = await supabase
    .from('invoices')
    .select('quote_id, subtotal_cents, total_cents, status')
    .eq('user_id', userId)
    .eq('quote_id', quoteId);

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  const state =
    buildQuoteInvoiceLinkStateMap((data as LinkedInvoiceRecord[] | null) ?? []).get(quoteId) ??
    EMPTY_QUOTE_INVOICE_LINK_STATE;

  return {
    data: state,
    error: null,
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
      business_abn: parsed.data.business_abn ?? null,
      payment_terms: parsed.data.payment_terms ?? null,
      bank_details: parsed.data.bank_details ?? null,
      due_date: parsed.data.due_date ?? null,
      paid_date: parsed.data.paid_date ?? null,
      payment_method: (parsed.data.payment_method as InvoicePaymentMethod | null) ?? null,
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
  const [{ data, error }, { data: linkedInvoices, error: linkedInvoicesError }] = await Promise.all([
    supabase
    .from('quotes')
    .select(
      'id, quote_number, title, customer_id, subtotal_cents, total_cents, deposit_percent, status, valid_until, line_items:quote_line_items(name, quantity, unit_price_cents, total_cents, notes, is_optional, is_selected)'
    )
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, quote_id, subtotal_cents, total_cents, status')
      .eq('user_id', userId)
      .not('quote_id', 'is', null),
  ]);

  if (error || linkedInvoicesError) {
    return {
      data: [],
      error: error?.message ?? linkedInvoicesError?.message ?? null,
    };
  }

  const quoteInvoiceLinkStateById = buildQuoteInvoiceLinkStateMap(
    (linkedInvoices as LinkedInvoiceRecord[] | null) ?? []
  );

  return {
    data:
      (data as unknown as QuoteRecord[] | null)?.map((quote) => {
        const quoteInvoiceLinkState =
          quoteInvoiceLinkStateById.get(quote.id) ?? EMPTY_QUOTE_INVOICE_LINK_STATE;

        return {
          id: quote.id,
          quote_number: quote.quote_number,
          title: quote.title,
          customer_id: quote.customer_id,
          subtotal_cents: quote.subtotal_cents,
          total_cents: quote.total_cents,
          deposit_percent: quote.deposit_percent ?? 0,
          status: quote.status,
          valid_until: quote.valid_until,
          billed_subtotal_cents: quoteInvoiceLinkState.billed_subtotal_cents,
          billed_total_cents: quoteInvoiceLinkState.billed_total_cents,
          linked_invoice_count: quoteInvoiceLinkState.linked_invoice_count,
          has_linked_invoices: quoteInvoiceLinkState.has_linked_invoices,
          line_items:
            quote.line_items?.map((item) => ({
              description: item.notes?.trim() ? `${item.name}\n${item.notes.trim()}` : item.name,
              quantity: Number(item.quantity),
              unit_price_cents: item.unit_price_cents,
              total_cents: item.total_cents,
              is_optional: item.is_optional ?? false,
              is_selected: item.is_optional ? item.is_selected ?? false : true,
            })) ?? [],
        };
      }) ?? [],
    error: null,
  };
}
