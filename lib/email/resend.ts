import 'server-only';
import { Resend } from 'resend';

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');
  return new Resend(apiKey);
}

function getEmailConfig(): { resend: Resend; from: string } | { error: string } {
  const from = process.env.RESEND_FROM_ADDRESS?.trim();
  if (!from) {
    return {
      error:
        'RESEND_FROM_ADDRESS is not set. Add a verified Resend sender address before sending customer emails.',
    };
  }

  try {
    return { resend: getResendClient(), from };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Email provider could not be configured.',
    };
  }
}

export type InvoiceReminderType = 'due_soon' | 'overdue';

const INVOICE_TYPE_LABEL: Record<string, string> = {
  full:     'Invoice',
  deposit:  'Deposit Invoice',
  progress: 'Progress Claim',
  final:    'Final Invoice',
};

function invoiceTypeLabel(type: string): string {
  return INVOICE_TYPE_LABEL[type] ?? 'Invoice';
}

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
  pdfAttachment?: Buffer;
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

export interface SendQuoteEmailParams {
  to: string;
  customerName: string;
  businessName: string;
  quoteNumber: string;
  quoteTitle: string | null;
  totalFormatted: string;
  validUntil: string | null;
  approvalUrl: string;
  pdfAttachment?: Buffer;
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
  <h2 style="margin-bottom:4px">${escapeHtml(invoiceTypeLabel(p.invoiceType))} ${escapeHtml(p.invoiceNumber)}</h2>
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

function buildQuoteEmailHtml(p: SendQuoteEmailParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="margin-bottom:4px">Quote ${escapeHtml(p.quoteNumber)}</h2>
  <p style="color:#666;margin-top:0">From ${escapeHtml(p.businessName)}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
  <p>Hi ${escapeHtml(p.customerName)},</p>
  <p>Please review your quote using the secure link below. A PDF copy is attached for your records.</p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0">
    <tr>
      <td style="padding:8px 0;color:#666">Quote</td>
      <td style="padding:8px 0;text-align:right;font-weight:600">${escapeHtml(p.quoteNumber)}</td>
    </tr>
    ${p.quoteTitle ? `<tr><td style="padding:8px 0;color:#666">Job</td><td style="padding:8px 0;text-align:right;font-weight:600">${escapeHtml(p.quoteTitle)}</td></tr>` : ''}
    <tr>
      <td style="padding:8px 0;color:#666">Total</td>
      <td style="padding:8px 0;text-align:right;font-weight:600;font-size:18px">${escapeHtml(p.totalFormatted)}</td>
    </tr>
    ${p.validUntil ? `<tr><td style="padding:8px 0;color:#666">Valid until</td><td style="padding:8px 0;text-align:right;font-weight:600">${escapeHtml(p.validUntil)}</td></tr>` : ''}
  </table>
  <a href="${escapeHtml(p.approvalUrl)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin:8px 0">Review and approve quote</a>
  <p style="margin-top:32px">Thanks,<br>${escapeHtml(p.businessName)}</p>
</body>
</html>`;
}

export async function sendInvoiceEmail(
  params: SendInvoiceEmailParams,
): Promise<{ error: string | null }> {
  const config = getEmailConfig();
  if ('error' in config) return { error: config.error };

  const { error } = await config.resend.emails.send({
    from: config.from,
    to: params.to,
    subject: `${invoiceTypeLabel(params.invoiceType)} ${params.invoiceNumber} from ${params.businessName} — ${params.totalFormatted}${params.dueDate ? ` due ${params.dueDate}` : ''}`,
    html: buildInvoiceEmailHtml(params),
    attachments: params.pdfAttachment
      ? [
          {
            filename: `invoice-${params.invoiceNumber}.pdf`,
            content: params.pdfAttachment,
            contentType: 'application/pdf',
          },
        ]
      : undefined,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function sendQuoteEmail(
  params: SendQuoteEmailParams
): Promise<{ error: string | null }> {
  const config = getEmailConfig();
  if ('error' in config) return { error: config.error };

  const { error } = await config.resend.emails.send({
    from: config.from,
    to: params.to,
    subject: `Quote ${params.quoteNumber} from ${params.businessName} — ${params.totalFormatted}`,
    html: buildQuoteEmailHtml(params),
    attachments: params.pdfAttachment
      ? [
          {
            filename: `quote-${params.quoteNumber}.pdf`,
            content: params.pdfAttachment,
            contentType: 'application/pdf',
          },
        ]
      : undefined,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function sendInvoiceReminder(
  params: SendInvoiceReminderParams,
): Promise<{ error: string | null }> {
  const config = getEmailConfig();
  if ('error' in config) return { error: config.error };

  const subject =
    params.reminderType === 'due_soon'
      ? `Payment reminder: ${params.invoiceNumber} due ${params.dueDate}`
      : `Overdue invoice: ${params.invoiceNumber}`;

  const html =
    params.reminderType === 'due_soon'
      ? buildDueSoonHtml(params)
      : buildOverdueHtml(params);

  const { error } = await config.resend.emails.send({
    from: config.from,
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
    const config = getEmailConfig();
    if ('error' in config) return { error: config.error };

    const { error } = await config.resend.emails.send({
      from: config.from,
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
