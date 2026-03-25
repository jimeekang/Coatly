import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createServerClient } from '@/lib/supabase/server';
import { createStorageObjectDataUrl } from '@/lib/supabase/storage';
import {
  buildQuoteCustomerAddress,
  mapQuoteDetail,
  type QuoteCoatingType,
  type QuoteSurfaceType,
} from '@/lib/quotes';
import { getBusinessDocumentBranding } from '@/lib/businesses';
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

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(
      'id, user_id, customer_id, quote_number, title, status, valid_until, tier, notes, internal_notes, labour_margin_percent, material_margin_percent, subtotal_cents, gst_cents, total_cents, created_at, updated_at, customer:customers!quotes_customer_user_fk(id, name, company_name, email, phone, address_line1, city, state, postcode)'
    )
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .single();

  if (error || !quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  const { data: rooms } = await supabase
    .from('quote_rooms')
    .select('id, quote_id, name, room_type, length_m, width_m, height_m, sort_order')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  const roomIds = rooms?.map((room) => room.id) ?? [];

  const { data: surfaces } = roomIds.length
    ? await supabase
        .from('quote_room_surfaces')
        .select(
          'id, room_id, surface_type, area_m2, coating_type, rate_per_m2_cents, material_cost_cents, labour_cost_cents, paint_litres_needed, notes'
        )
        .in('room_id', roomIds)
    : { data: [] };

  const { data: businessBranding } = await getBusinessDocumentBranding(
    supabase,
    user.id,
    user.email ?? null
  );
  const logoUrl = await createStorageObjectDataUrl(
    supabase,
    businessBranding?.logoPath ?? null
  );

  const quoteData = mapQuoteDetail({
    ...quote,
    customer: quote.customer
      ? {
          ...(Array.isArray(quote.customer) ? quote.customer[0] : quote.customer),
          address: buildQuoteCustomerAddress(
            Array.isArray(quote.customer) ? quote.customer[0] : quote.customer
          ),
        }
      : null,
    rooms:
      rooms?.map((room) => ({
        id: room.id,
        quote_id: room.quote_id,
        name: room.name,
        room_type: room.room_type,
        length_m: room.length_m,
        width_m: room.width_m,
        height_m: room.height_m,
        surfaces:
          surfaces
            ?.filter((surface) => surface.room_id === room.id)
            .map((surface) => ({
              id: surface.id,
              room_id: surface.room_id,
              surface_type: surface.surface_type as QuoteSurfaceType,
              area_m2: Number(surface.area_m2),
              coating_type: surface.coating_type as QuoteCoatingType | null,
              rate_per_m2_cents: surface.rate_per_m2_cents,
              material_cost_cents: surface.material_cost_cents,
              labour_cost_cents: surface.labour_cost_cents,
              paint_litres_needed:
                surface.paint_litres_needed == null
                  ? null
                  : Number(surface.paint_litres_needed),
              notes: surface.notes,
            })) ?? [],
      })) ?? [],
  });

  const pdfBuffer = await renderToBuffer(
    QuoteTemplate({
      quote: quoteData,
      businessName: businessBranding?.name || 'My Painting Business',
      abn: businessBranding?.abn ?? null,
      phone: businessBranding?.phone ?? null,
      email: businessBranding?.email ?? user.email ?? null,
      logoUrl,
    })
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="quote-${quoteData.quote_number}.pdf"`,
    },
  });
}
