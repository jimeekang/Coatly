-- Task 4: Quote form structure schema for customer-visible scope, clauses,
-- and AI intake snapshots. Pricing stays in existing deterministic quote rows.

alter table public.quotes
  add column if not exists job_type text not null default 'interior';

alter table public.quotes
  drop constraint if exists quotes_job_type_check;

alter table public.quotes
  add constraint quotes_job_type_check
    check (job_type in ('interior', 'exterior', 'both', 'maintenance'));

alter table public.quotes
  drop constraint if exists quotes_estimate_category_check;

alter table public.quotes
  add constraint quotes_estimate_category_check
    check (estimate_category in ('manual', 'interior', 'exterior', 'maintenance'));

create table if not exists public.quote_scope_sections (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  section_kind text not null
    check (section_kind in ('interior', 'exterior', 'maintenance', 'general', 'optional')),
  title text not null check (char_length(trim(title)) > 0),
  description text,
  area_label text,
  surface_category text,
  is_optional boolean not null default false,
  is_selected boolean not null default true,
  pricing_status text not null default 'unpriced'
    check (pricing_status in ('unpriced', 'priced', 'included', 'excluded', 'allowance', 'to_confirm')),
  measurement_status text not null default 'to_confirm'
    check (measurement_status in ('confirmed', 'rough', 'photo_hint', 'to_confirm')),
  source text not null default 'manual'
    check (source in ('manual', 'ai', 'template', 'legacy_quote')),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_scope_sections_metadata_no_price_fields
    check (not (metadata ?| array[
      'rate',
      'rates',
      'rate_cents',
      'unit_price',
      'unit_price_cents',
      'price',
      'price_cents',
      'subtotal',
      'subtotal_cents',
      'gst',
      'gst_cents',
      'total',
      'total_cents',
      'daily_rate',
      'daily_rate_cents'
    ]))
);

create table if not exists public.quote_scope_steps (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.quote_scope_sections(id) on delete cascade,
  label text,
  step_type text not null default 'special_note'
    check (step_type in ('prep', 'primer', 'topcoat', 'repair', 'paint_system', 'colour_note', 'special_note', 'exclusion_note')),
  description text not null check (char_length(trim(description)) > 0),
  prep_type text,
  paint_system text,
  coats_min integer check (coats_min is null or coats_min >= 0),
  coats_max integer check (coats_max is null or coats_max >= 0),
  product_name text,
  colour_status text
    check (colour_status is null or colour_status in ('confirmed', 'partial', 'to_confirm', 'not_applicable')),
  colour text,
  sheen text,
  requires_confirmation boolean not null default false,
  is_customer_visible boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_scope_steps_coat_order
    check (coats_min is null or coats_max is null or coats_max >= coats_min),
  constraint quote_scope_steps_metadata_no_price_fields
    check (not (metadata ?| array[
      'rate',
      'rates',
      'rate_cents',
      'unit_price',
      'unit_price_cents',
      'price',
      'price_cents',
      'subtotal',
      'subtotal_cents',
      'gst',
      'gst_cents',
      'total',
      'total_cents',
      'daily_rate',
      'daily_rate_cents'
    ]))
);

create table if not exists public.quote_clause_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  section_id uuid references public.quote_scope_sections(id) on delete set null,
  clause_key text not null check (char_length(trim(clause_key)) > 0),
  title text not null check (char_length(trim(title)) > 0),
  body text not null check (char_length(trim(body)) > 0),
  category text not null
    check (category in ('inclusion', 'exclusion', 'risk_disclosure', 'warranty', 'payment', 'validity', 'insurance', 'brand_proof')),
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'critical')),
  source text not null default 'manual'
    check (source in ('manual', 'ai', 'template', 'default_library', 'legacy_quote')),
  is_customer_visible boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_clause_items_metadata_no_price_fields
    check (not (metadata ?| array[
      'rate',
      'rates',
      'rate_cents',
      'unit_price',
      'unit_price_cents',
      'price',
      'price_cents',
      'subtotal',
      'subtotal_cents',
      'gst',
      'gst_cents',
      'total',
      'total_cents',
      'daily_rate',
      'daily_rate_cents'
    ]))
);

create table if not exists public.quote_ai_intake_snapshots (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  painter_user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null
    check (job_type in ('interior', 'exterior', 'both', 'maintenance')),
  maintenance_job_pack text,
  provider text not null check (char_length(trim(provider)) > 0),
  model text not null check (char_length(trim(model)) > 0),
  prompt_version text not null check (char_length(trim(prompt_version)) > 0),
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  photo_refs jsonb not null default '[]'::jsonb,
  price_rates_snapshot_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint quote_ai_intake_output_no_price_fields
    check (not (output_json ?| array[
      'rate',
      'rates',
      'rate_cents',
      'unit_price',
      'unit_price_cents',
      'price',
      'price_cents',
      'subtotal',
      'subtotal_cents',
      'gst',
      'gst_cents',
      'total',
      'total_cents',
      'daily_rate',
      'daily_rate_cents'
    ]))
);

alter table public.quote_estimate_items
  add column if not exists scope_section_id uuid references public.quote_scope_sections(id) on delete set null;

alter table public.quote_line_items
  add column if not exists scope_section_id uuid references public.quote_scope_sections(id) on delete set null;

create index if not exists idx_quote_scope_sections_quote_id
  on public.quote_scope_sections(quote_id, sort_order);

create index if not exists idx_quote_scope_steps_section_id
  on public.quote_scope_steps(section_id, sort_order);

create index if not exists idx_quote_clause_items_quote_id
  on public.quote_clause_items(quote_id, sort_order);

create index if not exists idx_quote_ai_intake_snapshots_quote_id
  on public.quote_ai_intake_snapshots(quote_id, created_at desc);

create index if not exists idx_quote_estimate_items_scope_section_id
  on public.quote_estimate_items(scope_section_id);

create index if not exists idx_quote_line_items_scope_section_id
  on public.quote_line_items(scope_section_id);

create trigger quote_scope_sections_updated_at
  before update on public.quote_scope_sections
  for each row execute function public.update_updated_at_column();

create trigger quote_scope_steps_updated_at
  before update on public.quote_scope_steps
  for each row execute function public.update_updated_at_column();

create trigger quote_clause_items_updated_at
  before update on public.quote_clause_items
  for each row execute function public.update_updated_at_column();

alter table public.quote_scope_sections enable row level security;
alter table public.quote_scope_steps enable row level security;
alter table public.quote_clause_items enable row level security;
alter table public.quote_ai_intake_snapshots enable row level security;

grant select, insert, update, delete on public.quote_scope_sections to authenticated;
grant select, insert, update, delete on public.quote_scope_steps to authenticated;
grant select, insert, update, delete on public.quote_clause_items to authenticated;
grant select, insert, update, delete on public.quote_ai_intake_snapshots to authenticated;
grant all on public.quote_scope_sections to service_role;
grant all on public.quote_scope_steps to service_role;
grant all on public.quote_clause_items to service_role;
grant all on public.quote_ai_intake_snapshots to service_role;

create policy "quote_scope_sections: owner select"
  on public.quote_scope_sections for select
  using (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_scope_sections.quote_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_scope_sections: owner insert"
  on public.quote_scope_sections for insert
  with check (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_scope_sections.quote_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_scope_sections: owner update"
  on public.quote_scope_sections for update
  using (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_scope_sections.quote_id
        and quotes.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_scope_sections.quote_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_scope_sections: owner delete"
  on public.quote_scope_sections for delete
  using (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_scope_sections.quote_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_scope_steps: owner select"
  on public.quote_scope_steps for select
  using (
    exists (
      select 1
      from public.quote_scope_sections
      join public.quotes on quotes.id = quote_scope_sections.quote_id
      where quote_scope_sections.id = quote_scope_steps.section_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_scope_steps: owner insert"
  on public.quote_scope_steps for insert
  with check (
    exists (
      select 1
      from public.quote_scope_sections
      join public.quotes on quotes.id = quote_scope_sections.quote_id
      where quote_scope_sections.id = quote_scope_steps.section_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_scope_steps: owner update"
  on public.quote_scope_steps for update
  using (
    exists (
      select 1
      from public.quote_scope_sections
      join public.quotes on quotes.id = quote_scope_sections.quote_id
      where quote_scope_sections.id = quote_scope_steps.section_id
        and quotes.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.quote_scope_sections
      join public.quotes on quotes.id = quote_scope_sections.quote_id
      where quote_scope_sections.id = quote_scope_steps.section_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_scope_steps: owner delete"
  on public.quote_scope_steps for delete
  using (
    exists (
      select 1
      from public.quote_scope_sections
      join public.quotes on quotes.id = quote_scope_sections.quote_id
      where quote_scope_sections.id = quote_scope_steps.section_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_clause_items: owner select"
  on public.quote_clause_items for select
  using (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_clause_items.quote_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_clause_items: owner insert"
  on public.quote_clause_items for insert
  with check (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_clause_items.quote_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_clause_items: owner update"
  on public.quote_clause_items for update
  using (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_clause_items.quote_id
        and quotes.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_clause_items.quote_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_clause_items: owner delete"
  on public.quote_clause_items for delete
  using (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_clause_items.quote_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_ai_intake_snapshots: owner select"
  on public.quote_ai_intake_snapshots for select
  using (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_ai_intake_snapshots.quote_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_ai_intake_snapshots: owner insert"
  on public.quote_ai_intake_snapshots for insert
  with check (
    painter_user_id = (select auth.uid())
    and exists (
      select 1
      from public.quotes
      where quotes.id = quote_ai_intake_snapshots.quote_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_ai_intake_snapshots: owner update"
  on public.quote_ai_intake_snapshots for update
  using (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_ai_intake_snapshots.quote_id
        and quotes.user_id = (select auth.uid())
    )
  )
  with check (
    painter_user_id = (select auth.uid())
    and exists (
      select 1
      from public.quotes
      where quotes.id = quote_ai_intake_snapshots.quote_id
        and quotes.user_id = (select auth.uid())
    )
  );

create policy "quote_ai_intake_snapshots: owner delete"
  on public.quote_ai_intake_snapshots for delete
  using (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_ai_intake_snapshots.quote_id
        and quotes.user_id = (select auth.uid())
    )
  );
