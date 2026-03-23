'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { saveBusinessProfileForUser } from '@/lib/businesses';
import { isMissingOnboardingColumnError } from '@/lib/profile/onboarding';

export async function completeOnboarding(data: {
  businessName: string;
  abn: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  postcode: string;
  createExampleData: boolean;
}): Promise<{ error: string } | void> {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 서버 사이드 필수 값 검증
  const required: Array<[keyof typeof data, string]> = [
    ['businessName', 'Business name'],
    ['abn', 'ABN'],
    ['phone', 'Phone'],
    ['addressLine1', 'Street address'],
    ['city', 'Suburb'],
    ['state', 'State'],
    ['postcode', 'Postcode'],
  ];
  for (const [key, label] of required) {
    const value = data[key];
    if (typeof value !== 'string' || !value.trim()) {
      return { error: `${label} is required` };
    }
  }

  // ABN 형식 검증 (11자리 숫자)
  const abn = data.abn.replace(/\s/g, '');
  if (!/^\d{11}$/.test(abn)) return { error: 'ABN must be 11 digits' };

  // 우편번호 형식 검증 (4자리)
  if (!/^\d{4}$/.test(data.postcode.trim())) {
    return { error: 'Postcode must be 4 digits' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      business_name: data.businessName.trim(),
      abn,
      phone: data.phone.trim(),
      address_line1: data.addressLine1.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      postcode: data.postcode.trim(),
      onboarding_completed: true,
    })
    .eq('user_id', user.id);

  if (error && isMissingOnboardingColumnError(error)) {
    const { error: fallbackError } = await supabase
      .from('profiles')
      .update({
        business_name: data.businessName.trim(),
        abn,
        phone: data.phone.trim(),
        address_line1: data.addressLine1.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        postcode: data.postcode.trim(),
      })
      .eq('user_id', user.id);

    if (fallbackError) return { error: fallbackError.message };
  } else if (error) {
    return { error: error.message };
  }

  const { error: businessError } = await saveBusinessProfileForUser({
    supabase,
    user,
    input: {
      name: data.businessName.trim(),
      abn,
      addressLine1: data.addressLine1.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      postcode: data.postcode.trim(),
      phone: data.phone.trim(),
      email: user.email ?? '',
      logo_url: undefined,
    },
  });

  if (businessError) {
    return { error: businessError };
  }

  if (data.createExampleData) {
    const exampleDataError = await createExampleWorkspace({
      supabase,
      userId: user.id,
      businessName: data.businessName.trim(),
    });

    if (exampleDataError) {
      return { error: exampleDataError };
    }
  }

  redirect('/dashboard');
}

async function createExampleWorkspace({
  supabase,
  userId,
  businessName,
}: {
  supabase: Awaited<ReturnType<typeof createServerClient>>;
  userId: string;
  businessName: string;
}): Promise<string | null> {
  const [{ count: customerCount }, { count: quoteCount }, { count: invoiceCount }] =
    await Promise.all([
      supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);

  if ((customerCount ?? 0) > 0 || (quoteCount ?? 0) > 0 || (invoiceCount ?? 0) > 0) {
    return null;
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      user_id: userId,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      phone: '0412 555 012',
      company_name: 'Harbor Cafe',
      address_line1: '128 Beach Street',
      city: 'Manly',
      state: 'NSW',
      postcode: '2095',
      notes: 'Prefers work completed before 9am trade hours.',
    })
    .select('id')
    .single();

  if (customerError || !customer) {
    return customerError?.message ?? 'Failed to create example customer.';
  }

  const { data: quoteNumber, error: quoteNumberError } = await supabase.rpc(
    'generate_quote_number',
    { user_uuid: userId }
  );

  if (quoteNumberError || !quoteNumber) {
    return quoteNumberError?.message ?? 'Failed to generate example quote number.';
  }

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      user_id: userId,
      customer_id: customer.id,
      quote_number: quoteNumber,
      title: 'Harbor Cafe interior repaint',
      status: 'draft',
      notes: `Prepared by ${businessName} for a sample cafe repaint project.`,
      labour_margin_percent: 10,
      material_margin_percent: 5,
      subtotal_cents: 385000,
      gst_cents: 38500,
      total_cents: 423500,
      valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      tier: 'better',
    })
    .select('id')
    .single();

  if (quoteError || !quote) {
    return quoteError?.message ?? 'Failed to create example quote.';
  }

  const { data: room, error: roomError } = await supabase
    .from('quote_rooms')
    .insert({
      quote_id: quote.id,
      name: 'Main Dining Room',
      room_type: 'interior',
      length_m: 9.5,
      width_m: 6.2,
      height_m: 2.7,
      sort_order: 0,
    })
    .select('id')
    .single();

  if (roomError || !room) {
    return roomError?.message ?? 'Failed to create example quote room.';
  }

  const { error: surfacesError } = await supabase.from('quote_room_surfaces').insert([
    {
      room_id: room.id,
      surface_type: 'walls',
      area_m2: 92,
      coating_type: 'repaint_2coat',
      rate_per_m2_cents: 2200,
      material_cost_cents: 85000,
      labour_cost_cents: 200000,
      paint_litres_needed: 28,
      tier: 'better',
      notes: 'Wash down, patch minor marks, and apply premium low-sheen finish.',
    },
    {
      room_id: room.id,
      surface_type: 'ceiling',
      area_m2: 58,
      coating_type: 'repaint_2coat',
      rate_per_m2_cents: 1700,
      material_cost_cents: 30000,
      labour_cost_cents: 70000,
      paint_litres_needed: 12,
      tier: 'better',
      notes: 'Spot-prime stains and finish with flat ceiling white.',
    },
  ]);

  if (surfacesError) {
    return surfacesError.message;
  }

  const { data: invoiceNumber, error: invoiceNumberError } = await supabase.rpc(
    'generate_invoice_number',
    { user_uuid: userId }
  );

  if (invoiceNumberError || !invoiceNumber) {
    return invoiceNumberError?.message ?? 'Failed to generate example invoice number.';
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      customer_id: customer.id,
      quote_id: quote.id,
      invoice_number: invoiceNumber,
      status: 'sent',
      invoice_type: 'deposit',
      subtotal_cents: 126000,
      gst_cents: 12600,
      total_cents: 138600,
      amount_paid_cents: 0,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      notes: 'Example 30% deposit invoice linked to the sample quote.',
    })
    .select('id')
    .single();

  if (invoiceError || !invoice) {
    return invoiceError?.message ?? 'Failed to create example invoice.';
  }

  const { error: lineItemsError } = await supabase.from('invoice_line_items').insert({
    invoice_id: invoice.id,
    description: '30% deposit for Harbor Cafe interior repaint',
    quantity: 1,
    unit_price_cents: 126000,
    gst_cents: 12600,
    total_cents: 126000,
    sort_order: 0,
  });

  if (lineItemsError) {
    return lineItemsError.message;
  }

  return null;
}
