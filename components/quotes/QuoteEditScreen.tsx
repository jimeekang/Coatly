'use client';

import { updateQuote } from '@/app/actions/quotes';
import {
  QuoteForm,
  type QuoteFormDefaultValues,
} from '@/components/quotes/QuoteForm';
import type { QuoteCustomerOption } from '@/lib/quotes';
import type { UserRateSettings } from '@/lib/rate-settings';
import type {
  MaterialItem,
  QuoteCreateInput,
} from '@/lib/supabase/validators';

type QuoteSubmitIntent = 'save' | 'send_email';

export function QuoteEditScreen({
  quoteId,
  quoteNumber,
  customers,
  rateSettings,
  libraryItems = [],
  defaultValues,
}: {
  quoteId: string;
  quoteNumber: string;
  customers: QuoteCustomerOption[];
  rateSettings?: UserRateSettings | null;
  libraryItems?: MaterialItem[];
  defaultValues: QuoteFormDefaultValues;
}) {
  async function handleSubmit(
    data: QuoteCreateInput,
    intent: QuoteSubmitIntent = 'save'
  ): Promise<{ error?: string } | void> {
    return updateQuote(quoteId, data, { submitIntent: intent });
  }

  return (
    <QuoteForm
      customers={customers}
      quoteNumberPreview={quoteNumber}
      rateSettings={rateSettings}
      libraryItems={libraryItems}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      submitLabel="Save Changes"
      showSendQuoteButton
    />
  );
}
