'use server';

import { redirect } from 'next/navigation';
import {
  calculateInvoiceTotals,
  getInvoiceCustomerOptions,
  getInvoiceQuoteOptions,
  mapInvoiceDetail,
  mapInvoiceListItem,
  parseInvoiceCreateInput,
} from '@/lib/invoices';
import {
  getActiveSubscriptionRequiredMessage,
  getSubscriptionSnapshotForUser,
} from '@/lib/subscription/access';
import { requireCurrentUser } from '@/lib/supabase/request-context';
import { createServerClient } from '@/lib/supabase/server';
import type { InvoiceListItem, InvoiceWithCustomer } from '@/types/invoice';

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
  due_date: string | null;
  paid_at: string | null;
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
  due_date: string | null;
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
  due_date: string | null;
  paid_at: string | null;
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
      'id, user_id, customer_id, quote_id, invoice_number, status, invoice_type, subtotal_cents, gst_cents, total_cents, amount_paid_cents, due_date, paid_at, notes, created_at, updated_at, customer:customers!invoices_customer_user_fk(id, name, email, phone, address_line1, city, state, postcode), line_items:invoice_line_items(id)'
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
      total_cents: number;
      status: string;
      valid_until: string | null;
    }>;
  };
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const [customersResult, quotesResult] = await Promise.all([
    getInvoiceCustomerOptions(supabase, user.id),
    getInvoiceQuoteOptions(supabase, user.id),
  ]);

  const error = customersResult.error ?? quotesResult.error;

  return {
    data: {
      customers: customersResult.data,
      quotes: quotesResult.data,
    },
    error,
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
      'id, user_id, customer_id, quote_id, invoice_number, status, invoice_type, subtotal_cents, gst_cents, total_cents, amount_paid_cents, due_date, paid_at, notes, created_at, updated_at, customer:customers!invoices_customer_user_fk(id, name, email, phone, address_line1, city, state, postcode), line_items:invoice_line_items(id, invoice_id, description, quantity, unit_price_cents, gst_cents, total_cents, sort_order, created_at, updated_at)'
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
    due_date: input.due_date ?? '',
    notes: input.notes ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error };
  }

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
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, customer_id')
      .eq('id', parsed.data.quote_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (quoteError) {
      return { error: quoteError.message };
    }

    if (!quote) {
      return { error: 'Selected quote was not found.' };
    }

    if (quote.customer_id !== parsed.data.customer_id) {
      return { error: 'Quote customer does not match the selected customer.' };
    }
  }

  const { subtotal_cents, gst_cents, total_cents } = calculateInvoiceTotals(
    parsed.data.line_items
  );

  const amount_paid_cents = parsed.data.status === 'paid' ? total_cents : 0;
  const paid_at = parsed.data.status === 'paid' ? new Date().toISOString() : null;

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
      status: parsed.data.status,
      invoice_type: parsed.data.invoice_type,
      subtotal_cents,
      gst_cents,
      total_cents,
      amount_paid_cents,
      due_date: parsed.data.due_date,
      paid_at,
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
    due_date: input.due_date ?? '',
    notes: input.notes ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error };
  }

  const { data: existingInvoice, error: existingInvoiceError } = await supabase
    .from('invoices')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingInvoiceError) {
    return { error: existingInvoiceError.message };
  }

  if (!existingInvoice) {
    return { error: 'Invoice not found.' };
  }

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
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, customer_id')
      .eq('id', parsed.data.quote_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (quoteError) {
      return { error: quoteError.message };
    }

    if (!quote) {
      return { error: 'Selected quote was not found.' };
    }

    if (quote.customer_id !== parsed.data.customer_id) {
      return { error: 'Quote customer does not match the selected customer.' };
    }
  }

  const { subtotal_cents, gst_cents, total_cents } = calculateInvoiceTotals(
    parsed.data.line_items
  );

  const amount_paid_cents = parsed.data.status === 'paid' ? total_cents : 0;
  const paid_at = parsed.data.status === 'paid' ? new Date().toISOString() : null;

  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({
      customer_id: parsed.data.customer_id,
      quote_id: parsed.data.quote_id,
      status: parsed.data.status,
      invoice_type: parsed.data.invoice_type,
      subtotal_cents,
      gst_cents,
      total_cents,
      amount_paid_cents,
      due_date: parsed.data.due_date,
      paid_at,
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
