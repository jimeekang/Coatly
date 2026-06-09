import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { createStorageObjectDataUrl } from '@/lib/supabase/storage';
import type { BusinessDocumentBranding } from '@/modules/settings/domain/businesses';
import { getBusinessDocumentBranding } from '@/modules/settings/infrastructure/businesses';
import type { QuoteDetail } from '@/modules/quotes/domain/quotes';
import {
  getHydratedQuoteDetailByPublicTokenForPdf,
  getHydratedQuoteDetailForUser,
} from '@/modules/quotes/infrastructure/quote-repository';

export type QuotePdfDocumentData = {
  quote: QuoteDetail;
  businessBranding: BusinessDocumentBranding | null;
  logoUrl: string | null;
  fallbackEmail: string | null;
};

type QuotePdfDocumentResult =
  | {
      data: QuotePdfDocumentData;
      error: null;
      status: 200;
    }
  | {
      data: null;
      error: string;
      status: 401 | 404;
    };

export async function loadQuotePdfDocumentData({
  quoteId,
  publicToken,
}: {
  quoteId: string | null;
  publicToken: string | null;
}): Promise<QuotePdfDocumentResult> {
  const supabase = publicToken
    ? createAdminClient()
    : await createServerClient();
  const user = publicToken ? null : (await supabase.auth.getUser()).data.user;

  if (!publicToken && !user) {
    return { data: null, error: 'Unauthorised', status: 401 };
  }

  const quoteResult = publicToken
    ? await getHydratedQuoteDetailByPublicTokenForPdf(supabase, publicToken)
    : await getHydratedQuoteDetailForUser(supabase, quoteId ?? '', user!.id);

  if (quoteResult.error || !quoteResult.data) {
    return { data: null, error: 'Quote not found', status: 404 };
  }

  const businessBrandingResult = await getBusinessDocumentBranding(
    supabase,
    quoteResult.data.user_id,
    user?.email ?? null
  );
  const businessBranding = businessBrandingResult.data;
  const logoUrl = await createStorageObjectDataUrl(
    supabase,
    businessBranding?.logoPath ?? null
  );

  return {
    data: {
      quote: quoteResult.data,
      businessBranding,
      logoUrl,
      fallbackEmail: user?.email ?? null,
    },
    error: null,
    status: 200,
  };
}
