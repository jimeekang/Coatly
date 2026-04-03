-- Migration 019: material_items + quote_line_items
-- material_items: reusable library of materials/services per business
-- quote_line_items: items added to a quote from the library or custom

-- ─── 1. material_item_category enum ──────────────────────────────────────────

create type public.material_item_category as enum (
  'paint',
  'primer',
  'supply',
  'service',
  'other'
);

-- ─── 2. material_items table ──────────────────────────────────────────────────

create table public.material_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null check (char_length(trim(name)) > 0),
  category         public.material_item_category not null default 'other',
  unit             text not null default 'item' check (char_length(trim(unit)) > 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0),
  notes            text,
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.material_items is
  'Reusable material and service rate cards saved per user/business.';

-- ─── 3. quote_line_items table ────────────────────────────────────────────────

create table public.quote_line_items (
  id                  uuid primary key default gen_random_uuid(),
  quote_id            uuid not null references public.quotes(id) on delete cascade,
  material_item_id    uuid references public.material_items(id) on delete set null,
  name                text not null check (char_length(trim(name)) > 0),
  category            public.material_item_category not null default 'other',
  unit                text not null default 'item',
  quantity            numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_cents    integer not null default 0 check (unit_price_cents >= 0),
  total_cents         integer not null default 0 check (total_cents >= 0),
  notes               text,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.quote_line_items is
  'Materials and services added to a quote as a separate line-item section.';
comment on column public.quote_line_items.material_item_id is
  'NULL when the item was entered manually (not from the library).';

-- ─── 4. updated_at triggers ───────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger material_items_updated_at
  before update on public.material_items
  for each row execute function public.set_updated_at();

create trigger quote_line_items_updated_at
  before update on public.quote_line_items
  for each row execute function public.set_updated_at();

-- ─── 5. indexes ───────────────────────────────────────────────────────────────

create index material_items_user_id_idx on public.material_items (user_id);
create index material_items_category_idx on public.material_items (user_id, category);
create index quote_line_items_quote_id_idx on public.quote_line_items (quote_id);

-- ─── 6. RLS ───────────────────────────────────────────────────────────────────

alter table public.material_items enable row level security;
alter table public.quote_line_items enable row level security;

-- material_items: users can only see/modify their own items
create policy "material_items: owner select"
  on public.material_items for select
  using (user_id = auth.uid());

create policy "material_items: owner insert"
  on public.material_items for insert
  with check (user_id = auth.uid());

create policy "material_items: owner update"
  on public.material_items for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "material_items: owner delete"
  on public.material_items for delete
  using (user_id = auth.uid());

-- quote_line_items: users can only access line items on their own quotes
create policy "quote_line_items: owner select"
  on public.quote_line_items for select
  using (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_line_items.quote_id
        and quotes.user_id = auth.uid()
    )
  );

create policy "quote_line_items: owner insert"
  on public.quote_line_items for insert
  with check (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_line_items.quote_id
        and quotes.user_id = auth.uid()
    )
  );

create policy "quote_line_items: owner update"
  on public.quote_line_items for update
  using (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_line_items.quote_id
        and quotes.user_id = auth.uid()
    )
  );

create policy "quote_line_items: owner delete"
  on public.quote_line_items for delete
  using (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_line_items.quote_id
        and quotes.user_id = auth.uid()
    )
  );
