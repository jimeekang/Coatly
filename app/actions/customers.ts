'use server';

import { redirect } from 'next/navigation';
import {
  getActiveSubscriptionRequiredMessage,
  getSubscriptionSnapshotForUser,
} from '@/lib/subscription/access';
import { requireCurrentUser } from '@/lib/supabase/request-context';
import { createServerClient } from '@/lib/supabase/server';

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  notes: string | null;
  created_at: string;
}

export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  company_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postcode: string;
  notes: string;
}

function validateCustomerForm(data: CustomerFormData) {
  if (!data.name.trim()) {
    return { error: 'Customer name is required' };
  }

  if (data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    return { error: 'Invalid email address' };
  }

  if (data.postcode.trim() && !/^\d{4}$/.test(data.postcode.trim())) {
    return { error: 'Postcode must be 4 digits' };
  }

  return null;
}

function buildCustomerPayload(data: CustomerFormData) {
  return {
    name: data.name.trim(),
    email: data.email.trim() || null,
    phone: data.phone.trim() || null,
    company_name: data.company_name.trim() || null,
    address_line1: data.address_line1.trim() || null,
    address_line2: data.address_line2.trim() || null,
    city: data.city.trim() || null,
    state: data.state.trim() || null,
    postcode: data.postcode.trim() || null,
    notes: data.notes.trim() || null,
  };
}

export async function getCustomers(): Promise<{ data: Customer[]; error: string | null }> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const { data, error } = await supabase
    .from('customers')
    .select(
      'id, name, email, phone, company_name, address_line1, address_line2, city, state, postcode, notes, created_at'
    )
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  return { data: (data as Customer[]) ?? [], error: error?.message ?? null };
}

export async function getCustomer(
  id: string
): Promise<{ data: Customer | null; error: string | null }> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const { data, error } = await supabase
    .from('customers')
    .select(
      'id, name, email, phone, company_name, address_line1, address_line2, city, state, postcode, notes, created_at'
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  return { data: data as Customer | null, error: error?.message ?? null };
}

export async function updateCustomer(
  id: string,
  data: CustomerFormData
): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return { error: getActiveSubscriptionRequiredMessage('customer management') };
  }

  const validationError = validateCustomerForm(data);
  if (validationError) return validationError;

  const { error } = await supabase
    .from('customers')
    .update(buildCustomerPayload(data))
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  redirect(`/customers/${id}`);
}

export async function deleteCustomer(id: string): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return { error: getActiveSubscriptionRequiredMessage('customer management') };
  }

  const { error } = await supabase
    .from('customers')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  redirect('/customers');
}

export async function createCustomer(
  data: CustomerFormData
): Promise<{ error: string } | void> {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return { error: getActiveSubscriptionRequiredMessage('customer management') };
  }

  const validationError = validateCustomerForm(data);
  if (validationError) return validationError;

  const { error } = await supabase.from('customers').insert({
    user_id: user.id,
    ...buildCustomerPayload(data),
  });

  if (error) return { error: error.message };

  redirect('/customers');
}
