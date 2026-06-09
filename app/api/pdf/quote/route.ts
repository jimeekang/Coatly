import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { loadQuotePdfDocumentData } from '@/modules/quotes/application/quote-pdf-data-service';
import { QuoteTemplate } from '@/lib/pdf/quote-template';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSafePdfFilename(prefix: string, value: string) {
  const safeValue = value
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefix}-${safeValue || 'document'}.pdf`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const quoteId = searchParams.get('id');
  const publicToken = searchParams.get('token')?.trim() ?? null;

  if (!quoteId && !publicToken) {
    return NextResponse.json(
      { error: 'Quote ID or token required' },
      { status: 400 }
    );
  }

  if (publicToken && !UUID_RE.test(publicToken)) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  const documentResult = await loadQuotePdfDocumentData({
    quoteId,
    publicToken,
  });

  if (documentResult.error || !documentResult.data) {
    return NextResponse.json(
      { error: documentResult.error },
      { status: documentResult.status }
    );
  }

  const { businessBranding, fallbackEmail, logoUrl, quote } =
    documentResult.data;
  const pdfBuffer = await renderToBuffer(
    QuoteTemplate({
      quote,
      businessName: businessBranding?.name || 'My Painting Business',
      abn: businessBranding?.abn ?? null,
      phone: businessBranding?.phone ?? null,
      email: businessBranding?.email ?? fallbackEmail,
      businessAddress: businessBranding?.address ?? null,
      logoUrl,
    })
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${getSafePdfFilename('quote', quote.quote_number)}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
