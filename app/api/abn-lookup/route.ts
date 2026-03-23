import { NextResponse } from 'next/server';
import {
  ABN_LOOKUP_URL,
  getAbnLookupGuidFromEnv,
  normalizeAbn,
  parseAbnLookupXml,
} from '@/lib/abn-lookup';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const guid = getAbnLookupGuidFromEnv(process.env);
  if (!guid) {
    return NextResponse.json(
      { error: 'ABN lookup is not configured on the server. Add ABR_GUID.' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const abn = normalizeAbn(searchParams.get('abn') ?? '');

  if (!/^\d{11}$/.test(abn)) {
    return NextResponse.json({ error: 'ABN must be 11 digits.' }, { status: 400 });
  }

  const lookupUrl = new URL(ABN_LOOKUP_URL);
  lookupUrl.searchParams.set('searchString', abn);
  lookupUrl.searchParams.set('includeHistoricalDetails', 'N');
  lookupUrl.searchParams.set('authenticationGuid', guid);

  try {
    const response = await fetch(lookupUrl, {
      headers: {
        Accept: 'application/xml, text/xml;q=0.9, */*;q=0.1',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'ABN lookup service is unavailable right now.' },
        { status: 502 }
      );
    }

    const xml = await response.text();
    const result = parseAbnLookupXml(xml);

    if (!result.success) {
      const status = /no records found/i.test(result.error) ? 404 : 502;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('ABN lookup request failed', error);
    return NextResponse.json(
      { error: 'ABN lookup request failed. Please try again.' },
      { status: 502 }
    );
  }
}
