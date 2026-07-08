import 'server-only';

import {
  isMissingQuoteCustomerSnapshotColumnError,
  getPublicQuoteShareAccessError,
  resolveQuoteCustomerSummary,
  resolveQuoteStatus,
} from '@/modules/quotes/domain/quotes';
import {
  PUBLIC_QUOTE_APPROVAL_SELECT,
  PUBLIC_QUOTE_APPROVAL_SELECT_LEGACY,
  type PublicQuoteApprovalRow,
  type QuoteDataClient,
} from '@/modules/quotes/infrastructure/quote-repository';
import { getBusinessDocumentBranding } from '@/modules/settings/application/business-branding';
import { sendQuoteApprovalNotification } from '@/lib/email/resend';
import { formatAUD, formatDate } from '@/utils/format';

type PublicQuoteResponseResult = {
  data: { quoteId: string } | null;
  error: string | null;
};

export async function approvePublicQuoteResponse({
  supabase,
  quoteToken,
  approvedByName,
  approvedByEmail,
  approvalSignature,
}: {
  supabase: QuoteDataClient;
  quoteToken: string;
  approvedByName: string;
  approvedByEmail: string;
  approvalSignature: string;
}): Promise<PublicQuoteResponseResult> {
  const quoteResult = await supabase
    .from('quotes')
    .select(PUBLIC_QUOTE_APPROVAL_SELECT)
    .eq('public_share_token', quoteToken)
    .single();
  let quote = quoteResult.data as PublicQuoteApprovalRow | null;
  let quoteError = quoteResult.error;

  if (
    quoteError &&
    isMissingQuoteCustomerSnapshotColumnError(quoteError.message)
  ) {
    const legacyResult = await supabase
      .from('quotes')
      .select(PUBLIC_QUOTE_APPROVAL_SELECT_LEGACY)
      .eq('public_share_token', quoteToken)
      .single();

    quote = legacyResult.data as PublicQuoteApprovalRow | null;
    quoteError = legacyResult.error;
  }

  const publicShareAccessError = quote
    ? getPublicQuoteShareAccessError(quote)
    : null;

  if (
    quoteError ||
    !quote ||
    publicShareAccessError ||
    resolveQuoteStatus({
      status: quote.status,
      valid_until: quote.valid_until,
    }) !== 'sent'
  ) {
    return {
      data: null,
      error:
        publicShareAccessError ??
        'This quote is no longer available for approval.',
    };
  }

  const approvedAt = new Date().toISOString();

  const { error: updateQuoteError } = await supabase
    .from('quotes')
    .update({
      status: 'approved',
      approved_at: approvedAt,
      approved_by_name: approvedByName,
      approved_by_email: approvedByEmail,
      approval_signature: approvalSignature,
    })
    .eq('id', quote.id)
    .eq('public_share_token', quoteToken);

  if (updateQuoteError) {
    return { data: null, error: updateQuoteError.message };
  }

  const customer = resolveQuoteCustomerSummary({
    customer: quote.customer,
    customer_email: quote.customer_email,
    customer_address: quote.customer_address,
  });
  const businessResult = await getBusinessDocumentBranding(
    supabase,
    quote.user_id,
    null
  );
  const ownerEmail = businessResult.data?.email?.trim() ?? null;

  if (ownerEmail) {
    await sendQuoteApprovalNotification({
      to: ownerEmail,
      businessName: businessResult.data?.name || 'Coatly',
      quoteNumber: quote.quote_number,
      quoteTitle: quote.title,
      customerName: customer.company_name || customer.name,
      customerEmail: customer.email,
      approvedByName,
      approvedByEmail,
      approvedAt: formatDate(approvedAt),
      totalFormatted: formatAUD(quote.total_cents),
      signature: approvalSignature,
    });
  }

  return { data: { quoteId: quote.id }, error: null };
}

export async function rejectPublicQuoteResponse({
  supabase,
  quoteToken,
}: {
  supabase: QuoteDataClient;
  quoteToken: string;
}): Promise<PublicQuoteResponseResult> {
  const quoteResult = await supabase
    .from('quotes')
    .select(
      'id, status, valid_until, public_share_expires_at, public_share_revoked_at'
    )
    .eq('public_share_token', quoteToken)
    .single();
  const quote = quoteResult.data as {
    id: string;
    status: string;
    valid_until: string | null;
    public_share_expires_at?: string | null;
    public_share_revoked_at?: string | null;
  } | null;

  const publicShareAccessError = quote
    ? getPublicQuoteShareAccessError(quote)
    : null;

  if (
    quoteResult.error ||
    !quote ||
    publicShareAccessError ||
    resolveQuoteStatus({
      status: quote.status,
      valid_until: quote.valid_until,
    }) !== 'sent'
  ) {
    return {
      data: null,
      error:
        publicShareAccessError ??
        'This quote is no longer available for decline.',
    };
  }

  const { error: updateQuoteError } = await supabase
    .from('quotes')
    .update({
      status: 'rejected',
    })
    .eq('id', quote.id)
    .eq('public_share_token', quoteToken);

  if (updateQuoteError) {
    return { data: null, error: updateQuoteError.message };
  }

  return { data: { quoteId: quote.id }, error: null };
}
