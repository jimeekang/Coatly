#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

type EnvMap = Record<string, string | undefined>;

type SmokeUser = {
  id: string;
  email: string | null;
};

type FixtureIds = {
  customerIds: string[];
  invoiceIds: string[];
  jobIds: string[];
  quoteIds: string[];
};

type ProfilePayload = Database['public']['Tables']['profiles']['Insert'];
type SubscriptionPayload =
  Database['public']['Tables']['subscriptions']['Insert'];
type CustomerPayload = Database['public']['Tables']['customers']['Insert'];
type QuotePayload = Database['public']['Tables']['quotes']['Insert'];
type QuoteLineItemPayload =
  Database['public']['Tables']['quote_line_items']['Insert'];
type InvoicePayload = Database['public']['Tables']['invoices']['Insert'];
type InvoiceLineItemPayload =
  Database['public']['Tables']['invoice_line_items']['Insert'];
type JobPayload = Database['public']['Tables']['jobs']['Insert'];
type JobScheduleDayPayload = {
  date: string;
  job_id: string;
  user_id: string;
};

export type LaunchSmokeDb = {
  cleanupFixture(ids: FixtureIds): Promise<void>;
  createCustomer(payload: CustomerPayload): Promise<string>;
  createInvoice(
    payload: InvoicePayload
  ): Promise<{ id: string; public_share_token: string | null }>;
  createInvoiceLineItem(payload: InvoiceLineItemPayload): Promise<void>;
  createJob(payload: JobPayload): Promise<string>;
  createJobScheduleDay(payload: JobScheduleDayPayload): Promise<void>;
  createQuote(
    payload: QuotePayload
  ): Promise<{ id: string; public_share_token: string | null }>;
  createQuoteLineItem(payload: QuoteLineItemPayload): Promise<void>;
  createUser(email: string, password: string): Promise<SmokeUser>;
  findExistingFixtureIds(input: {
    tag: string;
    userId: string;
  }): Promise<FixtureIds>;
  listUsers(): Promise<SmokeUser[]>;
  upsertProfile(payload: ProfilePayload): Promise<void>;
  upsertSubscription(payload: SubscriptionPayload): Promise<void>;
};

type LaunchSmokeSeedConfig = {
  customerEmail: string;
  email: string;
  password: string;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
};

type RunLaunchSmokeSeedInput = {
  db: LaunchSmokeDb;
  env?: EnvMap;
  now?: Date;
  randomUUID?: () => string;
};

export type LaunchSmokeSeedResult = {
  ok: true;
  userId: string;
  email: string;
  approvalQuoteId: string;
  approvalQuoteToken: string | null;
  bookingDate: string;
  customerId: string;
  editQuoteId: string;
  quoteId: string;
  quoteToken: string | null;
  invoiceId: string;
  invoiceToken: string | null;
  jobId: string;
};

const TAG = '[LAUNCH_SMOKE]';
const LIVE_SUPABASE_PROJECT_REF = 'qwjpqujdykojxsisjltd';
const SUBTOTAL_CENTS = 100_000;
const GST_CENTS = 10_000;
const TOTAL_CENTS = 110_000;

function dateStamp(now: Date) {
  return now.toISOString().slice(0, 10).replaceAll('-', '');
}

function isoDateDaysFrom(now: Date, days: number) {
  const value = new Date(now);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isoDateAtLeastDaysFrom(now: Date, days: number) {
  return isoDateDaysFrom(now, days);
}

function requireEnv(env: EnvMap, keys: string[]) {
  const missing = keys.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required launch smoke seed env: ${missing.join(', ')}`);
  }
}

export function resolveLaunchSmokeSeedConfig(
  env: EnvMap = process.env
): LaunchSmokeSeedConfig {
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'Refusing to seed launch smoke data with NODE_ENV=production.'
    );
  }

  if (env.ALLOW_LAUNCH_SMOKE_SEED !== 'true') {
    throw new Error('ALLOW_LAUNCH_SMOKE_SEED=true is required.');
  }

  requireEnv(env, [
    'LAUNCH_SMOKE_EMAIL',
    'LAUNCH_SMOKE_PASSWORD',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]);

  const email = env.LAUNCH_SMOKE_EMAIL!.trim();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  if (
    supabaseUrl.includes(LIVE_SUPABASE_PROJECT_REF) &&
    env.ALLOW_LIVE_SUPABASE_SMOKE_SEED !== 'true'
  ) {
    throw new Error(
      'ALLOW_LIVE_SUPABASE_SMOKE_SEED=true is required for the known live Supabase project.'
    );
  }

  return {
    customerEmail: env.RESEND_TEST_RECIPIENT?.trim() || email,
    email,
    password: env.LAUNCH_SMOKE_PASSWORD!,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY!,
    supabaseUrl,
  };
}

export async function runLaunchSmokeSeed({
  db,
  env = process.env,
  now = new Date(),
  randomUUID = crypto.randomUUID,
}: RunLaunchSmokeSeedInput): Promise<LaunchSmokeSeedResult> {
  const config = resolveLaunchSmokeSeedConfig(env);
  const existingUser = (await db.listUsers()).find(
    (user) => user.email?.toLowerCase() === config.email.toLowerCase()
  );
  const user =
    existingUser ?? (await db.createUser(config.email, config.password));

  await db.upsertProfile({
    user_id: user.id,
    business_name: `${TAG} Coatly Painting`,
    email: config.email,
    phone: '0400 000 000',
    address_line1: '1 Smoke Street',
    city: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    default_payment_terms: 7,
    onboarding_completed: true,
  });

  await db.upsertSubscription({
    user_id: user.id,
    plan: 'pro',
    status: 'trialing',
    current_period_start: now.toISOString(),
    current_period_end: new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
  });

  const existingFixtureIds = await db.findExistingFixtureIds({
    tag: TAG,
    userId: user.id,
  });
  await db.cleanupFixture(existingFixtureIds);

  const stamp = dateStamp(now);
  const customerId = await db.createCustomer({
    user_id: user.id,
    name: `${TAG} Preview Customer`,
    email: config.customerEmail,
    phone: '0400 000 000',
    address_line1: '1 Smoke Street',
    city: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    notes: `${TAG} Created by launch smoke seed.`,
  });

  const quote = await db.createQuote({
    user_id: user.id,
    customer_id: customerId,
    quote_number: `SMOKE-Q-${stamp}`,
    title: `${TAG} Interior repaint`,
    status: 'sent',
    tier: 'standard',
    job_type: 'interior',
    valid_until: isoDateDaysFrom(now, 14),
    working_days: 2,
    subtotal_cents: SUBTOTAL_CENTS,
    gst_cents: GST_CENTS,
    total_cents: TOTAL_CENTS,
    labour_margin_percent: 0,
    material_margin_percent: 0,
    public_share_token: randomUUID(),
    notes: `${TAG} Smoke quote for preview workflow verification.`,
    internal_notes: `${TAG} Safe to delete and recreate.`,
  });

  await db.createQuoteLineItem({
    quote_id: quote.id,
    name: `${TAG} Interior repaint labour`,
    notes: 'Walls and trims, two coats.',
    category: 'service',
    quantity: 1,
    unit: 'fixed',
    unit_price_cents: SUBTOTAL_CENTS,
    total_cents: SUBTOTAL_CENTS,
    is_optional: false,
    is_selected: true,
    sort_order: 0,
  });

  const editQuote = await db.createQuote({
    user_id: user.id,
    customer_id: customerId,
    quote_number: `SMOKE-Q-EDIT-${stamp}`,
    title: `${TAG} Editable smoke quote`,
    status: 'draft',
    tier: 'standard',
    job_type: 'interior',
    valid_until: isoDateDaysFrom(now, 14),
    working_days: 1,
    subtotal_cents: 50_000,
    gst_cents: 5_000,
    total_cents: 55_000,
    labour_margin_percent: 0,
    material_margin_percent: 0,
    notes: `${TAG} Unlinked quote for edit route verification.`,
    internal_notes: `${TAG} Safe to delete and recreate.`,
  });

  await db.createQuoteLineItem({
    quote_id: editQuote.id,
    name: `${TAG} Editable quote labour`,
    notes: 'Unlinked edit smoke line item.',
    category: 'service',
    quantity: 1,
    unit: 'fixed',
    unit_price_cents: 50_000,
    total_cents: 50_000,
    is_optional: false,
    is_selected: true,
    sort_order: 0,
  });

  const approvalQuote = await db.createQuote({
    user_id: user.id,
    customer_id: customerId,
    quote_number: `SMOKE-Q-APPROVE-${stamp}`,
    title: `${TAG} Approval booking smoke quote`,
    status: 'sent',
    tier: 'standard',
    job_type: 'interior',
    valid_until: isoDateDaysFrom(now, 14),
    working_days: 1,
    subtotal_cents: 75_000,
    gst_cents: 7_500,
    total_cents: 82_500,
    labour_margin_percent: 0,
    material_margin_percent: 0,
    public_share_token: randomUUID(),
    notes: `${TAG} Smoke quote for public approval and booking verification.`,
    internal_notes: `${TAG} Safe to delete and recreate.`,
  });

  await db.createQuoteLineItem({
    quote_id: approvalQuote.id,
    name: `${TAG} Approval quote labour`,
    notes: 'Unlinked quote for public approval and booking smoke.',
    category: 'service',
    quantity: 1,
    unit: 'fixed',
    unit_price_cents: 75_000,
    total_cents: 75_000,
    is_optional: false,
    is_selected: true,
    sort_order: 0,
  });

  const invoice = await db.createInvoice({
    user_id: user.id,
    customer_id: customerId,
    quote_id: quote.id,
    invoice_number: `SMOKE-I-${stamp}`,
    status: 'draft',
    invoice_type: 'full',
    subtotal_cents: SUBTOTAL_CENTS,
    gst_cents: GST_CENTS,
    total_cents: TOTAL_CENTS,
    amount_paid_cents: 0,
    due_date: isoDateDaysFrom(now, 7),
    public_share_token: randomUUID(),
    notes: `${TAG} Smoke invoice for preview workflow verification.`,
  });

  await db.createInvoiceLineItem({
    invoice_id: invoice.id,
    description: `${TAG} Interior repaint labour`,
    quantity: 1,
    unit_price_cents: SUBTOTAL_CENTS,
    gst_cents: GST_CENTS,
    total_cents: TOTAL_CENTS,
    sort_order: 0,
  });

  const scheduledDate = isoDateDaysFrom(now, 3);
  const bookingDate = isoDateAtLeastDaysFrom(now, 10);
  const jobId = await db.createJob({
    user_id: user.id,
    customer_id: customerId,
    quote_id: quote.id,
    title: `${TAG} Scheduled smoke job`,
    status: 'scheduled',
    scheduled_date: scheduledDate,
    start_date: scheduledDate,
    end_date: scheduledDate,
    duration_days: 1,
    notes: `${TAG} Smoke job for preview schedule verification.`,
  });
  await db.createJobScheduleDay({
    date: scheduledDate,
    job_id: jobId,
    user_id: user.id,
  });

  return {
    ok: true,
    userId: user.id,
    email: config.email,
    approvalQuoteId: approvalQuote.id,
    approvalQuoteToken: approvalQuote.public_share_token,
    bookingDate,
    customerId,
    editQuoteId: editQuote.id,
    quoteId: quote.id,
    quoteToken: quote.public_share_token,
    invoiceId: invoice.id,
    invoiceToken: invoice.public_share_token,
    jobId,
  };
}

function assertSupabaseData<T>(
  data: T | null,
  error: { message: string } | null,
  message: string
): T {
  if (error) throw new Error(`${message}: ${error.message}`);
  if (!data) throw new Error(`${message}: no data returned`);
  return data;
}

async function deleteWhenIds(
  client: SupabaseClient,
  table: string,
  column: string,
  ids: string[]
) {
  if (ids.length === 0) return;
  const { error } = await client.from(table).delete().in(column, ids);
  if (error) throw new Error(`Failed to clean ${String(table)}: ${error.message}`);
}

export function createSupabaseLaunchSmokeDb(
  client: SupabaseClient<Database>
): LaunchSmokeDb {
  return {
    async cleanupFixture(ids) {
      await deleteWhenIds(client, 'job_schedule_days', 'job_id', ids.jobIds);
      await deleteWhenIds(client, 'jobs', 'id', ids.jobIds);
      await deleteWhenIds(
        client,
        'invoice_line_items',
        'invoice_id',
        ids.invoiceIds
      );
      await deleteWhenIds(client, 'invoices', 'id', ids.invoiceIds);

      if (ids.quoteIds.length > 0) {
        const { data: rooms, error: roomsError } = await client
          .from('quote_rooms')
          .select('id')
          .in('quote_id', ids.quoteIds);
        if (roomsError) throw new Error(`Failed to load quote rooms: ${roomsError.message}`);
        const roomIds = (rooms ?? []).map((room) => room.id);

        const { data: sections, error: sectionsError } = await client
          .from('quote_scope_sections')
          .select('id')
          .in('quote_id', ids.quoteIds);
        if (sectionsError) {
          throw new Error(`Failed to load quote scope sections: ${sectionsError.message}`);
        }
        const sectionIds = (sections ?? []).map((section) => section.id);

        await deleteWhenIds(
          client,
          'quote_room_surfaces',
          'room_id',
          roomIds
        );
        await deleteWhenIds(client, 'quote_rooms', 'id', roomIds);
        await deleteWhenIds(
          client,
          'quote_scope_steps',
          'section_id',
          sectionIds
        );
        await deleteWhenIds(
          client,
          'quote_line_items',
          'quote_id',
          ids.quoteIds
        );
        await deleteWhenIds(
          client,
          'quote_estimate_items',
          'quote_id',
          ids.quoteIds
        );
        await deleteWhenIds(
          client,
          'quote_clause_items',
          'quote_id',
          ids.quoteIds
        );
        await deleteWhenIds(
          client,
          'quote_scope_sections',
          'id',
          sectionIds
        );
        await deleteWhenIds(client, 'quotes', 'id', ids.quoteIds);
      }

      await deleteWhenIds(client, 'customers', 'id', ids.customerIds);
    },
    async createCustomer(payload) {
      const { data, error } = await client
        .from('customers')
        .insert(payload)
        .select('id')
        .single();
      return assertSupabaseData(data, error, 'Failed to create smoke customer').id;
    },
    async createInvoice(payload) {
      const { data, error } = await client
        .from('invoices')
        .insert(payload)
        .select('id, public_share_token')
        .single();
      return assertSupabaseData(data, error, 'Failed to create smoke invoice');
    },
    async createInvoiceLineItem(payload) {
      const { error } = await client.from('invoice_line_items').insert(payload);
      if (error) throw new Error(`Failed to create smoke invoice line item: ${error.message}`);
    },
    async createJob(payload) {
      const { data, error } = await client
        .from('jobs')
        .insert(payload)
        .select('id')
        .single();
      return assertSupabaseData(data, error, 'Failed to create smoke job').id;
    },
    async createJobScheduleDay(payload) {
      const untypedClient: SupabaseClient = client;
      const { error } = await untypedClient
        .from('job_schedule_days')
        .insert(payload);
      if (error) {
        throw new Error(`Failed to create smoke job schedule day: ${error.message}`);
      }
    },
    async createQuote(payload) {
      const { data, error } = await client
        .from('quotes')
        .insert(payload)
        .select('id, public_share_token')
        .single();
      return assertSupabaseData(data, error, 'Failed to create smoke quote');
    },
    async createQuoteLineItem(payload) {
      const { error } = await client.from('quote_line_items').insert(payload);
      if (error) throw new Error(`Failed to create smoke quote line item: ${error.message}`);
    },
    async createUser(email, password) {
      const { data, error } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { launch_smoke: true },
      });
      if (error) throw new Error(`Failed to create smoke user: ${error.message}`);
      if (!data.user) throw new Error('Failed to create smoke user: no user returned');
      return { id: data.user.id, email: data.user.email ?? null };
    },
    async findExistingFixtureIds({ tag, userId }) {
      const [customers, quotes, invoices, jobs] = await Promise.all([
        client
          .from('customers')
          .select('id')
          .eq('user_id', userId)
          .like('name', `${tag}%`),
        client
          .from('quotes')
          .select('id')
          .eq('user_id', userId)
          .like('quote_number', 'SMOKE-Q-%'),
        client
          .from('invoices')
          .select('id')
          .eq('user_id', userId)
          .like('invoice_number', 'SMOKE-I-%'),
        client
          .from('jobs')
          .select('id')
          .eq('user_id', userId)
          .like('title', `${tag}%`),
      ]);

      if (customers.error) throw new Error(`Failed to find smoke customers: ${customers.error.message}`);
      if (quotes.error) throw new Error(`Failed to find smoke quotes: ${quotes.error.message}`);
      if (invoices.error) throw new Error(`Failed to find smoke invoices: ${invoices.error.message}`);
      if (jobs.error) throw new Error(`Failed to find smoke jobs: ${jobs.error.message}`);

      return {
        customerIds: (customers.data ?? []).map((row) => row.id),
        quoteIds: (quotes.data ?? []).map((row) => row.id),
        invoiceIds: (invoices.data ?? []).map((row) => row.id),
        jobIds: (jobs.data ?? []).map((row) => row.id),
      };
    },
    async listUsers() {
      const { data, error } = await client.auth.admin.listUsers({
        perPage: 1000,
      });
      if (error) throw new Error(`Failed to list auth users: ${error.message}`);
      return data.users.map((user) => ({
        id: user.id,
        email: user.email ?? null,
      }));
    },
    async upsertProfile(payload) {
      const { error } = await client.from('profiles').upsert(payload, {
        onConflict: 'user_id',
      });
      if (error) throw new Error(`Failed to upsert smoke profile: ${error.message}`);
    },
    async upsertSubscription(payload) {
      const { error } = await client.from('subscriptions').upsert(payload, {
        onConflict: 'user_id',
      });
      if (error) {
        throw new Error(`Failed to upsert smoke subscription: ${error.message}`);
      }
    },
  };
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const raw = trimmed.slice(separatorIndex + 1).trim();
    const value = raw.replace(/^["']|["']$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env'));

  const config = resolveLaunchSmokeSeedConfig();
  const client = createClient<Database>(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const result = await runLaunchSmokeSeed({
    db: createSupabaseLaunchSmokeDb(client),
  });

  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  void main().catch((error: unknown) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    );
    process.exit(1);
  });
}
