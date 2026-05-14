import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { mapInvoiceDetail } from '@/lib/invoices';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createStorageObjectDataUrl } from '@/lib/supabase/storage';
import { getBusinessDocumentBranding } from '@/lib/businesses';
import { InvoiceTemplate } from '@/lib/pdf/invoice-template';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get('id');
  const publicToken = searchParams.get('token')?.trim() ?? null;

  if (!invoiceId && !publicToken) {
    return NextResponse.json(
      { error: 'Invoice ID or token required' },
      { status: 400 }
    );
  }

  if (publicToken && !UUID_RE.test(publicToken)) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const supabase = publicToken ? createAdminClient() : await createServerClient();
  const user = publicToken ? null : (await supabase.auth.getUser()).data.user;

  if (!publicToken && !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Fetch invoice with customer and line items
  const invoiceQuery = supabase
    .from('invoices')
    .select('*, customer:customers!invoices_customer_user_fk(*), line_items:invoice_line_items(*)');
  const { data: invoice, error } = publicToken
    ? await invoiceQuery.eq('public_share_token', publicToken).single()
    : await invoiceQuery.eq('id', invoiceId ?? '').eq('user_id', user!.id).single();

  if (error || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Fetch business profile
  const { data: businessBranding } = await getBusinessDocumentBranding(
    supabase,
    invoice.user_id,
    user?.email ?? null
  );
  const logoUrl = await createStorageObjectDataUrl(
    supabase,
    businessBranding?.logoPath ?? null
  );

  const invoiceData = mapInvoiceDetail(
    invoice as {
      id: string;
      user_id: string;
      customer_id: string;
      quote_id: string | null;
      invoice_number: string;
      status: string;
      invoice_type: string;
      subtotal_cents: number;
      gst_cents: number;
      total_cents: number;
      amount_paid_cents: number;
      business_abn: string | null;
      payment_terms: string | null;
      bank_details: string | null;
      due_date: string | null;
      paid_date: string | null;
      paid_at: string | null;
      payment_method: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
      customer:
        | {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
            address_line1: string | null;
            city: string | null;
            state: string | null;
            postcode: string | null;
          }
        | Array<{
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
            address_line1: string | null;
            city: string | null;
            state: string | null;
            postcode: string | null;
          }>
        | null;
      line_items:
        | Array<{
            id: string;
            invoice_id: string;
            description: string;
            quantity: number;
            unit_price_cents: number;
            gst_cents: number;
            total_cents: number;
            sort_order: number;
            created_at: string;
            updated_at: string;
          }>
        | null;
    }
  );

  const pdfBuffer = await renderToBuffer(
    InvoiceTemplate({
      invoice: invoiceData,
      businessName: businessBranding?.name || 'My Painting Business',
      abn: invoiceData.business_abn ?? businessBranding?.abn ?? null,
      phone: businessBranding?.phone ?? null,
      email: businessBranding?.email ?? user?.email ?? null,
      paymentTerms: invoiceData.payment_terms,
      bankDetails: invoiceData.bank_details,
      logoUrl,
    })
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${invoiceData.invoice_number}.pdf"`,
    },
  });
}
