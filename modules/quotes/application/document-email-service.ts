import 'server-only';

import { renderToBuffer } from '@react-pdf/renderer';
import { sendQuoteEmail } from '@/lib/email/resend';
import { QuoteTemplate } from '@/lib/pdf/quote-template';
import { createStorageObjectDataUrl } from '@/lib/supabase/storage';
import { getBusinessDocumentBranding } from '@/modules/settings/infrastructure/businesses';
import {
  getHydratedQuoteDetailForUser,
  type QuoteDataClient,
} from '@/modules/quotes/infrastructure/quote-repository';
import { formatAUD, formatDate } from '@/utils/format';

export async function sendQuoteDocumentEmail(input: {
  supabase: QuoteDataClient;
  userId: string;
  userEmail: string | null;
  quoteId: string;
  to: string;
}): Promise<{ error: string | null }> {
  const [quoteDetailResult, businessBrandingResult] = await Promise.all([
    getHydratedQuoteDetailForUser(input.supabase, input.quoteId, input.userId),
    getBusinessDocumentBranding(input.supabase, input.userId, input.userEmail),
  ]);

  if (quoteDetailResult.error || !quoteDetailResult.data) {
    return {
      error: quoteDetailResult.error ?? 'Quote email could not be prepared.',
    };
  }

  const businessBranding = businessBrandingResult.data;
  const businessName = businessBranding?.name || 'My Painting Business';
  const logoUrl = await createStorageObjectDataUrl(
    input.supabase,
    businessBranding?.logoPath ?? null
  );
  const pdfBuffer = await renderToBuffer(
    QuoteTemplate({
      quote: quoteDetailResult.data,
      businessName,
      abn: businessBranding?.abn ?? null,
      phone: businessBranding?.phone ?? null,
      email: businessBranding?.email ?? input.userEmail,
      businessAddress: businessBranding?.address ?? null,
      logoUrl,
    })
  );
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.coatly.com.au';
  const publicShareToken = quoteDetailResult.data.public_share_token.trim();

  if (!publicShareToken) {
    return {
      error:
        'Quote email could not be sent because the public approval link is missing. Apply the public quote sharing database migration and try again.',
    };
  }

  return sendQuoteEmail({
    to: input.to,
    customerName: quoteDetailResult.data.customer.name,
    businessName,
    quoteNumber: quoteDetailResult.data.quote_number,
    quoteTitle: quoteDetailResult.data.title,
    totalFormatted: formatAUD(quoteDetailResult.data.total_cents),
    validUntil: quoteDetailResult.data.valid_until
      ? formatDate(quoteDetailResult.data.valid_until)
      : null,
    approvalUrl: `${appUrl.replace(/\/$/, '')}/q/${publicShareToken}`,
    pdfAttachment: Buffer.from(pdfBuffer),
  });
}
