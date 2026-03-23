-- ============================================================
-- 006_businesses.sql
-- Dedicated business profile table for the authenticated owner
-- ============================================================

create table if not exists public.businesses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  abn text,
  address text,
  phone text,
  email text,
  logo_url text,
  default_rates jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_default_rates_is_object
    check (jsonb_typeof(default_rates) = 'object')
);

comment on table public.businesses is
  'Business profile owned by the authenticated user. Stores invoice/quote business identity and default pricing presets.';

comment on column public.businesses.default_rates is
  'JSON object for saved default pricing presets, for example {"good":25,"better":35,"best":45}.';

create index if not exists idx_businesses_email on public.businesses(email);

drop trigger if exists businesses_updated_at on public.businesses;
create trigger businesses_updated_at
  before update on public.businesses
  for each row execute function update_updated_at_column();

alter table public.businesses enable row level security;

drop policy if exists "businesses: own select" on public.businesses;
create policy "businesses: own select"
  on public.businesses for select
  using (user_id = auth.uid());

drop policy if exists "businesses: own insert" on public.businesses;
create policy "businesses: own insert"
  on public.businesses for insert
  with check (user_id = auth.uid());

drop policy if exists "businesses: own update" on public.businesses;
create policy "businesses: own update"
  on public.businesses for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "businesses: own delete" on public.businesses;
create policy "businesses: own delete"
  on public.businesses for delete
  using (user_id = auth.uid());

insert into public.businesses (
  user_id,
  name,
  abn,
  address,
  phone,
  email,
  logo_url,
  default_rates
)
select
  p.user_id,
  p.business_name,
  p.abn,
  nullif(
    concat_ws(
      ', ',
      nullif(trim(p.address_line1), ''),
      nullif(trim(p.city), ''),
      nullif(trim(p.state), ''),
      nullif(trim(p.postcode), '')
    ),
    ''
  ) as address,
  p.phone,
  p.email,
  p.logo_url,
  '{}'::jsonb
from public.profiles p
on conflict (user_id) do update
set
  name = excluded.name,
  abn = excluded.abn,
  address = coalesce(businesses.address, excluded.address),
  phone = excluded.phone,
  email = excluded.email,
  logo_url = excluded.logo_url,
  updated_at = now();
