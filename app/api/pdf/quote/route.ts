import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createServerClient } from '@/lib/supabase/server';
import { QuoteTemplate } from '@/lib/pdf/quote-template';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const quoteId = searchParams.get('id');

  if (!quoteId) {
    return NextResponse.json({ error: 'Quote ID required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Fetch quote with customer data
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*, customer:customers(*), rooms:quote_rooms(*, surfaces:quote_room_surfaces(*))')
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single();

  if (error || !quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  // Fetch business profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (supabase as any)
    .from('profiles')
    .select('business_name, abn, phone')
    .eq('id', user.id)
    .single();
  const profile = profileData as { business_name: string; abn: string | null; phone: string | null } | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quoteData = quote as any;
  const pdfBuffer = await renderToBuffer(
    QuoteTemplate({
      quote: quoteData,
      businessName: profile?.business_name ?? 'My Painting Business',
      abn: profile?.abn ?? null,
      phone: profile?.phone ?? null,
      email: user.email ?? null,
    })
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="quote-${quoteData.quote_number}.pdf"`,
    },
  });
}
