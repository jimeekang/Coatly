'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  buildQuoteCustomerAddress,
  calculateQuoteLineItemsSubtotal,
  calculateQuoteTotals,
  formatQuoteCustomerPropertyAddress,
  getPublicQuoteShareAccessError,
  isMissingQuoteCustomerSnapshotColumnError,
  parseQuoteCreateInput,
  resolveQuoteStatus,
  type QuoteCustomerOption,
  type QuoteCustomerPropertyOption,
  type QuoteDetail,
  type QuoteListItem,
  type PublicQuoteDetail,
} from '@/modules/quotes/domain/quotes';
import { getFirstBlockingQuotePricingScopeError } from '@/modules/quotes/domain/quote-pricing-scopes';
import { getBusinessDocumentBranding } from '@/modules/settings/application/business-branding';
import { getBusinessRateSettings } from '@/modules/settings/infrastructure/businesses';
import {
  getHydratedPublicQuoteDetailByToken,
  getHydratedQuoteDetailForUser,
  getLinkedInvoiceCountForQuote,
  getQuoteListItemsByCustomer,
  getQuoteListItemsForUser,
} from '@/modules/quotes/infrastructure/quote-repository';
import { DEFAULT_RATE_SETTINGS } from '@/modules/price-rates/domain/rate-settings';
import type { UserRateSettings } from '@/modules/price-rates/domain/rate-settings';
import {
  getActiveSubscriptionRequiredMessage,
  getMonthlyActiveQuoteUsageForUser,
  getSubscriptionSnapshotForUser,
} from '@/modules/billing/application/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentUser } from '@/lib/supabase/request-context';
import { createServerClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';
import {
  deleteQuotePricingRelationsForUpdate,
  getFirstQuoteRateBoundaryError,
  resolveQuotePricingPreviewForSave,
  saveQuotePricingRelations,
} from '@/modules/quotes/application/quote-pricing-save-service';
import { sendQuoteDocumentEmail } from '@/modules/quotes/application/document-email-service';
import { duplicateQuoteForUser } from '@/modules/quotes/application/quote-duplicate-service';
import {
  approvePublicQuoteResponse,
  rejectPublicQuoteResponse,
} from '@/modules/quotes/application/public-quote-response-service';
import type { QuoteCreateInput } from '@/modules/quotes/domain/quote-schema';

type CreateQuoteOptions = {
  submitIntent?: 'save' | 'send_email';
};

function parseBooleanFormValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value === 'true';
}

function parseTrimmedFormValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const QUOTE_INVOICE_LOCK_MESSAGE =
  'This quote can no longer be edited because an invoice already exists for it.';
const QUOTE_DELETE_LOCK_MESSAGE =
  'Quotes with linked invoices can no longer be deleted.';

function normalizeCustomerEmails(customer: {
  email?: string | null;
  emails?: unknown;
}) {
  const emails = [
    customer.email,
    ...(Array.isArray(customer.emails) ? customer.emails : []),
  ]
    .filter((email): email is string => typeof email === 'string')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(emails));
}

function normalizeCustomerPropertyOptions(customer: {
  properties?: unknown;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
}) {
  const rawProperties = Array.isArray(customer.properties)
    ? customer.properties
    : [];
  const properties = rawProperties
    .map((property, index): QuoteCustomerPropertyOption | null => {
      if (!property || typeof property !== 'object') return null;
      const record = property as Record<string, unknown>;
      const option = {
        label:
          typeof record.label === 'string' && record.label.trim()
            ? record.label.trim()
            : `Property ${index + 1}`,
        address_line1:
          typeof record.address_line1 === 'string'
            ? record.address_line1.trim()
            : '',
        address_line2:
          typeof record.address_line2 === 'string'
            ? record.address_line2.trim()
            : '',
        city: typeof record.city === 'string' ? record.city.trim() : '',
        state: typeof record.state === 'string' ? record.state.trim() : '',
        postcode:
          typeof record.postcode === 'string' ? record.postcode.trim() : '',
        notes: typeof record.notes === 'string' ? record.notes.trim() : '',
        address: null,
      };

      return {
        ...option,
        address: formatQuoteCustomerPropertyAddress(option),
      };
    })
    .filter((property): property is QuoteCustomerPropertyOption =>
      Boolean(property?.address)
    );

  const fallbackAddress = buildQuoteCustomerAddress(customer);
  if (properties.length === 0 && fallbackAddress) {
    properties.push({
      label: 'Primary property',
      address_line1: customer.address_line1 ?? '',
      address_line2: customer.address_line2 ?? '',
      city: customer.city ?? '',
      state: customer.state ?? '',
      postcode: customer.postcode ?? '',
      notes: '',
      address: fallbackAddress,
    });
  }

  return properties;
}

export async function getQuoteFormOptions(): Promise<{
  data: {
    customers: QuoteCustomerOption[];
    userRates: UserRateSettings;
    nextQuoteNumber: string | null;
  };
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
  ]);

  const [customersResult, ratesResult, nextQuoteNumberResult] =
    await Promise.all([
      supabase
        .from('customers')
        .select(
          'id, name, company_name, email, emails, phone, address_line1, address_line2, city, state, postcode, properties'
        )
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('name', { ascending: true }),
      getBusinessRateSettings(supabase, user.id),
      supabase.rpc('generate_quote_number', { user_uuid: user.id }),
    ]);

  return {
    data: {
      customers:
        customersResult.data?.map((customer) => ({
          id: customer.id,
          name: customer.name,
          company_name: customer.company_name,
          email: customer.email,
          emails: normalizeCustomerEmails(customer),
          phone: customer.phone,
          address: buildQuoteCustomerAddress(customer),
          properties: normalizeCustomerPropertyOptions(customer),
        })) ?? [],
      userRates: ratesResult.data ?? DEFAULT_RATE_SETTINGS,
      nextQuoteNumber: nextQuoteNumberResult.error
        ? null
        : (nextQuoteNumberResult.data ?? null),
    },
    error: customersResult.error?.message ?? null,
  };
}

export async function getQuotes(): Promise<{
  data: QuoteListItem[];
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
  ]);

  return getQuoteListItemsForUser(supabase, user.id);
}

export async function getQuotesByCustomer(
  customerId: string
): Promise<{ data: QuoteListItem[]; error: string | null }> {
  const [supabase, user] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
  ]);

  return getQuoteListItemsByCustomer(supabase, user.id, customerId);
}

export async function getQuote(id: string): Promise<{
  data: QuoteDetail | null;
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
  ]);

  return getHydratedQuoteDetailForUser(supabase, id, user.id);
}

export async function getPublicQuoteByToken(token: string): Promise<{
  data: {
    quote: PublicQuoteDetail;
    business: {
      name: string;
      abn: string | null;
      phone: string | null;
      email: string | null;
    } | null;
  } | null;
  error: string | null;
}> {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return { data: null, error: 'Public quote link is invalid.' };
  }

  // Reject non-UUID tokens before hitting the DB — blocks brute-force attempts cheaply
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(trimmedToken)) {
    return { data: null, error: 'Quote not found.' };
  }

  const supabase = createAdminClient();
  const quoteResult = await getHydratedPublicQuoteDetailByToken(
    supabase,
    trimmedToken
  );

  if (quoteResult.error || !quoteResult.data) {
    return { data: null, error: quoteResult.error ?? 'Quote not found.' };
  }

  const businessResult = await getBusinessDocumentBranding(
    supabase,
    quoteResult.data.userId,
    null
  );

  return {
    data: {
      quote: quoteResult.data.quote,
      business: businessResult.data
        ? {
            name: businessResult.data.name,
            abn: businessResult.data.abn,
            phone: businessResult.data.phone,
            email: businessResult.data.email,
          }
        : null,
    },
    error: null,
  };
}

export async function createQuote(
  input: QuoteCreateInput,
  options: CreateQuoteOptions = {}
): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const parsed = parseQuoteCreateInput(input);
  if (!parsed.success) {
    return { error: parsed.error };
  }

  const pricingScopeError = getFirstBlockingQuotePricingScopeError(parsed.data);
  if (pricingScopeError) {
    return { error: pricingScopeError };
  }

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return { error: getActiveSubscriptionRequiredMessage('quote creation') };
  }

  const quoteUsage = await getMonthlyActiveQuoteUsageForUser(
    supabase,
    user.id,
    subscription
  );

  if (quoteUsage.reached && quoteUsage.limit !== null) {
    return {
      error: `Starter includes up to ${quoteUsage.limit} active quotes per month. Upgrade to Pro to create more quotes this month.`,
    };
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select(
      'id, email, emails, address_line1, address_line2, city, state, postcode, properties'
    )
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

  const shouldSendEmail = options.submitIntent === 'send_email';
  const customerEmails = normalizeCustomerEmails(customer);
  const customerProperties = normalizeCustomerPropertyOptions(customer);
  const selectedCustomerEmail =
    parsed.data.customer_email ?? customerEmails[0] ?? null;
  const selectedCustomerAddress =
    parsed.data.customer_address ??
    customerProperties[0]?.address ??
    buildQuoteCustomerAddress(customer);

  if (shouldSendEmail && !selectedCustomerEmail?.trim()) {
    return { error: 'Add a customer email before sending this quote.' };
  }

  if (
    parsed.data.customer_email &&
    !customerEmails.includes(parsed.data.customer_email)
  ) {
    return { error: 'Select a saved email for this customer before sending.' };
  }

  if (
    parsed.data.customer_address &&
    !customerProperties.some(
      (property) => property.address === parsed.data.customer_address
    )
  ) {
    return {
      error:
        'Select a saved property for this customer before saving the quote.',
    };
  }

  const { data: userRates } = await getBusinessRateSettings(supabase, user.id);
  const effectiveRates = userRates ?? DEFAULT_RATE_SETTINGS;
  const rateBoundaryError = getFirstQuoteRateBoundaryError(
    parsed.data,
    effectiveRates
  );
  if (rateBoundaryError) {
    return { error: rateBoundaryError };
  }

  const pricing = resolveQuotePricingPreviewForSave(
    parsed.data,
    effectiveRates
  );
  const {
    adjustmentCents,
    depositPercent,
    discountCents,
    exteriorEstimateResult,
    interiorEstimate,
    interiorEstimateContext,
    preview,
    pricingMethod,
    resolvedPricingInputs,
  } = pricing;

  const { data: quoteNumber, error: quoteNumberError } = await supabase.rpc(
    'generate_quote_number',
    { user_uuid: user.id }
  );

  if (quoteNumberError || !quoteNumber) {
    return {
      error:
        quoteNumberError?.message ?? 'Quote number could not be generated.',
    };
  }

  const quoteInsertPayload = {
    user_id: user.id,
    customer_id: parsed.data.customer_id,
    job_type: parsed.data.job_type,
    customer_email: selectedCustomerEmail,
    customer_address: selectedCustomerAddress,
    quote_number: quoteNumber,
    title: parsed.data.title,
    status: parsed.data.status,
    valid_until: parsed.data.valid_until,
    working_days: parsed.data.working_days,
    tier: parsed.data.complexity,
    notes: parsed.data.notes,
    internal_notes: parsed.data.internal_notes,
    labour_margin_percent: parsed.data.labour_margin_percent,
    material_margin_percent: parsed.data.material_margin_percent,
    subtotal_cents: preview.subtotal_cents,
    gst_cents: preview.gst_cents,
    total_cents: preview.total_cents,
    manual_adjustment_cents: adjustmentCents,
    discount_cents: discountCents,
    deposit_percent: depositPercent,
    estimate_category: interiorEstimate
      ? 'interior'
      : exteriorEstimateResult
        ? 'exterior'
        : 'manual',
    property_type: parsed.data.interior_estimate?.property_type ?? null,
    estimate_mode: parsed.data.interior_estimate?.estimate_mode ?? null,
    estimate_context:
      interiorEstimateContext ?? parsed.data.exterior_estimate ?? {},
    pricing_snapshot:
      interiorEstimate?.snapshot ?? exteriorEstimateResult?.snapshot ?? {},
    pricing_method: pricingMethod,
    pricing_method_inputs: resolvedPricingInputs as Json,
  };

  let { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert(quoteInsertPayload)
    .select('id')
    .single();

  if (
    quoteError &&
    isMissingQuoteCustomerSnapshotColumnError(quoteError.message)
  ) {
    const {
      customer_email: _customerEmail,
      customer_address: _customerAddress,
      ...legacyQuoteInsertPayload
    } = quoteInsertPayload;
    void _customerEmail;
    void _customerAddress;

    const legacyResult = await supabase
      .from('quotes')
      .insert(legacyQuoteInsertPayload)
      .select('id')
      .single();

    quote = legacyResult.data;
    quoteError = legacyResult.error;
  }

  if (quoteError || !quote) {
    return { error: quoteError?.message ?? 'Quote could not be created.' };
  }

  const pricingSaveResult = await saveQuotePricingRelations({
    supabase,
    quoteId: quote.id,
    userId: user.id,
    data: parsed.data,
    pricing,
    mode: 'create',
    cleanupOnError: async () => {
      await supabase
        .from('quotes')
        .delete()
        .eq('id', quote.id)
        .eq('user_id', user.id);
    },
  });

  if (pricingSaveResult.error) {
    return { error: pricingSaveResult.error };
  }

  if (shouldSendEmail) {
    const { error: emailError } = await sendQuoteDocumentEmail({
      supabase,
      userId: user.id,
      userEmail: user.email ?? null,
      quoteId: quote.id,
      to: selectedCustomerEmail ?? '',
    });

    if (emailError) {
      return { error: emailError };
    }

    const { error: sentStatusError } = await supabase
      .from('quotes')
      .update({ status: 'sent' })
      .eq('id', quote.id)
      .eq('user_id', user.id);

    if (sentStatusError) {
      return { error: sentStatusError.message };
    }
  }

  revalidatePath('/quotes');
  redirect(
    shouldSendEmail ? `/quotes/${quote.id}?emailSent=1` : `/quotes/${quote.id}`
  );
}

export async function setQuoteOptionalLineItemSelection(
  formData: FormData
): Promise<void> {
  const quoteId = formData.get('quoteId');
  const lineItemId = formData.get('lineItemId');

  if (typeof quoteId !== 'string' || typeof lineItemId !== 'string') {
    return;
  }

  const isSelected = parseBooleanFormValue(formData.get('isSelected'));
  const supabase = await createServerClient();
  const user = await requireCurrentUser();

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, subtotal_cents, discount_cents, manual_adjustment_cents')
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single();

  if (quoteError || !quote) {
    return;
  }

  const linkedInvoicesResult = await getLinkedInvoiceCountForQuote(
    supabase,
    quoteId,
    user.id
  );
  if (linkedInvoicesResult.error || linkedInvoicesResult.count > 0) {
    return;
  }

  const { data: lineItems, error: lineItemsError } = await supabase
    .from('quote_line_items')
    .select('id, total_cents, is_optional, is_selected')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  if (lineItemsError) {
    return;
  }

  const target = lineItems?.find((item) => item.id === lineItemId) ?? null;

  if (!target || !target.is_optional) {
    return;
  }

  const { error: updateLineItemError } = await supabase
    .from('quote_line_items')
    .update({ is_selected: isSelected })
    .eq('id', lineItemId)
    .eq('quote_id', quoteId);

  if (updateLineItemError) {
    return;
  }

  const currentIncludedLineItemsSubtotal = calculateQuoteLineItemsSubtotal(
    (lineItems ?? []).map((item) => ({
      quantity: 1,
      unit_price_cents: item.total_cents,
      total_cents: item.total_cents,
      is_optional: item.is_optional,
      is_selected: item.is_selected,
    }))
  );

  const baseSubtotalWithoutLineItems = Math.max(
    0,
    quote.subtotal_cents - currentIncludedLineItemsSubtotal
  );

  const nextLineItems = (lineItems ?? []).map((item) => ({
    quantity: 1,
    unit_price_cents: item.total_cents,
    total_cents: item.total_cents,
    is_optional: item.is_optional,
    is_selected: item.id === lineItemId ? isSelected : item.is_selected,
  }));
  const nextTotals = calculateQuoteTotals({
    base_subtotal_cents: baseSubtotalWithoutLineItems,
    discount_cents: quote.discount_cents ?? 0,
    manual_adjustment_cents: quote.manual_adjustment_cents ?? 0,
    line_items: nextLineItems,
  });

  const { error: updateQuoteError } = await supabase
    .from('quotes')
    .update({
      subtotal_cents: nextTotals.subtotal_cents,
      gst_cents: nextTotals.gst_cents,
      total_cents: nextTotals.total_cents,
    })
    .eq('id', quoteId)
    .eq('user_id', user.id);

  if (updateQuoteError) {
    return;
  }

  revalidatePath('/quotes');
  revalidatePath(`/quotes/${quoteId}`);
}

export async function setPublicQuoteOptionalLineItemSelection(
  formData: FormData
): Promise<{ error: string | null; selectedIds: string[] }> {
  const quoteToken = formData.get('quoteToken');
  const lineItemId = formData.get('lineItemId');

  if (typeof quoteToken !== 'string' || typeof lineItemId !== 'string') {
    return { error: 'Invalid quote add-on selection.', selectedIds: [] };
  }

  const isSelected = parseBooleanFormValue(formData.get('isSelected'));
  const supabase = createAdminClient();

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select(
      'id, status, valid_until, public_share_expires_at, public_share_revoked_at, subtotal_cents, discount_cents, manual_adjustment_cents'
    )
    .eq('public_share_token', quoteToken)
    .single();

  if (
    quoteError ||
    !quote ||
    getPublicQuoteShareAccessError(quote) ||
    resolveQuoteStatus({
      status: quote.status,
      valid_until: quote.valid_until,
    }) !== 'sent'
  ) {
    return {
      error: 'This quote is no longer available for add-on changes.',
      selectedIds: [],
    };
  }

  const linkedInvoicesResult = await getLinkedInvoiceCountForQuote(
    supabase,
    quote.id
  );
  if (linkedInvoicesResult.error || linkedInvoicesResult.count > 0) {
    return {
      error: 'This quote already has a linked invoice.',
      selectedIds: [],
    };
  }

  const { data: lineItems, error: lineItemsError } = await supabase
    .from('quote_line_items')
    .select('id, total_cents, is_optional, is_selected')
    .eq('quote_id', quote.id)
    .order('sort_order', { ascending: true });

  if (lineItemsError) {
    return { error: lineItemsError.message, selectedIds: [] };
  }

  const target = lineItems?.find((item) => item.id === lineItemId) ?? null;

  if (!target || !target.is_optional) {
    return { error: 'Add-on item was not found.', selectedIds: [] };
  }

  const { error: updateLineItemError } = await supabase
    .from('quote_line_items')
    .update({ is_selected: isSelected })
    .eq('id', lineItemId)
    .eq('quote_id', quote.id);

  if (updateLineItemError) {
    return { error: updateLineItemError.message, selectedIds: [] };
  }

  const currentIncludedLineItemsSubtotal = calculateQuoteLineItemsSubtotal(
    (lineItems ?? []).map((item) => ({
      quantity: 1,
      unit_price_cents: item.total_cents,
      total_cents: item.total_cents,
      is_optional: item.is_optional,
      is_selected: item.is_selected,
    }))
  );

  const baseSubtotalWithoutLineItems = Math.max(
    0,
    quote.subtotal_cents - currentIncludedLineItemsSubtotal
  );

  const nextLineItems = (lineItems ?? []).map((item) => ({
    quantity: 1,
    unit_price_cents: item.total_cents,
    total_cents: item.total_cents,
    is_optional: item.is_optional,
    is_selected: item.id === lineItemId ? isSelected : item.is_selected,
  }));
  const nextTotals = calculateQuoteTotals({
    base_subtotal_cents: baseSubtotalWithoutLineItems,
    discount_cents: quote.discount_cents ?? 0,
    manual_adjustment_cents: quote.manual_adjustment_cents ?? 0,
    line_items: nextLineItems,
  });

  const { error: updateQuoteError } = await supabase
    .from('quotes')
    .update({
      subtotal_cents: nextTotals.subtotal_cents,
      gst_cents: nextTotals.gst_cents,
      total_cents: nextTotals.total_cents,
    })
    .eq('id', quote.id)
    .eq('public_share_token', quoteToken);

  if (updateQuoteError) {
    await supabase
      .from('quote_line_items')
      .update({ is_selected: target.is_selected })
      .eq('id', lineItemId)
      .eq('quote_id', quote.id);
    return { error: updateQuoteError.message, selectedIds: [] };
  }

  revalidatePath(`/q/${quoteToken}`);
  revalidatePath('/quotes');
  revalidatePath(`/quotes/${quote.id}`);
  return {
    error: null,
    selectedIds: (lineItems ?? [])
      .filter((item) =>
        item.id === lineItemId ? isSelected : item.is_selected
      )
      .map((item) => item.id),
  };
}

export async function approvePublicQuote(
  formData: FormData
): Promise<{ error: string | null }> {
  const quoteToken = parseTrimmedFormValue(formData.get('quoteToken'));
  const approvedByName = parseTrimmedFormValue(formData.get('approvedByName'));
  const approvedByEmail = parseTrimmedFormValue(
    formData.get('approvedByEmail')
  ).toLowerCase();
  const approvalSignature = parseTrimmedFormValue(
    formData.get('approvalSignature')
  );

  if (
    !quoteToken ||
    !approvedByName ||
    !approvedByEmail ||
    !approvalSignature
  ) {
    return { error: 'Name, email, and signature are required.' };
  }

  if (!isValidEmail(approvedByEmail)) {
    return { error: 'Enter a valid email address.' };
  }

  const supabase = createAdminClient();
  const result = await approvePublicQuoteResponse({
    supabase,
    quoteToken,
    approvedByName,
    approvedByEmail,
    approvalSignature,
  });
  if (result.error || !result.data) {
    return { error: result.error ?? 'This quote could not be approved.' };
  }

  revalidatePath(`/q/${quoteToken}`);
  revalidatePath('/quotes');
  revalidatePath(`/quotes/${result.data.quoteId}`);
  return { error: null };
}

export async function rejectPublicQuote(
  formData: FormData
): Promise<{ error: string | null }> {
  const quoteToken = parseTrimmedFormValue(formData.get('quoteToken'));
  const rejectedByName = parseTrimmedFormValue(formData.get('rejectedByName'));
  const rejectedByEmail = parseTrimmedFormValue(
    formData.get('rejectedByEmail')
  ).toLowerCase();

  if (!quoteToken || !rejectedByName || !rejectedByEmail) {
    return { error: 'Name and email are required to decline this quote.' };
  }

  if (!isValidEmail(rejectedByEmail)) {
    return { error: 'Enter a valid email address.' };
  }

  const supabase = createAdminClient();
  const result = await rejectPublicQuoteResponse({
    supabase,
    quoteToken,
  });
  if (result.error || !result.data) {
    return { error: result.error ?? 'This quote could not be declined.' };
  }

  revalidatePath(`/q/${quoteToken}`);
  revalidatePath('/quotes');
  revalidatePath(`/quotes/${result.data.quoteId}`);
  return { error: null };
}

export async function duplicateQuote(
  quoteId: string
): Promise<{ error: string } | void> {
  const [supabase, user] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
  ]);

  const result = await duplicateQuoteForUser(supabase, user.id, quoteId);
  if (result.error || !result.data) {
    return { error: result.error ?? 'Quote could not be duplicated.' };
  }

  revalidatePath('/quotes');
  redirect(`/quotes/${result.data.quoteId}/edit`);
}

export async function updateQuote(
  quoteId: string,
  input: QuoteCreateInput,
  options: CreateQuoteOptions = {}
): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const parsed = parseQuoteCreateInput(input);
  if (!parsed.success) {
    return { error: parsed.error };
  }

  const pricingScopeError = getFirstBlockingQuotePricingScopeError(parsed.data);
  if (pricingScopeError) {
    return { error: pricingScopeError };
  }

  // Verify ownership
  const { data: existing, error: existingError } = await supabase
    .from('quotes')
    .select('id, quote_number, customer_id')
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single();

  if (existingError || !existing) {
    return { error: 'Quote not found.' };
  }

  const linkedInvoicesResult = await getLinkedInvoiceCountForQuote(
    supabase,
    quoteId,
    user.id
  );
  if (linkedInvoicesResult.error) {
    return { error: linkedInvoicesResult.error };
  }

  if (linkedInvoicesResult.count > 0) {
    return { error: QUOTE_INVOICE_LOCK_MESSAGE };
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select(
      'id, email, emails, address_line1, address_line2, city, state, postcode, properties'
    )
    .eq('id', parsed.data.customer_id)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .maybeSingle();

  if (customerError) return { error: customerError.message };
  if (!customer) return { error: 'Selected customer was not found.' };

  const shouldSendEmail = options.submitIntent === 'send_email';
  const customerEmails = normalizeCustomerEmails(customer);
  const customerProperties = normalizeCustomerPropertyOptions(customer);
  const selectedCustomerEmail =
    parsed.data.customer_email ?? customerEmails[0] ?? null;
  const selectedCustomerAddress =
    parsed.data.customer_address ??
    customerProperties[0]?.address ??
    buildQuoteCustomerAddress(customer);

  if (shouldSendEmail && !selectedCustomerEmail?.trim()) {
    return { error: 'Add a customer email before sending this quote.' };
  }

  const { data: userRates } = await getBusinessRateSettings(supabase, user.id);
  const effectiveRates = userRates ?? DEFAULT_RATE_SETTINGS;
  const rateBoundaryError = getFirstQuoteRateBoundaryError(
    parsed.data,
    effectiveRates
  );
  if (rateBoundaryError) {
    return { error: rateBoundaryError };
  }

  const pricing = resolveQuotePricingPreviewForSave(
    parsed.data,
    effectiveRates
  );
  const {
    adjustmentCents,
    depositPercent,
    discountCents,
    exteriorEstimateResult,
    interiorEstimate,
    interiorEstimateContext,
    preview,
    pricingMethod,
    resolvedPricingInputs,
  } = pricing;

  // Resolve quote number — allow custom override if different from existing
  let resolvedQuoteNumber = existing.quote_number;
  if (
    parsed.data.quote_number &&
    parsed.data.quote_number !== existing.quote_number
  ) {
    // Check uniqueness: no other quote owned by this user should have the same number
    const { data: conflict } = await supabase
      .from('quotes')
      .select('id')
      .eq('user_id', user.id)
      .eq('quote_number', parsed.data.quote_number)
      .neq('id', quoteId)
      .maybeSingle();
    if (conflict) {
      return {
        error: `Quote number "${parsed.data.quote_number}" is already in use.`,
      };
    }
    resolvedQuoteNumber = parsed.data.quote_number;
  }

  // Delete old relations only after validations that can fail without touching quote details.
  const deleteRelationsResult = await deleteQuotePricingRelationsForUpdate(
    supabase,
    quoteId
  );
  if (deleteRelationsResult.error) {
    return { error: deleteRelationsResult.error };
  }

  // Update the quote record
  const quoteUpdatePayload = {
    customer_id: parsed.data.customer_id,
    job_type: parsed.data.job_type,
    customer_email: selectedCustomerEmail,
    customer_address: selectedCustomerAddress,
    quote_number: resolvedQuoteNumber,
    title: parsed.data.title,
    status: parsed.data.status,
    valid_until: parsed.data.valid_until,
    working_days: parsed.data.working_days,
    tier: parsed.data.complexity,
    notes: parsed.data.notes,
    internal_notes: parsed.data.internal_notes,
    labour_margin_percent: parsed.data.labour_margin_percent,
    material_margin_percent: parsed.data.material_margin_percent,
    subtotal_cents: preview.subtotal_cents,
    gst_cents: preview.gst_cents,
    total_cents: preview.total_cents,
    manual_adjustment_cents: adjustmentCents,
    discount_cents: discountCents,
    deposit_percent: depositPercent,
    estimate_category: interiorEstimate
      ? 'interior'
      : exteriorEstimateResult
        ? 'exterior'
        : 'manual',
    property_type: parsed.data.interior_estimate?.property_type ?? null,
    estimate_mode: parsed.data.interior_estimate?.estimate_mode ?? null,
    estimate_context:
      interiorEstimateContext ?? parsed.data.exterior_estimate ?? {},
    pricing_snapshot:
      interiorEstimate?.snapshot ?? exteriorEstimateResult?.snapshot ?? {},
    pricing_method: pricingMethod,
    pricing_method_inputs: resolvedPricingInputs as Json,
  };

  let { error: updateError } = await supabase
    .from('quotes')
    .update(quoteUpdatePayload)
    .eq('id', quoteId)
    .eq('user_id', user.id);

  if (
    updateError &&
    isMissingQuoteCustomerSnapshotColumnError(updateError.message)
  ) {
    const {
      customer_email: _customerEmail,
      customer_address: _customerAddress,
      ...legacyQuoteUpdatePayload
    } = quoteUpdatePayload;
    void _customerEmail;
    void _customerAddress;

    const legacyUpdateResult = await supabase
      .from('quotes')
      .update(legacyQuoteUpdatePayload)
      .eq('id', quoteId)
      .eq('user_id', user.id);

    updateError = legacyUpdateResult.error;
  }

  if (updateError) {
    return { error: updateError.message };
  }

  const pricingSaveResult = await saveQuotePricingRelations({
    supabase,
    quoteId,
    userId: user.id,
    data: parsed.data,
    pricing,
    mode: 'update',
  });

  if (pricingSaveResult.error) {
    return { error: pricingSaveResult.error };
  }

  if (shouldSendEmail) {
    const { error: emailError } = await sendQuoteDocumentEmail({
      supabase,
      userId: user.id,
      userEmail: user.email ?? null,
      quoteId,
      to: selectedCustomerEmail ?? '',
    });

    if (emailError) {
      return { error: emailError };
    }

    const { error: sentStatusError } = await supabase
      .from('quotes')
      .update({ status: 'sent' })
      .eq('id', quoteId)
      .eq('user_id', user.id);

    if (sentStatusError) {
      return { error: sentStatusError.message };
    }
  }

  revalidatePath('/quotes');
  revalidatePath(`/quotes/${quoteId}`);
  redirect(
    shouldSendEmail ? `/quotes/${quoteId}?emailSent=1` : `/quotes/${quoteId}`
  );
}

export async function approveQuote(
  quoteId: string
): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: quote, error: fetchError } = await supabase
    .from('quotes')
    .select('id, user_id, status, internal_notes')
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !quote) return { error: 'Quote not found.' };

  if (!['draft', 'sent'].includes(quote.status)) {
    return { error: 'Only draft or sent quotes can be approved.' };
  }

  const approvedAt = new Date().toISOString();
  const approvalLog = `Manually approved by owner on ${approvedAt}.`;
  const nextInternalNotes = quote.internal_notes?.trim()
    ? `${quote.internal_notes.trim()}\n\n${approvalLog}`
    : approvalLog;

  const { error: updateError } = await supabase
    .from('quotes')
    .update({
      status: 'approved',
      approved_at: approvedAt,
      internal_notes: nextInternalNotes,
    })
    .eq('id', quoteId)
    .eq('user_id', user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath('/quotes');
  revalidatePath(`/quotes/${quoteId}`);
}

export async function sendQuoteToClient(
  quoteId: string
): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: quote, error: fetchError } = await supabase
    .from('quotes')
    .select('id, status, customer_id')
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !quote) return { error: 'Quote not found.' };

  if (!['draft', 'sent'].includes(quote.status)) {
    return { error: 'Only draft or sent quotes can be sent to the client.' };
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('email, emails')
    .eq('id', quote.customer_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (customerError) {
    return { error: customerError.message };
  }

  const recipientEmail = customer
    ? (normalizeCustomerEmails(customer)[0] ?? '')
    : '';

  if (!recipientEmail) {
    return { error: 'Add a customer email before sending this quote.' };
  }

  const { error: emailError } = await sendQuoteDocumentEmail({
    supabase,
    userId: user.id,
    userEmail: user.email ?? null,
    quoteId: quote.id,
    to: recipientEmail,
  });

  if (emailError) {
    return { error: emailError };
  }

  const { error: sentStatusError } = await supabase
    .from('quotes')
    .update({ status: 'sent' })
    .eq('id', quoteId)
    .eq('user_id', user.id);

  if (sentStatusError) {
    return { error: sentStatusError.message };
  }

  revalidatePath('/quotes');
  revalidatePath(`/quotes/${quoteId}`);
}

export async function deleteQuote(
  quoteId: string
): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Verify ownership
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single();

  if (quoteError || !quote) {
    return { error: 'Quote not found.' };
  }

  const linkedInvoicesResult = await getLinkedInvoiceCountForQuote(
    supabase,
    quoteId,
    user.id
  );
  if (linkedInvoicesResult.error) {
    return { error: linkedInvoicesResult.error };
  }

  if (linkedInvoicesResult.count > 0) {
    return { error: QUOTE_DELETE_LOCK_MESSAGE };
  }

  // Delete relations first
  const { data: rooms } = await supabase
    .from('quote_rooms')
    .select('id')
    .eq('quote_id', quoteId);

  const roomIds = rooms?.map((r) => r.id) ?? [];
  if (roomIds.length > 0) {
    await supabase.from('quote_room_surfaces').delete().in('room_id', roomIds);
    await supabase.from('quote_rooms').delete().eq('quote_id', quoteId);
  }
  await supabase.from('quote_estimate_items').delete().eq('quote_id', quoteId);
  await supabase.from('quote_line_items').delete().eq('quote_id', quoteId);

  const { error: deleteError } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId)
    .eq('user_id', user.id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath('/quotes');
  redirect('/quotes');
}
