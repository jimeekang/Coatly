#!/usr/bin/env node
/**
 * Coatly Demo Data Seed Script
 * ============================================================
 * Generates realistic test data for development/demo purposes.
 *
 * USAGE:
 *   npm run seed:demo -- --user-id=<uuid>
 *   npm run seed:demo -- --email=<email@example.com>
 *
 * REQUIREMENTS:
 *   - NODE_ENV must NOT be 'production'
 *   - ALLOW_DEMO_SEED=true must be set (in .env.local or prefixed inline)
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured
 *
 * DATA CREATED PER RUN:
 *   - 5 customers  (names prefixed with [DEMO_SEED])
 *   - 3 quotes     (quote_number: DEMO-Q001 .. DEMO-Q003, with rooms + surfaces)
 *   - 2 invoices   (invoice_number: DEMO-I001 .. DEMO-I002, with line items)
 *
 * IDEMPOTENCY:
 *   Re-running for the same user_id cleans existing demo records first,
 *   then re-creates from scratch. No duplicate explosion.
 *
 * EXAMPLE:
 *   # inline env override
 *   ALLOW_DEMO_SEED=true npm run seed:demo -- --user-id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *
 *   # or with email
 *   ALLOW_DEMO_SEED=true npm run seed:demo -- --email=you@example.com
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// ─────────────────────────────────────────────────────────────
// 1. Load .env.local / .env so the script works without
//    wrapping everything in a shell export dance
// ─────────────────────────────────────────────────────────────

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const cwd = process.cwd();
loadEnvFile(path.join(cwd, '.env.local'));
loadEnvFile(path.join(cwd, '.env'));

// ─────────────────────────────────────────────────────────────
// 2. Production safety guards  ← checked AFTER env load
// ─────────────────────────────────────────────────────────────

if (process.env['NODE_ENV'] === 'production') {
  console.error('❌  Refusing to seed: NODE_ENV=production.');
  process.exit(1);
}

if (process.env['ALLOW_DEMO_SEED'] !== 'true') {
  console.error('❌  Refusing to seed: ALLOW_DEMO_SEED=true is required.');
  console.error(
    '    Set it in .env.local or prefix the command:\n' +
      '    ALLOW_DEMO_SEED=true npm run seed:demo -- --user-id=<uuid>',
  );
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// 3. CLI argument parsing
// ─────────────────────────────────────────────────────────────

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

const argUserId = getArg('user-id');
const argEmail = getArg('email');

if (!argUserId && !argEmail) {
  console.error('❌  Provide --user-id=<uuid> or --email=<email>');
  console.error('    Example: npm run seed:demo -- --user-id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// 4. Supabase admin client (service role key — bypasses RLS)
//    Note: intentionally NOT importing lib/supabase/admin.ts
//    because that file has a 'server-only' guard.
// ─────────────────────────────────────────────────────────────

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('    Check your .env.local file.');
  process.exit(1);
}

const db = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─────────────────────────────────────────────────────────────
// 5. Shared constants and helpers
// ─────────────────────────────────────────────────────────────

/** Prefix added to every demo customer name for easy identification. */
const SEED_TAG = '[DEMO_SEED]';

/** Fixed numbers used for idempotent lookup and cleanup. */
const DEMO_QUOTE_NUMBERS = ['DEMO-Q001', 'DEMO-Q002', 'DEMO-Q003'] as const;
const DEMO_INVOICE_NUMBERS = ['DEMO-I001', 'DEMO-I002'] as const;

/** Customer names (include SEED_TAG for deletion queries). */
const DEMO_CUSTOMER_NAMES = [
  `${SEED_TAG} Sarah Mitchell`,
  `${SEED_TAG} Tom Richardson`,
  `${SEED_TAG} Emma Clarke`,
  `${SEED_TAG} David Wong`,
  `${SEED_TAG} Lisa Anderson`,
] as const;

const GST_RATE = 0.1;

function gst(subtotalCents: number): number {
  return Math.round(subtotalCents * GST_RATE);
}

function total(subtotalCents: number): number {
  return subtotalCents + gst(subtotalCents);
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ─────────────────────────────────────────────────────────────
// 6. Cleanup — delete existing demo data for this user
// ─────────────────────────────────────────────────────────────

async function cleanDemoData(userId: string): Promise<void> {
  console.log('🧹 Cleaning up existing demo data for this user...');

  // Invoices + their line items
  const { data: existingInvoices } = await db
    .from('invoices')
    .select('id')
    .eq('user_id', userId)
    .in('invoice_number', [...DEMO_INVOICE_NUMBERS]);

  if (existingInvoices && existingInvoices.length > 0) {
    const ids = existingInvoices.map((i) => i.id);
    await db.from('invoice_line_items').delete().in('invoice_id', ids);
    await db.from('invoices').delete().in('id', ids);
  }

  // Quotes + their rooms + surfaces
  const { data: existingQuotes } = await db
    .from('quotes')
    .select('id')
    .eq('user_id', userId)
    .in('quote_number', [...DEMO_QUOTE_NUMBERS]);

  if (existingQuotes && existingQuotes.length > 0) {
    const quoteIds = existingQuotes.map((q) => q.id);

    const { data: existingRooms } = await db
      .from('quote_rooms')
      .select('id')
      .in('quote_id', quoteIds);

    if (existingRooms && existingRooms.length > 0) {
      await db
        .from('quote_room_surfaces')
        .delete()
        .in('room_id', existingRooms.map((r) => r.id));
    }

    await db.from('quote_rooms').delete().in('quote_id', quoteIds);
    await db.from('quotes').delete().in('id', quoteIds);
  }

  // Customers
  const { data: existingCustomers } = await db
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .in('name', [...DEMO_CUSTOMER_NAMES]);

  if (existingCustomers && existingCustomers.length > 0) {
    await db
      .from('customers')
      .delete()
      .in('id', existingCustomers.map((c) => c.id));
  }

  console.log('   ✓ Done.\n');
}

// ─────────────────────────────────────────────────────────────
// 7. Seed helpers
// ─────────────────────────────────────────────────────────────

type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type QuoteInsert = Database['public']['Tables']['quotes']['Insert'];
type QuoteRoomInsert = Database['public']['Tables']['quote_rooms']['Insert'];
type QuoteRoomSurfaceInsert = Database['public']['Tables']['quote_room_surfaces']['Insert'];
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
type InvoiceLineItemInsert = Database['public']['Tables']['invoice_line_items']['Insert'];

interface RoomSpec {
  name: string;
  room_type: 'interior' | 'exterior';
  length_m: number | null;
  width_m: number | null;
  height_m: number | null;
  surfaces: Omit<QuoteRoomSurfaceInsert, 'room_id'>[];
}

async function seedCustomers(userId: string): Promise<string[]> {
  const rows: CustomerInsert[] = [
    {
      user_id: userId,
      name: `${SEED_TAG} Sarah Mitchell`,
      email: 'sarah.mitchell@demo.example.com',
      phone: '0412 345 678',
      address_line1: '42 Campbell Parade',
      city: 'Bondi Beach',
      state: 'NSW',
      postcode: '2026',
      notes: 'Prefers morning appointments. Has a dog.',
    },
    {
      user_id: userId,
      name: `${SEED_TAG} Tom Richardson`,
      email: 'tom.richardson@demo.example.com',
      phone: '0423 456 789',
      address_line1: '18 Crown Street',
      city: 'Surry Hills',
      state: 'NSW',
      postcode: '2010',
    },
    {
      user_id: userId,
      name: `${SEED_TAG} Emma Clarke`,
      email: 'emma.clarke@demo.example.com',
      phone: '0434 567 890',
      address_line1: '7 Sydney Road',
      city: 'Brunswick',
      state: 'VIC',
      postcode: '3056',
      notes: 'Renovating heritage cottage. Careful around original cornices.',
    },
    {
      user_id: userId,
      name: `${SEED_TAG} David Wong`,
      email: 'david.wong@demo.example.com',
      phone: '0445 678 901',
      address_line1: '123 Brunswick Street',
      city: 'Fortitude Valley',
      state: 'QLD',
      postcode: '4006',
    },
    {
      user_id: userId,
      name: `${SEED_TAG} Lisa Anderson`,
      email: 'lisa.anderson@demo.example.com',
      phone: '0456 789 012',
      address_line1: '55 South Terrace',
      city: 'Fremantle',
      state: 'WA',
      postcode: '6160',
      notes: 'Investment property — landlord not on-site. Key pickup arranged.',
    },
  ];

  const { data, error } = await db.from('customers').insert(rows).select('id');
  if (error) throw new Error(`Failed to create customers: ${error.message}`);
  if (!data || data.length === 0) throw new Error('No customer data returned');
  return data.map((c) => c.id);
}

async function seedQuote(
  quoteData: QuoteInsert,
  rooms: RoomSpec[],
): Promise<string> {
  const { data: quoteRows, error: qErr } = await db
    .from('quotes')
    .insert(quoteData)
    .select('id');
  if (qErr) throw new Error(`Failed to create quote ${quoteData.quote_number}: ${qErr.message}`);
  if (!quoteRows?.[0]) throw new Error('No quote row returned');
  const quoteId = quoteRows[0].id;

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];

    const roomInsert: QuoteRoomInsert = {
      quote_id: quoteId,
      name: room.name,
      room_type: room.room_type,
      length_m: room.length_m,
      width_m: room.width_m,
      height_m: room.height_m,
      sort_order: i,
    };

    const { data: roomRows, error: rErr } = await db
      .from('quote_rooms')
      .insert(roomInsert)
      .select('id');
    if (rErr) throw new Error(`Failed to create room "${room.name}": ${rErr.message}`);
    if (!roomRows?.[0]) throw new Error('No room row returned');
    const roomId = roomRows[0].id;

    const surfaces: QuoteRoomSurfaceInsert[] = room.surfaces.map((s) => ({
      ...s,
      room_id: roomId,
    }));

    const { error: sErr } = await db.from('quote_room_surfaces').insert(surfaces);
    if (sErr) throw new Error(`Failed to create surfaces for "${room.name}": ${sErr.message}`);
  }

  return quoteId;
}

type LineItemSpec = Omit<InvoiceLineItemInsert, 'invoice_id'>;

async function seedInvoice(
  invoiceData: InvoiceInsert,
  lineItems: LineItemSpec[],
): Promise<string> {
  const { data: invRows, error: iErr } = await db
    .from('invoices')
    .insert(invoiceData)
    .select('id');
  if (iErr)
    throw new Error(`Failed to create invoice ${invoiceData.invoice_number}: ${iErr.message}`);
  if (!invRows?.[0]) throw new Error('No invoice row returned');
  const invoiceId = invRows[0].id;

  const inserts: InvoiceLineItemInsert[] = lineItems.map((li, idx) => ({
    ...li,
    invoice_id: invoiceId,
    sort_order: li.sort_order ?? idx,
  }));

  const { error: liErr } = await db.from('invoice_line_items').insert(inserts);
  if (liErr) throw new Error(`Failed to create line items: ${liErr.message}`);

  return invoiceId;
}

// ─────────────────────────────────────────────────────────────
// 8. Main orchestration
// ─────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  // Resolve user ID (either passed directly or looked up by email)
  let userId = argUserId;

  if (!userId) {
    console.log(`🔍 Looking up user by email: ${argEmail} ...`);
    const { data: listData, error: listErr } = await db.auth.admin.listUsers({
      perPage: 1000,
    });
    if (listErr) throw new Error(`Failed to list users: ${listErr.message}`);
    const match = listData.users.find((u) => u.email === argEmail);
    if (!match) {
      console.error(`❌  No user found with email: ${argEmail}`);
      process.exit(1);
    }
    userId = match.id;
    console.log(`   ✓ Found user: ${userId}\n`);
  }

  console.log('🌱 Seeding demo data');
  console.log(`   User: ${userId}`);
  console.log('────────────────────────────────────────────────\n');

  await cleanDemoData(userId);

  // ── Customers ────────────────────────────────────────────
  console.log('👥 Creating 5 demo customers...');
  const customerIds = await seedCustomers(userId);
  console.log(`   ✓ ${customerIds.length} customers created.\n`);

  // ── Quotes ───────────────────────────────────────────────
  console.log('📋 Creating 3 demo quotes...');
  const quoteIds: string[] = [];

  // ----
  // DEMO-Q001  status=approved  | Interior repaint, 2 rooms
  // Sarah Mitchell, Bondi Beach
  //   Living Room   walls 45m²@$18  = $810   labour $720 material $90
  //                 ceiling 15m²@$20 = $300   labour $240 material $60
  //   Master Bedroom walls 30m²@$18  = $540   labour $480 material $60
  //   subtotal = $1,650  gst $165  total $1,815
  // ----
  const q1Subtotal = 165_000; // cents
  const q1Id = await seedQuote(
    {
      user_id: userId,
      customer_id: customerIds[0],
      quote_number: 'DEMO-Q001',
      title: 'Interior Repaint – Bondi Beach',
      status: 'approved',
      tier: 'standard',
      labour_margin_percent: 15,
      material_margin_percent: 10,
      subtotal_cents: q1Subtotal,
      gst_cents: gst(q1Subtotal),
      total_cents: total(q1Subtotal),
      valid_until: daysAgo(5),
      notes: 'Customer confirmed via email. Starting next Monday.',
      internal_notes: 'Use low-VOC Dulux Wash & Wear throughout.',
    },
    [
      {
        name: 'Living Room',
        room_type: 'interior',
        length_m: 6.5,
        width_m: 4.2,
        height_m: 2.7,
        surfaces: [
          {
            surface_type: 'walls',
            area_m2: 45,
            coating_type: 'repaint_2coat',
            rate_per_m2_cents: 1800,
            labour_cost_cents: 72_000,
            material_cost_cents: 9_000,
            tier: 'standard',
          },
          {
            surface_type: 'ceiling',
            area_m2: 15,
            coating_type: 'repaint_2coat',
            rate_per_m2_cents: 2000,
            labour_cost_cents: 24_000,
            material_cost_cents: 6_000,
            tier: 'standard',
          },
        ],
      },
      {
        name: 'Master Bedroom',
        room_type: 'interior',
        length_m: 4.5,
        width_m: 4.0,
        height_m: 2.7,
        surfaces: [
          {
            surface_type: 'walls',
            area_m2: 30,
            coating_type: 'repaint_2coat',
            rate_per_m2_cents: 1800,
            labour_cost_cents: 48_000,
            material_cost_cents: 6_000,
            tier: 'standard',
          },
        ],
      },
    ],
  );
  quoteIds.push(q1Id);

  // ----
  // DEMO-Q002  status=sent  | Kitchen & Bathroom refresh
  // Tom Richardson, Surry Hills
  //   Kitchen  walls 28m²@$18 = $504  trim 8m²@$35 = $280
  //   Bathroom walls 18m²@$18 = $324  ceiling 7m²@$20 = $140
  //   subtotal = $1,248  gst $124.80  total $1,372.80
  // ----
  const q2Subtotal = 124_800;
  const q2Id = await seedQuote(
    {
      user_id: userId,
      customer_id: customerIds[1],
      quote_number: 'DEMO-Q002',
      title: 'Kitchen & Bathroom Refresh',
      status: 'sent',
      tier: 'standard',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      subtotal_cents: q2Subtotal,
      gst_cents: gst(q2Subtotal),
      total_cents: total(q2Subtotal),
      valid_until: daysFromNow(25),
      notes: 'Quote sent. Please review and let us know if you have any questions.',
      internal_notes: 'Follow up Friday if no response.',
    },
    [
      {
        name: 'Kitchen',
        room_type: 'interior',
        length_m: 4.0,
        width_m: 3.0,
        height_m: 2.7,
        surfaces: [
          {
            surface_type: 'walls',
            area_m2: 28,
            coating_type: 'repaint_2coat',
            rate_per_m2_cents: 1800,
            labour_cost_cents: 44_800,
            material_cost_cents: 5_600,
            tier: 'standard',
          },
          {
            surface_type: 'trim',
            area_m2: 8,
            coating_type: 'repaint_2coat',
            rate_per_m2_cents: 3500,
            labour_cost_cents: 24_000,
            material_cost_cents: 4_000,
            tier: 'standard',
          },
        ],
      },
      {
        name: 'Bathroom',
        room_type: 'interior',
        length_m: 2.5,
        width_m: 2.0,
        height_m: 2.7,
        surfaces: [
          {
            surface_type: 'walls',
            area_m2: 18,
            coating_type: 'repaint_2coat',
            rate_per_m2_cents: 1800,
            labour_cost_cents: 28_800,
            material_cost_cents: 3_600,
            tier: 'standard',
          },
          {
            surface_type: 'ceiling',
            area_m2: 7,
            coating_type: 'repaint_2coat',
            rate_per_m2_cents: 2000,
            labour_cost_cents: 11_200,
            material_cost_cents: 2_800,
            tier: 'standard',
          },
        ],
      },
    ],
  );
  quoteIds.push(q2Id);

  // ----
  // DEMO-Q003  status=draft  | Full Exterior Repaint — premium job
  // Emma Clarke, Brunswick
  //   Exterior  walls 120m²@$30 = $3,600  trim 18m²@$45 = $810  fascia 14m²@$40 = $560
  //   subtotal = $4,970  gst $497  total $5,467
  // ----
  const q3Subtotal = 497_000;
  const q3Id = await seedQuote(
    {
      user_id: userId,
      customer_id: customerIds[2],
      quote_number: 'DEMO-Q003',
      title: 'Full Exterior Repaint – Brunswick Heritage Cottage',
      status: 'draft',
      tier: 'complex',
      labour_margin_percent: 20,
      material_margin_percent: 15,
      subtotal_cents: q3Subtotal,
      gst_cents: gst(q3Subtotal),
      total_cents: total(q3Subtotal),
      valid_until: daysFromNow(30),
      internal_notes: 'Draft — need to visit site for final measurements. Heritage overlay: check council regs on colour.',
    },
    [
      {
        name: 'Exterior — Full House',
        room_type: 'exterior',
        length_m: 14.0,
        width_m: null,
        height_m: 5.5,
        surfaces: [
          {
            surface_type: 'exterior_walls',
            area_m2: 120,
            coating_type: 'repaint_2coat',
            rate_per_m2_cents: 3000,
            labour_cost_cents: 288_000,
            material_cost_cents: 72_000,
            tier: 'complex',
          },
          {
            surface_type: 'exterior_trim',
            area_m2: 18,
            coating_type: 'repaint_2coat',
            rate_per_m2_cents: 4500,
            labour_cost_cents: 64_800,
            material_cost_cents: 16_200,
            tier: 'complex',
          },
          {
            surface_type: 'fascia',
            area_m2: 14,
            coating_type: 'repaint_2coat',
            rate_per_m2_cents: 4000,
            labour_cost_cents: 44_800,
            material_cost_cents: 11_200,
            tier: 'complex',
          },
        ],
      },
    ],
  );
  quoteIds.push(q3Id);

  console.log(`   ✓ ${quoteIds.length} quotes created.\n`);

  // ── Invoices ─────────────────────────────────────────────
  console.log('🧾 Creating 2 demo invoices...');
  const invoiceIds: string[] = [];

  // ----
  // DEMO-I001  status=paid  | Full invoice for Q001 (approved job)
  // subtotal $1,650  gst $165  total $1,815
  // ----
  const i1Subtotal = q1Subtotal;
  const i1Id = await seedInvoice(
    {
      user_id: userId,
      customer_id: customerIds[0],
      quote_id: q1Id,
      invoice_number: 'DEMO-I001',
      status: 'paid',
      invoice_type: 'full',
      subtotal_cents: i1Subtotal,
      gst_cents: gst(i1Subtotal),
      total_cents: total(i1Subtotal),
      amount_paid_cents: total(i1Subtotal),
      paid_at: daysAgo(2),
      due_date: daysAgo(10),
      notes: 'Thank you for your business!',
    },
    [
      {
        description: 'Living Room — Walls (2 coat repaint, 45 m²)',
        quantity: 1,
        unit_price_cents: 81_000,
        gst_cents: gst(81_000),
        total_cents: 81_000,
        sort_order: 0,
      },
      {
        description: 'Living Room — Ceiling (2 coat repaint, 15 m²)',
        quantity: 1,
        unit_price_cents: 30_000,
        gst_cents: gst(30_000),
        total_cents: 30_000,
        sort_order: 1,
      },
      {
        description: 'Master Bedroom — Walls (2 coat repaint, 30 m²)',
        quantity: 1,
        unit_price_cents: 54_000,
        gst_cents: gst(54_000),
        total_cents: 54_000,
        sort_order: 2,
      },
    ],
  );
  invoiceIds.push(i1Id);

  // ----
  // DEMO-I002  status=sent  | 50% deposit invoice for Q002 (sent quote)
  // subtotal $624  gst $62.40  total $686.40
  // ----
  const depositSubtotal = Math.round(q2Subtotal / 2); // 62_400
  const i2Id = await seedInvoice(
    {
      user_id: userId,
      customer_id: customerIds[1],
      quote_id: q2Id,
      invoice_number: 'DEMO-I002',
      status: 'sent',
      invoice_type: 'deposit',
      subtotal_cents: depositSubtotal,
      gst_cents: gst(depositSubtotal),
      total_cents: total(depositSubtotal),
      amount_paid_cents: 0,
      due_date: daysFromNow(7),
      notes: '50% deposit is required before work commences. Balance due on completion.',
    },
    [
      {
        description: '50% Deposit — Kitchen & Bathroom Refresh',
        quantity: 1,
        unit_price_cents: depositSubtotal,
        gst_cents: gst(depositSubtotal),
        total_cents: depositSubtotal,
        sort_order: 0,
      },
    ],
  );
  invoiceIds.push(i2Id);

  console.log(`   ✓ ${invoiceIds.length} invoices created.\n`);

  // ── Summary ───────────────────────────────────────────────
  console.log('════════════════════════════════════════════════');
  console.log('✅  Demo data seeded successfully!\n');
  console.log('📊  Summary');
  console.log(
    `    Customers  (${customerIds.length})\n` +
      customerIds.map((id, i) => `      [${i + 1}] ${id}`).join('\n'),
  );
  console.log(
    `\n    Quotes     (${quoteIds.length})\n` +
      quoteIds
        .map((id, i) => `      [${DEMO_QUOTE_NUMBERS[i]}] ${id}`)
        .join('\n'),
  );
  console.log(
    `\n    Invoices   (${invoiceIds.length})\n` +
      invoiceIds
        .map((id, i) => `      [${DEMO_INVOICE_NUMBERS[i]}] ${id}`)
        .join('\n'),
  );
  console.log(
    '\n🏷️   All demo records are tagged "[DEMO_SEED]" or use DEMO-* numbers.',
  );
  console.log('    Re-run this script to wipe and re-seed for the same user.\n');
}

run().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\n❌  Seed failed:', message);
  process.exit(1);
});
