import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { mapInvoiceDetail } from '@/lib/invoices';
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
    .select('*, customer:customers!invoices_customer_user_fk(*), line_items:invoice_line_items(*)')
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Fetch business profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('business_name, abn, phone')
    .eq('user_id', user.id)
    .maybeSingle();
  const profile = profileData as {
    business_name: string;
    abn: string | null;
    phone: string | null;
  } | null;

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
      due_date: string | null;
      paid_at: string | null;
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
