import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createServerClient } from '@/lib/supabase/server';
import { InvoiceTemplate } from '@/lib/pdf/invoice-template';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get('id');

  if (!invoiceId) {
    return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Fetch invoice with customer and line items
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, customer:customers(*), line_items:invoice_line_items(*)')
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
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
  const invoiceData = invoice as any;
  const pdfBuffer = await renderToBuffer(
    InvoiceTemplate({
      invoice: invoiceData,
      businessName: profile?.business_name ?? 'My Painting Business',
      abn: profile?.abn ?? null,
      phone: profile?.phone ?? null,
      email: user.email ?? null,
    })
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${invoiceData.invoice_number}.pdf"`,
    },
  });
}
