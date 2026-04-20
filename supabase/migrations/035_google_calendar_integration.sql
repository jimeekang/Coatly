-- Google Calendar integration (Option B)
-- Stores one Google Calendar connection per Coatly user and links booked jobs
-- to created Google Calendar events.

create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_account_email text not null,
  google_account_subject text not null,
  encrypted_refresh_token text not null,
  granted_scopes text[] not null default '{}',
  is_active boolean not null default true,
  last_sync_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.google_calendar_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_calendar_id text not null default 'primary',
  availability_calendar_id text not null default 'primary',
  event_destination_calendar_id text not null default 'primary',
  timezone text not null default 'Australia/Sydney',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.jobs
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_id text,
  add column if not exists schedule_source text not null default 'manual',
  add column if not exists google_sync_status text not null default 'not_synced',
  add column if not exists google_sync_error text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_schedule_source_check'
  ) then
    alter table public.jobs
      add constraint jobs_schedule_source_check
      check (schedule_source in ('manual', 'google_booking_sync'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_google_sync_status_check'
  ) then
    alter table public.jobs
      add constraint jobs_google_sync_status_check
      check (google_sync_status in ('not_synced', 'synced', 'failed'));
  end if;
end $$;

create index if not exists jobs_user_id_google_calendar_event_id_idx
  on public.jobs (user_id, google_calendar_event_id);

create or replace function public.set_google_calendar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists google_calendar_connections_set_updated_at
  on public.google_calendar_connections;
create trigger google_calendar_connections_set_updated_at
before update on public.google_calendar_connections
for each row execute procedure public.set_google_calendar_updated_at();

drop trigger if exists google_calendar_settings_set_updated_at
  on public.google_calendar_settings;
create trigger google_calendar_settings_set_updated_at
before update on public.google_calendar_settings
for each row execute procedure public.set_google_calendar_updated_at();

alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_settings enable row level security;

drop policy if exists "users can only see their own google calendar connections"
  on public.google_calendar_connections;
create policy "users can only see their own google calendar connections"
  on public.google_calendar_connections
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users can only see their own google calendar settings"
  on public.google_calendar_settings;
create policy "users can only see their own google calendar settings"
  on public.google_calendar_settings
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
