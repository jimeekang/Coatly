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
  emails: string[];
  phones: string[];
  company_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  properties: CustomerProperty[];
  billing_same_as_site: boolean;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postcode: string | null;
  notes: string | null;
  created_at: string;
}

export interface CustomerProperty {
  [key: string]: string;
  label: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postcode: string;
  notes: string;
}

export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  emails: string[];
  phones: string[];
  company_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postcode: string;
  properties: CustomerProperty[];
  billing_same_as_site: boolean;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_state: string;
  billing_postcode: string;
  notes: string;
}

const CUSTOMER_SELECT =
  'id, name, email, phone, emails, phones, company_name, address_line1, address_line2, city, state, postcode, properties, billing_same_as_site, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_postcode, notes, created_at';
const CUSTOMER_SELECT_LEGACY =
  'id, name, email, phone, company_name, address_line1, address_line2, city, state, postcode, notes, created_at';

function validateCustomerForm(data: CustomerFormData) {
  if (!data.name.trim()) {
    return { error: 'Customer name is required' };
  }

  const emails = normalizeEmails(data);
  const phones = normalizePhones(data);
  const properties = normalizeProperties(data);

  if (emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: 'Invalid email address' };
  }

  if (
    properties.some(
      (property) => property.postcode.trim() && !/^\d{4}$/.test(property.postcode.trim())
    )
  ) {
    return { error: 'Postcode must be 4 digits' };
  }

  if (phones.some((phone) => phone.length > 40)) {
    return { error: 'Phone must be 40 characters or less' };
  }

  return null;
}

function normalizeEmails(data: CustomerFormData) {
  const emails = [data.email, ...(data.emails ?? [])]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(emails));
}

function normalizePhones(data: CustomerFormData) {
  const phones = [data.phone, ...(data.phones ?? [])]
    .map((phone) => phone.trim())
    .filter(Boolean);

  return Array.from(new Set(phones));
}

function normalizeProperties(data: CustomerFormData): CustomerProperty[] {
  const sourceProperties = data.properties?.length
    ? data.properties
    : [
        {
          label: 'Primary property',
          address_line1: data.address_line1,
          address_line2: data.address_line2,
          city: data.city,
          state: data.state,
          postcode: data.postcode,
          notes: '',
        },
      ];

  const properties = sourceProperties
    .map((property, index) => ({
      label: property.label.trim() || `Property ${index + 1}`,
      address_line1: property.address_line1.trim(),
      address_line2: property.address_line2.trim(),
      city: property.city.trim(),
      state: property.state.trim(),
      postcode: property.postcode.trim(),
      notes: property.notes.trim(),
    }))
    .filter(
      (property) =>
        property.address_line1 ||
        property.address_line2 ||
        property.city ||
        property.state ||
        property.postcode ||
        property.notes
    );

  return properties;
}

function buildCustomerPayload(data: CustomerFormData) {
  const emails = normalizeEmails(data);
  const phones = normalizePhones(data);
  const properties = normalizeProperties(data);
  const primaryProperty = properties[0] ?? null;

  const billingSameAsSite = data.billing_same_as_site !== false;

  return {
    name: data.name.trim(),
    email: emails[0] ?? null,
    phone: phones[0] ?? null,
    emails,
    phones,
    company_name: data.company_name.trim() || null,
    address_line1: primaryProperty?.address_line1 || null,
    address_line2: primaryProperty?.address_line2 || null,
    city: primaryProperty?.city || null,
    state: primaryProperty?.state || null,
    postcode: primaryProperty?.postcode || null,
    properties,
    billing_same_as_site: billingSameAsSite,
    billing_address_line1: billingSameAsSite ? null : (data.billing_address_line1.trim() || null),
    billing_address_line2: billingSameAsSite ? null : (data.billing_address_line2.trim() || null),
    billing_city: billingSameAsSite ? null : (data.billing_city.trim() || null),
    billing_state: billingSameAsSite ? null : (data.billing_state.trim() || null),
    billing_postcode: billingSameAsSite ? null : (data.billing_postcode.trim() || null),
    notes: data.notes.trim() || null,
  };
}

function buildLegacyCustomerPayload(data: CustomerFormData) {
  const {
    emails: _emails,
    phones: _phones,
    properties: _properties,
    ...payload
  } = buildCustomerPayload(data);

  void _emails;
  void _phones;
  void _properties;

  return payload;
}

function requiresCustomerMultiColumns(payload: ReturnType<typeof buildCustomerPayload>) {
  return (
    payload.emails.length > 1 ||
    payload.phones.length > 1 ||
    payload.properties.length > 1 ||
    payload.properties.some(
      (property) =>
        property.notes ||
        (property.label &&
          property.label !== 'Primary property' &&
          !/^Property \d+$/.test(property.label))
    )
  );
}

function getMissingCustomerMultiColumnsMessage() {
  return 'Customer properties, extra emails, and extra phone numbers require the latest database migration. Please apply the customer multi-contact migration, then save again.';
}

function isMissingCustomerMultiColumnError(message: string | null | undefined) {
  if (!message) return false;

  return (
    message.includes('customers.emails') ||
    message.includes('customers.phones') ||
    message.includes('customers.properties') ||
    ((message.includes('emails') ||
      message.includes('phones') ||
      message.includes('properties')) &&
      message.includes('customers'))
  );
}

function normalizeCustomerRecord(customer: Customer): Customer {
  const emails = Array.isArray(customer.emails)
    ? customer.emails.filter(Boolean)
    : customer.email
      ? [customer.email]
      : [];
  const phones = Array.isArray(customer.phones)
    ? customer.phones.filter(Boolean)
    : customer.phone
      ? [customer.phone]
      : [];
  const properties =
    Array.isArray(customer.properties) && customer.properties.length > 0
      ? customer.properties
      : [
          {
            label: 'Primary property',
            address_line1: customer.address_line1 ?? '',
            address_line2: customer.address_line2 ?? '',
            city: customer.city ?? '',
            state: customer.state ?? '',
            postcode: customer.postcode ?? '',
            notes: '',
          },
        ].filter(
          (property) =>
            property.address_line1 ||
            property.address_line2 ||
            property.city ||
            property.state ||
            property.postcode
        );

  return {
    ...customer,
    email: customer.email ?? emails[0] ?? null,
    phone: customer.phone ?? phones[0] ?? null,
    emails,
    phones,
    properties,
    billing_same_as_site: customer.billing_same_as_site ?? true,
  };
}

export async function getCustomers(): Promise<{ data: Customer[]; error: string | null }> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const result = await supabase
    .from('customers')
    .select(CUSTOMER_SELECT)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('name', { ascending: true });

  if (result.error && isMissingCustomerMultiColumnError(result.error.message)) {
    const legacyResult = await supabase
      .from('customers')
      .select(CUSTOMER_SELECT_LEGACY)
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    return {
      data: ((legacyResult.data as unknown as Customer[] | null) ?? []).map(
        normalizeCustomerRecord
      ),
      error: legacyResult.error?.message ?? null,
    };
  }

  return {
    data: ((result.data as unknown as Customer[] | null) ?? []).map(normalizeCustomerRecord),
    error: result.error?.message ?? null,
  };
}

export interface CustomerRecentJob {
  type: 'quote' | 'invoice';
  id: string;
  number: string;
  title: string | null;
  status: string;
  created_at: string;
}

export async function getRecentJobsPerCustomer(): Promise<Record<string, CustomerRecentJob>> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const [quotesResult, invoicesResult] = await Promise.all([
    supabase
      .from('quotes')
      .select('id, customer_id, quote_number, title, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('invoices')
      .select('id, customer_id, invoice_number, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  const map: Record<string, CustomerRecentJob> = {};

  for (const q of (quotesResult.data ?? []) as Array<{
    id: string;
    customer_id: string;
    quote_number: string;
    title: string | null;
    status: string;
    created_at: string;
  }>) {
    const existing = map[q.customer_id];
    if (!existing || q.created_at > existing.created_at) {
      map[q.customer_id] = {
        type: 'quote',
        id: q.id,
        number: q.quote_number,
        title: q.title,
        status: q.status,
        created_at: q.created_at,
      };
    }
  }

  for (const inv of (invoicesResult.data ?? []) as Array<{
    id: string;
    customer_id: string;
    invoice_number: string;
    status: string;
    created_at: string;
  }>) {
    const existing = map[inv.customer_id];
    if (!existing || inv.created_at > existing.created_at) {
      map[inv.customer_id] = {
        type: 'invoice',
        id: inv.id,
        number: inv.invoice_number,
        title: null,
        status: inv.status,
        created_at: inv.created_at,
      };
    }
  }

  return map;
}

export async function getCustomer(
  id: string
): Promise<{ data: Customer | null; error: string | null }> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const result = await supabase
    .from('customers')
    .select(CUSTOMER_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (result.error && isMissingCustomerMultiColumnError(result.error.message)) {
    const legacyResult = await supabase
      .from('customers')
      .select(CUSTOMER_SELECT_LEGACY)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    return {
      data: legacyResult.data
        ? normalizeCustomerRecord(legacyResult.data as unknown as Customer)
        : null,
      error: legacyResult.error?.message ?? null,
    };
  }

  return {
    data: result.data ? normalizeCustomerRecord(result.data as unknown as Customer) : null,
    error: result.error?.message ?? null,
  };
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

  const payload = buildCustomerPayload(data);

  // Duplicate check: same name + same primary address (excluding self)
  if (payload.address_line1) {
    const { data: dupData } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .neq('id', id)
      .ilike('name', payload.name)
      .ilike('address_line1', payload.address_line1)
      .limit(1)
      .maybeSingle();

    if (dupData) {
      return { error: 'A customer with this name and address already exists.' };
    }
  }

  let { error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error && isMissingCustomerMultiColumnError(error.message)) {
    if (requiresCustomerMultiColumns(payload)) {
      return { error: getMissingCustomerMultiColumnsMessage() };
    }

    const legacyResult = await supabase
      .from('customers')
      .update(buildLegacyCustomerPayload(data))
      .eq('id', id)
      .eq('user_id', user.id);
    error = legacyResult.error;
  }

  if (error) return { error: error.message };
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

  const payload = buildCustomerPayload(data);

  // Duplicate check: same name + same primary address
  if (payload.address_line1) {
    const { data: dupData } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .ilike('name', payload.name)
      .ilike('address_line1', payload.address_line1)
      .limit(1)
      .maybeSingle();

    if (dupData) {
      return { error: 'A customer with this name and address already exists.' };
    }
  }

  let { error } = await supabase.from('customers').insert({
    user_id: user.id,
    ...payload,
  });

  if (error && isMissingCustomerMultiColumnError(error.message)) {
    if (requiresCustomerMultiColumns(payload)) {
      return { error: getMissingCustomerMultiColumnsMessage() };
    }

    const legacyResult = await supabase.from('customers').insert({
      user_id: user.id,
      ...buildLegacyCustomerPayload(data),
    });
    error = legacyResult.error;
  }

  if (error) return { error: error.message };

  redirect('/customers');
}
