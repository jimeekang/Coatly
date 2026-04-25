-- Schedule native events and current active quote counting semantics.

create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  start_time time null,
  end_time time null,
  is_all_day boolean not null default true,
  location text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedule_events_user_id_date_idx
  on public.schedule_events (user_id, date);

create index if not exists schedule_events_user_id_created_at_idx
  on public.schedule_events (user_id, created_at);

drop trigger if exists set_schedule_events_updated_at on public.schedule_events;

create trigger set_schedule_events_updated_at
  before update on public.schedule_events
  for each row execute function public.set_updated_at();

alter table public.schedule_events enable row level security;

drop policy if exists "users can only access their own schedule events"
  on public.schedule_events;

create policy "users can only access their own schedule events"
  on public.schedule_events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table public.schedule_events is
  'Native schedule events manually created by a Coatly user.';

create or replace function public.get_user_active_quote_count(user_uuid uuid)
returns integer
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result_count integer;
begin
  if auth.uid() is distinct from user_uuid then
    raise exception 'You can only read active quote counts for your own account.'
      using errcode = '42501';
  end if;

  select count(*)::integer
  into result_count
  from public.quotes
  where user_id = user_uuid
    and status in ('draft', 'sent', 'approved')
    and date_trunc('month', created_at) = date_trunc('month', now());

  return result_count;
end;
$$;

comment on function public.get_user_active_quote_count(uuid) is
  'Returns the current month active quote count (draft/sent/approved) for Starter plan limits.';
