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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // D-3: due_date is exactly 3 days from now (±12h window), not yet sent, status = sent
  const dueSoonStart = new Date(now);
  dueSoonStart.setDate(dueSoonStart.getDate() + 2);
  dueSoonStart.setHours(0, 0, 0, 0);

  const dueSoonEnd = new Date(now);
  dueSoonEnd.setDate(dueSoonEnd.getDate() + 3);
  dueSoonEnd.setHours(23, 59, 59, 999);

  // D+7: due_date was 7 days ago, not yet sent, status = sent or overdue
  const overdueStart = new Date(now);
  overdueStart.setDate(overdueStart.getDate() - 8);
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

  const results = {
    due_soon: { sent: 0, skipped: 0, errors: 0 },
    overdue: { sent: 0, skipped: 0, errors: 0 },
  };

  // Process due-soon reminders
  for (const invoice of (dueSoonResult.data ?? []) as InvoiceReminderRow[]) {
    const email = invoice.customers?.email;
    if (!email) { results.due_soon.skipped++; continue; }

    const { error } = await sendInvoiceReminder({
      to: email,
      customerName: invoice.customers?.name ?? 'there',
      businessName: businessNameMap.get(invoice.user_id) ?? 'Your contractor',
      invoiceNumber: invoice.invoice_number,
      totalFormatted: formatAUD(invoice.total_cents),
      dueDate: formatDate(invoice.due_date),
      reminderType: 'due_soon',
    });

    if (error) { results.due_soon.errors++; continue; }

    await supabase
      .from('invoices')
      .update({ due_reminder_sent_at: now.toISOString() })
      .eq('id', invoice.id);

    results.due_soon.sent++;
  }

  // Process overdue reminders
  for (const invoice of (overdueResult.data ?? []) as InvoiceReminderRow[]) {
    const email = invoice.customers?.email;
    if (!email) { results.overdue.skipped++; continue; }

    const { error } = await sendInvoiceReminder({
      to: email,
      customerName: invoice.customers?.name ?? 'there',
      businessName: businessNameMap.get(invoice.user_id) ?? 'Your contractor',
      invoiceNumber: invoice.invoice_number,
      totalFormatted: formatAUD(invoice.total_cents),
      dueDate: formatDate(invoice.due_date),
      reminderType: 'overdue',
    });

    if (error) { results.overdue.errors++; continue; }

    await supabase
      .from('invoices')
      .update({ overdue_reminder_sent_at: now.toISOString() })
      .eq('id', invoice.id);

    results.overdue.sent++;
  }

  return NextResponse.json({ ok: true, results });
}
