alter table public.quotes
  add column if not exists estimate_category text not null default 'manual'
    check (estimate_category in ('manual', 'interior')),
  add column if not exists property_type text
    check (property_type in ('apartment', 'house')),
  add column if not exists estimate_mode text
    check (estimate_mode in ('entire_property', 'specific_areas')),
  add column if not exists estimate_context jsonb not null default '{}'::jsonb,
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb;

create table if not exists public.quote_estimate_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  category text not null
    check (category in ('entire_property', 'room', 'door', 'window', 'skirting', 'modifier')),
  label text not null,
  quantity numeric(10,2) not null default 1,
  unit text not null default 'item',
  unit_price_cents integer not null default 0,
  total_cents integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quote_estimate_items_quote_id
  on public.quote_estimate_items(quote_id, sort_order);

create trigger quote_estimate_items_updated_at
  before update on public.quote_estimate_items
  for each row execute function public.update_updated_at_column();

alter table public.quote_estimate_items enable row level security;

create policy "quote_estimate_items: 본인 데이터 조회"
  on public.quote_estimate_items for select
  using (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_estimate_items.quote_id
        and quotes.user_id = auth.uid()
    )
  );

create policy "quote_estimate_items: 본인 데이터 생성"
  on public.quote_estimate_items for insert
  with check (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_estimate_items.quote_id
        and quotes.user_id = auth.uid()
    )
  );

create policy "quote_estimate_items: 본인 데이터 수정"
  on public.quote_estimate_items for update
  using (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_estimate_items.quote_id
        and quotes.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_estimate_items.quote_id
        and quotes.user_id = auth.uid()
    )
  );

create policy "quote_estimate_items: 본인 데이터 삭제"
  on public.quote_estimate_items for delete
  using (
    exists (
      select 1
      from public.quotes
      where quotes.id = quote_estimate_items.quote_id
        and quotes.user_id = auth.uid()
    )
  );
