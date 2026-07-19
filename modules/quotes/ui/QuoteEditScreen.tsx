'use client';

import { updateQuote } from '@/modules/quotes/application/actions';
import {
  QuoteForm,
  type QuoteFormDefaultValues,
} from '@/modules/quotes/ui/QuoteForm';
import type { QuoteCustomerOption } from '@/modules/quotes/domain/quotes';
import type { UserRateSettings } from '@/modules/price-rates/domain/rate-settings';
import type { MaterialItem } from '@/modules/materials/domain/types';
import type { QuoteCreateInput } from '@/modules/quotes/domain/quote-schema';

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
      replaceQuoteStructureOnSubmit
    />
  );
}
