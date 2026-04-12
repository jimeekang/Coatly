'use server';

import { redirect } from 'next/navigation';
import {
  calculateInvoiceTotals,
  getInvoiceCustomerOptions,
  getQuoteInvoiceLinkState,
  getInvoiceQuoteOptions,
  mapInvoiceDetail,
  mapInvoiceListItem,
  parseInvoiceCreateInput,
} from '@/lib/invoices';
import { getBusinessInvoiceDefaults } from '@/lib/businesses';
import { isQuoteLineItemIncluded } from '@/lib/quotes';
import {
  getActiveSubscriptionRequiredMessage,
  getSubscriptionSnapshotForUser,
} from '@/lib/subscription/access';
import { requireCurrentUser } from '@/lib/supabase/request-context';
import { createServerClient } from '@/lib/supabase/server';
import { sendInvoiceEmail } from '@/lib/email/resend';
import { formatAUD, formatDate } from '@/utils/format';
import type {
  InvoiceListItem,
  InvoicePaymentMethod,
  InvoiceWithCustomer,
} from '@/types/invoice';

type InvoiceListRow = {
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
  customer:
    | {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address_line1: string | null;
        city: string | null;
        state: string | null;
        postcode: string | null;
      }
    | Array<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address_line1: string | null;
        city: string | null;
        state: string | null;
        postcode: string | null;
      }>
    | null;
  line_items?: Array<{ id: string }> | null;
};

type CreateInvoiceActionInput = {
  customer_id: string;
  quote_id: string | null;
  invoice_type: 'full' | 'deposit' | 'progress' | 'final';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  business_abn: string | null;
  payment_terms: string | null;
  bank_details: string | null;
  due_date: string | null;
  paid_date: string | null;
  payment_method: InvoicePaymentMethod | null;
  notes: string | null;
  subtotal_cents?: number;
  gst_cents?: number;
  total_cents?: number;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
    gst_cents?: number;
    total_cents?: number;
    sort_order?: number;
  }>;
};

type UpdateInvoiceActionInput = CreateInvoiceActionInput;

const MANUAL_INVOICE_STATUSES = new Set<CreateInvoiceActionInput['status']>([
  'draft',
  'paid',
  'cancelled',
]);

function resolveInvoiceStatusForSave(
  requestedStatus: CreateInvoiceActionInput['status'],
  currentStatus?: CreateInvoiceActionInput['status']
) {
  if (MANUAL_INVOICE_STATUSES.has(requestedStatus)) {
    return { status: requestedStatus };
  }

  if (
    currentStatus &&
    requestedStatus === currentStatus &&
    (currentStatus === 'sent' || currentStatus === 'overdue')
  ) {
    return { status: currentStatus };
  }

  return {
    error:
      'Save invoices as draft, paid, or cancelled here. Sent is set after the invoice email is sent, and overdue follows automatically after the due date passes.',
  };
}

function buildPaidTimestamp(paidDate: string) {
  return new Date(`${paidDate}T12:00:00.000Z`).toISOString();
}

function resolveInvoicePaymentTracking(input: {
  status: CreateInvoiceActionInput['status'];
  total_cents: number;
  paid_date: string | null;
  payment_method: InvoicePaymentMethod | null;
}) {
  if (input.status !== 'paid') {
    return {
      amount_paid_cents: 0,
      paid_at: null,
      paid_date: null,
      payment_method: null,
    };
  }

  const paidDate = input.paid_date ?? new Date().toISOString().slice(0, 10);

  return {
    amount_paid_cents: input.total_cents,
    paid_at: buildPaidTimestamp(paidDate),
    paid_date: paidDate,
    payment_method: input.payment_method ?? null,
  };
}

async function validateQuoteLinkForInvoice(input: {
  supabase: Awaited<ReturnType<typeof createServerClient>>;
  userId: string;
  quoteId: string;
  customerId: string;
}) {
  const { data: quote, error: quoteError } = await input.supabase
    .from('quotes')
    .select('id, customer_id, status')
    .eq('id', input.quoteId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (quoteError) {
    return { data: null, error: quoteError.message };
  }

  if (!quote) {
    return { data: null, error: 'Selected quote was not found.' };
  }

  if (quote.status !== 'approved') {
    return { data: null, error: 'Only approved quotes can be linked to invoices.' };
  }

  if (quote.customer_id !== input.customerId) {
    return { data: null, error: 'Quote customer does not match the selected customer.' };
  }

  return {
    data: quote,
    error: null,
  };
}

type InvoiceDetailRow = {
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
  customer:
    | {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address_line1: string | null;
        city: string | null;
        state: string | null;
        postcode: string | null;
      }
    | Array<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address_line1: string | null;
        city: string | null;
        state: string | null;
        postcode: string | null;
      }>
    | null;
  line_items:
    | Array<{
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
      }>
    | null;
};

export async function getInvoices(): Promise<{
  data: InvoiceListItem[];
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const { data, error } = await supabase
    .from('invoices')
    .select(
      'id, user_id, customer_id, quote_id, invoice_number, status, invoice_type, subtotal_cents, gst_cents, total_cents, amount_paid_cents, business_abn, payment_terms, bank_details, due_date, paid_date, paid_at, payment_method, notes, created_at, updated_at, customer:customers!invoices_customer_user_fk(id, name, email, phone, address_line1, city, state, postcode), line_items:invoice_line_items(id)'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return {
    data: ((data as InvoiceListRow[] | null) ?? []).map((invoice) =>
      mapInvoiceListItem(invoice)
    ),
    error: error?.message ?? null,
  };
}

export async function getInvoiceFormOptions(): Promise<{
  data: {
    customers: Array<{
      id: string;
      name: string;
      company_name: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
    }>;
    quotes: Array<{
      id: string;
      quote_number: string;
      title: string | null;
      customer_id: string;
      subtotal_cents: number;
      total_cents: number;
      deposit_percent: number;
      status: string;
      valid_until: string | null;
      billed_subtotal_cents: number;
      linked_invoice_count: number;
      has_linked_invoices: boolean;
      line_items: Array<{
        description: string;
        quantity: number;
        unit_price_cents: number;
        total_cents: number;
        is_optional: boolean;
        is_selected: boolean;
      }>;
    }>;
    businessDefaults: {
      business_abn: string | null;
      payment_terms: string | null;
      bank_details: string | null;
    };
  };
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const [customersResult, quotesResult, businessDefaultsResult] = await Promise.all([
    getInvoiceCustomerOptions(supabase, user.id),
    getInvoiceQuoteOptions(supabase, user.id),
    getBusinessInvoiceDefaults(supabase, user.id, user.email ?? null),
  ]);

  const error = customersResult.error ?? quotesResult.error ?? businessDefaultsResult.error;

  return {
    data: {
      customers: customersResult.data,
      quotes: quotesResult.data,
      businessDefaults: businessDefaultsResult.data ?? {
        business_abn: null,
        payment_terms: null,
        bank_details: null,
      },
    },
    error,
  };
}

function buildInvoiceDescriptionFromQuoteLineItem(item: {
  name: string;
  notes?: string | null;
}) {
  return item.notes?.trim() ? `${item.name}\n${item.notes.trim()}` : item.name;
}

export async function getInvoiceDraftFromQuote(quoteId: string): Promise<{
  data:
    | {
        customer_id: string;
        quote_id: string;
        invoice_type: 'full';
        status: 'draft';
        business_abn: string | null;
        payment_terms: string | null;
        bank_details: string | null;
        due_date: string | null;
        paid_date: string | null;
        payment_method: InvoicePaymentMethod | null;
        linked_invoice_count: number;
        has_linked_invoices: boolean;
        notes: string | null;
        line_items: Array<{
          description: string;
          quantity: number;
          unit_price_cents: number;
        }>;
      }
    | null;
  error: string | null;
}> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [quoteResult, lineItemsResult, businessDefaultsResult, quoteInvoiceLinkStateResult] =
    await Promise.all([
      supabase
        .from('quotes')
        .select('id, customer_id, status, title, quote_number')
        .eq('id', quoteId)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('quote_line_items')
        .select(
          'id, name, notes, quantity, unit_price_cents, is_optional, is_selected, sort_order'
        )
        .eq('quote_id', quoteId)
        .order('sort_order', { ascending: true }),
      getBusinessInvoiceDefaults(supabase, user.id, user.email ?? null),
      getQuoteInvoiceLinkState(supabase, user.id, quoteId),
    ]);

  if (quoteResult.error) {
    return { data: null, error: quoteResult.error.message };
  }

  if (lineItemsResult.error) {
    return { data: null, error: lineItemsResult.error.message };
  }

  if (businessDefaultsResult.error) {
    return { data: null, error: businessDefaultsResult.error };
  }

  if (quoteInvoiceLinkStateResult.error) {
    return { data: null, error: quoteInvoiceLinkStateResult.error };
  }

  const quote = quoteResult.data;
  if (!quote) {
    return { data: null, error: 'Quote not found.' };
  }

  if (quote.status !== 'approved') {
    return { data: null, error: 'Only approved quotes can be invoiced from the quote screen.' };
  }

  const copiedLineItems = (lineItemsResult.data ?? [])
    .filter((item) => isQuoteLineItemIncluded(item))
    .map((item) => ({
      description: buildInvoiceDescriptionFromQuoteLineItem(item),
      quantity: Number(item.quantity),
      unit_price_cents: item.unit_price_cents,
    }));

  return {
    data: {
      customer_id: quote.customer_id,
      quote_id: quote.id,
      invoice_type: 'full',
      status: 'draft',
      business_abn: businessDefaultsResult.data?.business_abn ?? null,
      payment_terms: businessDefaultsResult.data?.payment_terms ?? null,
      bank_details: businessDefaultsResult.data?.bank_details ?? null,
      due_date: null,
      paid_date: null,
      payment_method: null,
      linked_invoice_count: quoteInvoiceLinkStateResult.data?.linked_invoice_count ?? 0,
      has_linked_invoices: quoteInvoiceLinkStateResult.data?.has_linked_invoices ?? false,
      notes: quote.title?.trim()
        ? `Linked to approved quote ${quote.quote_number} - ${quote.title.trim()}`
        : `Linked to approved quote ${quote.quote_number}`,
      line_items: copiedLineItems,
    },
    error: null,
  };
}

export async function getInvoice(id: string): Promise<{
  data: InvoiceWithCustomer | null;
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const { data, error } = await supabase
    .from('invoices')
    .select(
      'id, user_id, customer_id, quote_id, invoice_number, status, invoice_type, subtotal_cents, gst_cents, total_cents, amount_paid_cents, business_abn, payment_terms, bank_details, due_date, paid_date, paid_at, payment_method, notes, created_at, updated_at, customer:customers!invoices_customer_user_fk(id, name, email, phone, address_line1, city, state, postcode), line_items:invoice_line_items(id, invoice_id, description, quantity, unit_price_cents, gst_cents, total_cents, sort_order, created_at, updated_at)'
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  return {
    data: data ? mapInvoiceDetail(data as InvoiceDetailRow) : null,
    error: error?.message ?? null,
  };
}

export async function createInvoice(
  input: CreateInvoiceActionInput
): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return { error: getActiveSubscriptionRequiredMessage('invoice creation') };
  }

  const parsed = parseInvoiceCreateInput({
    ...input,
    business_abn: input.business_abn ?? undefined,
    payment_terms: input.payment_terms ?? undefined,
    bank_details: input.bank_details ?? undefined,
    due_date: input.due_date ?? '',
    paid_date: input.paid_date ?? '',
    payment_method: input.payment_method ?? undefined,
    notes: input.notes ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error };
  }

  const resolvedStatus = resolveInvoiceStatusForSave(parsed.data.status);
  if (resolvedStatus.error) {
    return { error: resolvedStatus.error };
  }
  const statusToSave = resolvedStatus.status as CreateInvoiceActionInput['status'];

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('id', parsed.data.customer_id)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .maybeSingle();

  if (customerError) {
    return { error: customerError.message };
  }

  if (!customer) {
    return { error: 'Selected customer was not found.' };
  }

  if (parsed.data.quote_id) {
    const quoteValidation = await validateQuoteLinkForInvoice({
      supabase,
      userId: user.id,
      quoteId: parsed.data.quote_id,
      customerId: parsed.data.customer_id,
    });

    if (quoteValidation.error) {
      return { error: quoteValidation.error };
    }
  }

  const { subtotal_cents, gst_cents, total_cents } = calculateInvoiceTotals(
    parsed.data.line_items
  );

  const paymentTracking = resolveInvoicePaymentTracking({
    status: statusToSave,
    total_cents,
    paid_date: parsed.data.paid_date,
    payment_method: parsed.data.payment_method,
  });

  const { data: invoiceNumber, error: invoiceNumberError } = await supabase.rpc(
    'generate_invoice_number',
    { user_uuid: user.id }
  );

  if (invoiceNumberError || !invoiceNumber) {
    return {
      error: invoiceNumberError?.message ?? 'Invoice number could not be generated.',
    };
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      customer_id: parsed.data.customer_id,
      quote_id: parsed.data.quote_id,
      invoice_number: invoiceNumber,
      status: statusToSave,
      invoice_type: parsed.data.invoice_type,
      business_abn: parsed.data.business_abn,
      payment_terms: parsed.data.payment_terms,
      bank_details: parsed.data.bank_details,
      subtotal_cents,
      gst_cents,
      total_cents,
      amount_paid_cents: paymentTracking.amount_paid_cents,
      due_date: parsed.data.due_date,
      paid_date: paymentTracking.paid_date,
      paid_at: paymentTracking.paid_at,
      payment_method: paymentTracking.payment_method,
      notes: parsed.data.notes,
    })
    .select('id')
    .single();

  if (invoiceError || !invoice) {
    return { error: invoiceError?.message ?? 'Invoice could not be created.' };
  }

  const lineItems = parsed.data.line_items.map((item, index) => {
    const total_cents = Math.round(item.quantity * item.unit_price_cents);
    const gst_cents = Math.round(total_cents * 0.1);

    return {
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      gst_cents,
      total_cents,
      sort_order: index,
    };
  });

  const { error: lineItemsError } = await supabase
    .from('invoice_line_items')
    .insert(lineItems);

  if (lineItemsError) {
    await supabase.from('invoices').delete().eq('id', invoice.id).eq('user_id', user.id);
    return { error: lineItemsError.message };
  }

  await supabase.rpc('calculate_invoice_totals', { invoice_uuid: invoice.id });

  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoice(
  id: string,
  input: UpdateInvoiceActionInput
): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return { error: getActiveSubscriptionRequiredMessage('invoice updates') };
  }

  const parsed = parseInvoiceCreateInput({
    ...input,
    business_abn: input.business_abn ?? undefined,
    payment_terms: input.payment_terms ?? undefined,
    bank_details: input.bank_details ?? undefined,
    due_date: input.due_date ?? '',
    paid_date: input.paid_date ?? '',
    payment_method: input.payment_method ?? undefined,
    notes: input.notes ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error };
  }

  const { data: existingInvoice, error: existingInvoiceError } = await supabase
    .from('invoices')
    .select('id, user_id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingInvoiceError) {
    return { error: existingInvoiceError.message };
  }

  if (!existingInvoice) {
    return { error: 'Invoice not found.' };
  }

  if (existingInvoice.status !== 'draft') {
    return { error: 'Only draft invoices can be edited.' };
  }

  const resolvedStatus = resolveInvoiceStatusForSave(
    parsed.data.status,
    existingInvoice.status as CreateInvoiceActionInput['status']
  );
  if (resolvedStatus.error) {
    return { error: resolvedStatus.error };
  }
  const statusToSave = resolvedStatus.status as CreateInvoiceActionInput['status'];

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('id', parsed.data.customer_id)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .maybeSingle();

  if (customerError) {
    return { error: customerError.message };
  }

  if (!customer) {
    return { error: 'Selected customer was not found.' };
  }

  if (parsed.data.quote_id) {
    const quoteValidation = await validateQuoteLinkForInvoice({
      supabase,
      userId: user.id,
      quoteId: parsed.data.quote_id,
      customerId: parsed.data.customer_id,
    });

    if (quoteValidation.error) {
      return { error: quoteValidation.error };
    }
  }

  const { subtotal_cents, gst_cents, total_cents } = calculateInvoiceTotals(
    parsed.data.line_items
  );

  const paymentTracking = resolveInvoicePaymentTracking({
    status: statusToSave,
    total_cents,
    paid_date: parsed.data.paid_date,
    payment_method: parsed.data.payment_method,
  });

  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({
      customer_id: parsed.data.customer_id,
      quote_id: parsed.data.quote_id,
      status: statusToSave,
      invoice_type: parsed.data.invoice_type,
      business_abn: parsed.data.business_abn,
      payment_terms: parsed.data.payment_terms,
      bank_details: parsed.data.bank_details,
      subtotal_cents,
      gst_cents,
      total_cents,
      amount_paid_cents: paymentTracking.amount_paid_cents,
      due_date: parsed.data.due_date,
      paid_date: paymentTracking.paid_date,
      paid_at: paymentTracking.paid_at,
      payment_method: paymentTracking.payment_method,
      notes: parsed.data.notes,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (invoiceError) {
    return { error: invoiceError.message };
  }

  const { error: deleteLineItemsError } = await supabase
    .from('invoice_line_items')
    .delete()
    .eq('invoice_id', id);

  if (deleteLineItemsError) {
    return { error: deleteLineItemsError.message };
  }

  const lineItems = parsed.data.line_items.map((item, index) => {
    const total_cents = Math.round(item.quantity * item.unit_price_cents);
    const gst_cents = Math.round(total_cents * 0.1);

    return {
      invoice_id: id,
      description: item.description,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      gst_cents,
      total_cents,
      sort_order: index,
    };
  });

  const { error: lineItemsError } = await supabase
    .from('invoice_line_items')
    .insert(lineItems);

  if (lineItemsError) {
    return { error: lineItemsError.message };
  }

  await supabase.rpc('calculate_invoice_totals', { invoice_uuid: id });

  redirect(`/invoices/${id}`);
}

export async function sendInvoice(id: string): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(
      'id, invoice_number, invoice_type, status, total_cents, due_date, notes, customer_id, user_id, customers!invoices_customer_user_fk(name, email)'
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (invoiceError || !invoice) {
    return { error: invoiceError?.message ?? 'Invoice not found.' };
  }

  if (invoice.status !== 'draft') {
    return { error: 'Only draft invoices can be sent.' };
  }

  const customer = Array.isArray(invoice.customers)
    ? invoice.customers[0]
    : invoice.customers;

  if (!customer?.email) {
    return { error: 'Customer email is required to send an invoice.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const businessName = profile?.business_name ?? 'Your contractor';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.coatly.com.au';

  const { error: emailError } = await sendInvoiceEmail({
    to: customer.email,
    customerName: customer.name,
    businessName,
    invoiceNumber: invoice.invoice_number,
    invoiceType: invoice.invoice_type,
    totalFormatted: formatAUD(invoice.total_cents),
    dueDate: invoice.due_date ? formatDate(invoice.due_date) : null,
    notes: invoice.notes,
    pdfUrl: `${appUrl}/api/pdf/invoice?id=${invoice.id}`,
  });

  if (emailError) {
    return { error: emailError };
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({ status: 'sent' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  redirect(`/invoices/${id}`);
}

export async function deleteInvoice(id: string): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return { error: getActiveSubscriptionRequiredMessage('invoice management') };
  }

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  redirect('/invoices');
}
