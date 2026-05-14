import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendInvoiceReminder } from '@/lib/email/resend';
import { formatAUD } from '@/utils/format';
import { formatDate } from '@/utils/format';

// Vercel Cron: runs daily at 08:00 Sydney time (22:00 UTC)
// Security: only Vercel's cron service can call this endpoint
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

type InvoiceReminderRow = {
  id: string;
  invoice_number: string;
  total_cents: number;
  due_date: string;
  status: string;
  due_reminder_sent_at: string | null;
  overdue_reminder_sent_at: string | null;
  user_id: string;
  customers: {
    name: string;
    email: string | null;
  } | null;
};

type ReminderType = 'due_soon' | 'overdue';

type ReminderBucket = {
  sent: number;
  skipped: number;
  errors: number;
};

type ReminderResults = {
  due_soon: ReminderBucket;
  overdue: ReminderBucket;
  error_samples: Array<{
    invoice_id: string;
    invoice_number: string;
    reminder_type: ReminderType;
    error: string;
  }>;
};

type ReminderSupabaseClient = ReturnType<typeof createAdminClient>;

async function reserveReminderEvent(input: {
  supabase: ReminderSupabaseClient;
  invoice: InvoiceReminderRow;
  reminderType: ReminderType;
  scheduledFor: string;
  nowIso: string;
}) {
  const { data: existingEvent, error: existingError } = await input.supabase
    .from('invoice_reminder_events')
    .select('id, status')
    .eq('invoice_id', input.invoice.id)
    .eq('reminder_type', input.reminderType)
    .maybeSingle();

  if (existingError) {
    return { reserved: false, error: existingError.message };
  }

  if (existingEvent?.status === 'sent' || existingEvent?.status === 'pending') {
    return { reserved: false, error: null };
  }

  if (existingEvent) {
    const { error: updateError } = await input.supabase
      .from('invoice_reminder_events')
      .update({
        status: 'pending',
        last_attempted_at: input.nowIso,
        error_message: null,
      })
      .eq('id', existingEvent.id);

    return { reserved: !updateError, error: updateError?.message ?? null };
  }

  const { error: insertError } = await input.supabase
    .from('invoice_reminder_events')
    .insert({
      user_id: input.invoice.user_id,
      invoice_id: input.invoice.id,
      reminder_type: input.reminderType,
      status: 'pending',
      scheduled_for: input.scheduledFor,
      attempt_count: 1,
      last_attempted_at: input.nowIso,
    });

  if (insertError) {
    return { reserved: false, error: insertError.message };
  }

  return { reserved: true, error: null };
}

async function updateReminderEvent(input: {
  supabase: ReminderSupabaseClient;
  invoiceId: string;
  reminderType: ReminderType;
  status: 'sent' | 'failed';
  nowIso: string;
  errorMessage?: string;
}) {
  return input.supabase
    .from('invoice_reminder_events')
    .update({
      status: input.status,
      sent_at: input.status === 'sent' ? input.nowIso : null,
      error_message: input.errorMessage ?? null,
      last_attempted_at: input.nowIso,
    })
    .eq('invoice_id', input.invoiceId)
    .eq('reminder_type', input.reminderType);
}

async function processReminder(input: {
  supabase: ReminderSupabaseClient;
  invoice: InvoiceReminderRow;
  reminderType: ReminderType;
  scheduledFor: string;
  nowIso: string;
  businessName: string;
  results: ReminderResults;
}) {
  const bucket = input.results[input.reminderType];
  const email = input.invoice.customers?.email;
  if (!email) {
    bucket.skipped++;
    return;
  }

  const reserve = await reserveReminderEvent(input);
  if (reserve.error) {
    bucket.errors++;
    input.results.error_samples.push({
      invoice_id: input.invoice.id,
      invoice_number: input.invoice.invoice_number,
      reminder_type: input.reminderType,
      error: reserve.error,
    });
    return;
  }

  if (!reserve.reserved) {
    bucket.skipped++;
    return;
  }

  const { error } = await sendInvoiceReminder({
    to: email,
    customerName: input.invoice.customers?.name ?? 'there',
    businessName: input.businessName,
    invoiceNumber: input.invoice.invoice_number,
    totalFormatted: formatAUD(input.invoice.total_cents),
    dueDate: formatDate(input.invoice.due_date),
    reminderType: input.reminderType,
  });

  if (error) {
    await updateReminderEvent({
      supabase: input.supabase,
      invoiceId: input.invoice.id,
      reminderType: input.reminderType,
      status: 'failed',
      nowIso: input.nowIso,
      errorMessage: error,
    });
    bucket.errors++;
    input.results.error_samples.push({
      invoice_id: input.invoice.id,
      invoice_number: input.invoice.invoice_number,
      reminder_type: input.reminderType,
      error,
    });
    return;
  }

  const sentEventResult = await updateReminderEvent({
    supabase: input.supabase,
    invoiceId: input.invoice.id,
    reminderType: input.reminderType,
    status: 'sent',
    nowIso: input.nowIso,
  });

  if (sentEventResult.error) {
    bucket.errors++;
    input.results.error_samples.push({
      invoice_id: input.invoice.id,
      invoice_number: input.invoice.invoice_number,
      reminder_type: input.reminderType,
      error: sentEventResult.error.message,
    });
    return;
  }

  const invoiceUpdate =
    input.reminderType === 'due_soon'
      ? { due_reminder_sent_at: input.nowIso }
      : { overdue_reminder_sent_at: input.nowIso };

  const { error: updateError } = await input.supabase
    .from('invoices')
    .update(invoiceUpdate)
    .eq('id', input.invoice.id);

  if (updateError) {
    bucket.errors++;
    input.results.error_samples.push({
      invoice_id: input.invoice.id,
      invoice_number: input.invoice.invoice_number,
      reminder_type: input.reminderType,
      error: updateError.message,
    });
    return;
  }

  bucket.sent++;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  // D-3: due_date is exactly 3 days from now, not yet sent, status = sent
  const dueSoonStart = new Date(now);
  dueSoonStart.setDate(dueSoonStart.getDate() + 3);
  dueSoonStart.setHours(0, 0, 0, 0);

  const dueSoonEnd = new Date(now);
  dueSoonEnd.setDate(dueSoonEnd.getDate() + 3);
  dueSoonEnd.setHours(23, 59, 59, 999);

  // D+7: due_date was exactly 7 days ago, not yet sent, status = sent or overdue
  const overdueStart = new Date(now);
  overdueStart.setDate(overdueStart.getDate() - 7);
  overdueStart.setHours(0, 0, 0, 0);

  const overdueEnd = new Date(now);
  overdueEnd.setDate(overdueEnd.getDate() - 7);
  overdueEnd.setHours(23, 59, 59, 999);

  const invoiceSelect =
    'id, invoice_number, total_cents, due_date, status, due_reminder_sent_at, overdue_reminder_sent_at, user_id, customers(name, email)';

  const [dueSoonResult, overdueResult] = await Promise.all([
    supabase
      .from('invoices')
      .select(invoiceSelect)
      .in('status', ['sent'])
      .is('due_reminder_sent_at', null)
      .gte('due_date', dueSoonStart.toISOString().slice(0, 10))
      .lte('due_date', dueSoonEnd.toISOString().slice(0, 10)),

    supabase
      .from('invoices')
      .select(invoiceSelect)
      .in('status', ['sent', 'overdue'])
      .is('overdue_reminder_sent_at', null)
      .gte('due_date', overdueStart.toISOString().slice(0, 10))
      .lte('due_date', overdueEnd.toISOString().slice(0, 10)),
  ]);

  const queryError = dueSoonResult.error?.message ?? overdueResult.error?.message ?? null;
  if (queryError) {
    return NextResponse.json({ ok: false, error: queryError }, { status: 500 });
  }

  const allInvoices = [
    ...(dueSoonResult.data ?? []),
    ...(overdueResult.data ?? []),
  ] as InvoiceReminderRow[];

  // Fetch business names for all unique user_ids in one query
  const userIds = [...new Set(allInvoices.map((inv) => inv.user_id))];
  const businessNameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('user_id, business_name')
      .in('user_id', userIds);
    for (const row of profileRows ?? []) {
      businessNameMap.set(row.user_id, row.business_name);
    }
  }

  const results: ReminderResults = {
    due_soon: { sent: 0, skipped: 0, errors: 0 },
    overdue: { sent: 0, skipped: 0, errors: 0 },
    error_samples: [],
  };

  for (const invoice of (dueSoonResult.data ?? []) as InvoiceReminderRow[]) {
    await processReminder({
      supabase,
      invoice,
      reminderType: 'due_soon',
      scheduledFor: invoice.due_date,
      nowIso,
      businessName: businessNameMap.get(invoice.user_id) ?? 'Your contractor',
      results,
    });
  }

  for (const invoice of (overdueResult.data ?? []) as InvoiceReminderRow[]) {
    await processReminder({
      supabase,
      invoice,
      reminderType: 'overdue',
      scheduledFor: invoice.due_date,
      nowIso,
      businessName: businessNameMap.get(invoice.user_id) ?? 'Your contractor',
      results,
    });
  }

  return NextResponse.json({ ok: true, results });
}
