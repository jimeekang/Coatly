import { NextResponse } from 'next/server';
import {
  getActiveSubscriptionRequiredMessage,
  getSubscriptionSnapshotForUser,
} from '@/lib/subscription/access';
import {
  buildCreateCustomerPayload,
  CUSTOMER_API_SELECT,
  findDuplicateCustomer,
  parseCustomerCreateInput,
  serializeCustomer,
} from '@/lib/customers-api';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await supabase
    .from('customers')
    .select(CUSTOMER_API_SELECT)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('name', { ascending: true });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: (result.data ?? []).map((row) => serializeCustomer(row)),
  });
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return NextResponse.json(
      { error: getActiveSubscriptionRequiredMessage('customer management') },
      { status: 403 }
    );
  }

  const body = await readRequestBody(request);
  if (body.error) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const parsed = parseCustomerCreateInput(body.data);
  if (parsed.error || !parsed.data) {
    return NextResponse.json({ error: parsed.error ?? 'Invalid request body.' }, { status: 400 });
  }

  const duplicate = await findDuplicateCustomer(
    supabase,
    user.id,
    parsed.data.name,
    parsed.data.address ?? null
  );

  if (duplicate.error) {
    return NextResponse.json({ error: duplicate.error }, { status: 500 });
  }

  if (duplicate.data) {
    return NextResponse.json(
      { error: 'A customer with this name and address already exists.' },
      { status: 409 }
    );
  }

  const payload = buildCreateCustomerPayload(parsed.data);
  const result = await supabase
    .from('customers')
    .insert({
      user_id: user.id,
      ...payload,
    })
    .select(CUSTOMER_API_SELECT)
    .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ data: serializeCustomer(result.data) }, { status: 201 });
}

async function readRequestBody(request: Request) {
  try {
    return { data: await request.json(), error: null };
  } catch {
    return { data: null, error: 'Invalid JSON body.' };
  }
}
