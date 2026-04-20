import { NextResponse } from 'next/server';
import {
  getActiveSubscriptionRequiredMessage,
  getSubscriptionSnapshotForUser,
} from '@/lib/subscription/access';
import {
  buildUpdateCustomerPayload,
  CUSTOMER_API_SELECT,
  findDuplicateCustomer,
  parseCustomerUpdateInput,
  serializeCustomer,
} from '@/lib/customers-api';
import { buildQuoteCustomerAddress } from '@/lib/quotes';
import { createServerClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await supabase
    .from('customers')
    .select(CUSTOMER_API_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .maybeSingle();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  if (!result.data) {
    return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
  }

  return NextResponse.json({ data: serializeCustomer(result.data) });
}

export async function PATCH(request: Request, context: RouteContext) {
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

  const parsed = parseCustomerUpdateInput(body.data);
  if (parsed.error || !parsed.data) {
    return NextResponse.json({ error: parsed.error ?? 'Invalid request body.' }, { status: 400 });
  }

  const { id } = await context.params;
  const currentResult = await supabase
    .from('customers')
    .select(CUSTOMER_API_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .maybeSingle();

  if (currentResult.error) {
    return NextResponse.json({ error: currentResult.error.message }, { status: 500 });
  }

  if (!currentResult.data) {
    return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
  }

  const nextName = parsed.data.name ?? currentResult.data.name;
  const nextAddress =
    'address' in parsed.data
      ? parsed.data.address ?? null
      : buildQuoteCustomerAddress(currentResult.data);

  const duplicate = await findDuplicateCustomer(supabase, user.id, nextName, nextAddress, id);

  if (duplicate.error) {
    return NextResponse.json({ error: duplicate.error }, { status: 500 });
  }

  if (duplicate.data) {
    return NextResponse.json(
      { error: 'A customer with this name and address already exists.' },
      { status: 409 }
    );
  }

  const updatePayload = buildUpdateCustomerPayload(parsed.data);
  const result = await supabase
    .from('customers')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .select(CUSTOMER_API_SELECT)
    .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ data: serializeCustomer(result.data) });
}

export async function DELETE(_request: Request, context: RouteContext) {
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

  const { id } = await context.params;
  const result = await supabase
    .from('customers')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .select(CUSTOMER_API_SELECT)
    .maybeSingle();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  if (!result.data) {
    return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
  }

  return NextResponse.json({ data: serializeCustomer(result.data) });
}

async function readRequestBody(request: Request) {
  try {
    return { data: await request.json(), error: null };
  } catch {
    return { data: null, error: 'Invalid JSON body.' };
  }
}
