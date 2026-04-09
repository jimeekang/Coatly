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

export interface SendInvoiceEmailParams {
  to: string;
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  invoiceType: string;
  totalFormatted: string;
  dueDate: string | null;
  notes: string | null;
  pdfUrl: string;
}

export interface SendInvoiceReminderParams {
  to: string;
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  totalFormatted: string;
  dueDate: string;
  reminderType: InvoiceReminderType;
}

export interface SendQuoteApprovalNotificationParams {
  to: string;
  businessName: string;
  quoteNumber: string;
  quoteTitle: string | null;
  customerName: string;
  customerEmail: string | null;
  approvedByName: string;
  approvedByEmail: string;
  approvedAt: string;
  totalFormatted: string;
  signature: string;
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

function buildQuoteApprovalHtml(p: SendQuoteApprovalNotificationParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="margin-bottom:4px">Quote approved</h2>
  <p style="color:#666;margin-top:0">For ${escapeHtml(p.businessName)}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
  <p>
    Quote <strong>${escapeHtml(p.quoteNumber)}</strong>
    ${p.quoteTitle ? `(${escapeHtml(p.quoteTitle)})` : ''}
    has been approved.
  </p>
  <p><strong>Customer:</strong> ${escapeHtml(p.customerName)}</p>
  ${p.customerEmail ? `<p><strong>Customer email:</strong> ${escapeHtml(p.customerEmail)}</p>` : ''}
  <p><strong>Approved by:</strong> ${escapeHtml(p.approvedByName)}</p>
  <p><strong>Approval email:</strong> ${escapeHtml(p.approvedByEmail)}</p>
  <p><strong>Typed signature:</strong> ${escapeHtml(p.signature)}</p>
  <p><strong>Approved at:</strong> ${escapeHtml(p.approvedAt)}</p>
  <p><strong>Total:</strong> ${escapeHtml(p.totalFormatted)}</p>
  <p style="margin-top:32px">Coatly notification</p>
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

function buildInvoiceEmailHtml(p: SendInvoiceEmailParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="margin-bottom:4px">Invoice ${escapeHtml(p.invoiceNumber)}</h2>
  <p style="color:#666;margin-top:0">From ${escapeHtml(p.businessName)}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
  <p>Hi ${escapeHtml(p.customerName)},</p>
  <p>Please find your invoice attached below.</p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0">
    <tr>
      <td style="padding:8px 0;color:#666">Invoice</td>
      <td style="padding:8px 0;text-align:right;font-weight:600">${escapeHtml(p.invoiceNumber)}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#666">Type</td>
      <td style="padding:8px 0;text-align:right;font-weight:600;text-transform:capitalize">${escapeHtml(p.invoiceType)}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#666">Amount due</td>
      <td style="padding:8px 0;text-align:right;font-weight:600;font-size:18px">${escapeHtml(p.totalFormatted)}</td>
    </tr>
    ${p.dueDate ? `<tr><td style="padding:8px 0;color:#666">Due date</td><td style="padding:8px 0;text-align:right;font-weight:600">${escapeHtml(p.dueDate)}</td></tr>` : ''}
  </table>
  ${p.notes ? `<p style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:14px">${escapeHtml(p.notes)}</p>` : ''}
  <a href="${escapeHtml(p.pdfUrl)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin:8px 0">View Invoice PDF</a>
  <p style="margin-top:32px">Thanks,<br>${escapeHtml(p.businessName)}</p>
</body>
</html>`;
}

export async function sendInvoiceEmail(
  params: SendInvoiceEmailParams,
): Promise<{ error: string | null }> {
  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: `Invoice ${params.invoiceNumber} from ${params.businessName} — ${params.totalFormatted}${params.dueDate ? ` due ${params.dueDate}` : ''}`,
    html: buildInvoiceEmailHtml(params),
  });

  if (error) return { error: error.message };
  return { error: null };
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

export async function sendQuoteApprovalNotification(
  params: SendQuoteApprovalNotificationParams
): Promise<{ error: string | null }> {
  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `Quote approved: ${params.quoteNumber}`,
      html: buildQuoteApprovalHtml(params),
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Quote approval email could not be sent.',
    };
  }
}
