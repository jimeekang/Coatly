import { createServerClient } from '@/lib/supabase/server';
import {
  buildCustomerAddress,
  buildQuoteInvoiceLinkStateMap,
  type QuoteInvoiceLinkState,
} from '@/modules/invoices/domain/invoices';

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
  gst_cents: number;
  total_cents: number;
  discount_cents: number | null;
  manual_adjustment_cents: number | null;
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

const EMPTY_QUOTE_INVOICE_LINK_STATE: QuoteInvoiceLinkState = {
  linked_invoice_count: 0,
  has_linked_invoices: false,
  billed_subtotal_cents: 0,
  billed_total_cents: 0,
};

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
    buildQuoteInvoiceLinkStateMap(
      (data as LinkedInvoiceRecord[] | null) ?? []
    ).get(quoteId) ?? EMPTY_QUOTE_INVOICE_LINK_STATE;

  return {
    data: state,
    error: null,
  };
}

export async function getInvoiceCustomerOptions(
  supabase: AppSupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, email, phone, company_name, address_line1, city, state, postcode')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('name', { ascending: true });

  return {
    data:
      (data as CustomerRecord[] | null)?.map((customer) => ({
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

export async function getInvoiceQuoteOptions(
  supabase: AppSupabaseClient,
  userId: string
) {
  const [{ data, error }, { data: linkedInvoices, error: linkedInvoicesError }] =
    await Promise.all([
      supabase
        .from('quotes')
        .select(
          'id, quote_number, title, customer_id, subtotal_cents, gst_cents, total_cents, discount_cents, manual_adjustment_cents, deposit_percent, status, valid_until, line_items:quote_line_items(name, quantity, unit_price_cents, total_cents, notes, is_optional, is_selected)'
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
          quoteInvoiceLinkStateById.get(quote.id) ??
          EMPTY_QUOTE_INVOICE_LINK_STATE;

        return {
          id: quote.id,
          quote_number: quote.quote_number,
          title: quote.title,
          customer_id: quote.customer_id,
          subtotal_cents: quote.subtotal_cents,
          gst_cents: quote.gst_cents,
          total_cents: quote.total_cents,
          discount_cents: quote.discount_cents ?? 0,
          manual_adjustment_cents: quote.manual_adjustment_cents ?? 0,
          deposit_percent: quote.deposit_percent ?? 0,
          status: quote.status,
          valid_until: quote.valid_until,
          billed_subtotal_cents: quoteInvoiceLinkState.billed_subtotal_cents,
          billed_total_cents: quoteInvoiceLinkState.billed_total_cents,
          linked_invoice_count: quoteInvoiceLinkState.linked_invoice_count,
          has_linked_invoices: quoteInvoiceLinkState.has_linked_invoices,
          line_items:
            quote.line_items?.map((item) => ({
              description: item.notes?.trim()
                ? `${item.name}\n${item.notes.trim()}`
                : item.name,
              quantity: Number(item.quantity),
              unit_price_cents: item.unit_price_cents,
              total_cents: item.total_cents,
              is_optional: item.is_optional ?? false,
              is_selected: item.is_optional
                ? item.is_selected ?? false
                : true,
            })) ?? [],
        };
      }) ?? [],
    error: null,
  };
}
