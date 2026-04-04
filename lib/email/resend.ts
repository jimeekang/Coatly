import 'server-only';
import { Resend } from 'resend';

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');
  return new Resend(apiKey);
}

const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? 'Coatly <noreply@coatly.com.au>';

export type InvoiceReminderType = 'due_soon' | 'overdue';

export interface SendInvoiceReminderParams {
  to: string;
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  totalFormatted: string;
  dueDate: string;
  reminderType: InvoiceReminderType;
}

function buildDueSoonHtml(p: SendInvoiceReminderParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="margin-bottom:4px">Payment reminder</h2>
  <p style="color:#666;margin-top:0">From ${escapeHtml(p.businessName)}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
  <p>Hi ${escapeHtml(p.customerName)},</p>
  <p>
    This is a friendly reminder that invoice <strong>${escapeHtml(p.invoiceNumber)}</strong>
    for <strong>${escapeHtml(p.totalFormatted)}</strong> is due on
    <strong>${escapeHtml(p.dueDate)}</strong>.
  </p>
  <p>Please arrange payment before the due date. If you have any questions, feel free to reply to this email.</p>
  <p style="margin-top:32px">Thanks,<br>${escapeHtml(p.businessName)}</p>
</body>
</html>`;
}

function buildOverdueHtml(p: SendInvoiceReminderParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="margin-bottom:4px;color:#dc2626">Payment overdue</h2>
  <p style="color:#666;margin-top:0">From ${escapeHtml(p.businessName)}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
  <p>Hi ${escapeHtml(p.customerName)},</p>
  <p>
    Invoice <strong>${escapeHtml(p.invoiceNumber)}</strong>
    for <strong>${escapeHtml(p.totalFormatted)}</strong> was due on
    <strong>${escapeHtml(p.dueDate)}</strong> and is now overdue.
  </p>
  <p>Please arrange payment at your earliest convenience. If you believe this is an error or have already paid, please reply to this email.</p>
  <p style="margin-top:32px">Thanks,<br>${escapeHtml(p.businessName)}</p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendInvoiceReminder(
  params: SendInvoiceReminderParams,
): Promise<{ error: string | null }> {
  const resend = getResendClient();

  const subject =
    params.reminderType === 'due_soon'
      ? `Payment reminder: ${params.invoiceNumber} due ${params.dueDate}`
      : `Overdue invoice: ${params.invoiceNumber}`;

  const html =
    params.reminderType === 'due_soon'
      ? buildDueSoonHtml(params)
      : buildOverdueHtml(params);

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject,
    html,
  });

  if (error) return { error: error.message };
  return { error: null };
}
