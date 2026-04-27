-- Per-day job schedule support.
-- Keeps jobs.start_date/end_date as summary fields while allowing individual work days to move.

create table if not exists public.job_schedule_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  date date not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_schedule_days_job_date_unique unique (job_id, date)
);

create index if not exists job_schedule_days_user_id_date_idx
  on public.job_schedule_days (user_id, date);

create index if not exists job_schedule_days_job_id_date_idx
  on public.job_schedule_days (job_id, date);

drop trigger if exists set_job_schedule_days_updated_at on public.job_schedule_days;

create trigger set_job_schedule_days_updated_at
  before update on public.job_schedule_days
  for each row execute function public.set_updated_at();

create or replace function public.enforce_job_schedule_day_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.jobs j
    where j.id = new.job_id
      and j.user_id = new.user_id
  ) then
    raise exception 'Job schedule day must belong to the same user as its job.'
      using errcode = '23503';
  end if;

  return new;
end;
$$;

drop trigger if exists job_schedule_days_enforce_owner on public.job_schedule_days;

create trigger job_schedule_days_enforce_owner
  before insert or update on public.job_schedule_days
  for each row execute function public.enforce_job_schedule_day_owner();

alter table public.job_schedule_days enable row level security;

drop policy if exists "users can only access their own job schedule days"
  on public.job_schedule_days;

create policy "users can only access their own job schedule days"
  on public.job_schedule_days for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into public.job_schedule_days (user_id, job_id, date, sort_order)
select
  j.user_id,
  j.id,
  generated.day::date,
  row_number() over (partition by j.id order by generated.day)::integer - 1
from public.jobs j
cross join lateral generate_series(
  coalesce(j.start_date, j.scheduled_date),
  coalesce(j.end_date, j.start_date, j.scheduled_date),
  interval '1 day'
) as generated(day)
on conflict (job_id, date) do nothing;

create or replace function public.check_job_date_overlap(
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
  p_exclude_job_id uuid default null
)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from public.job_schedule_days jsd
    join public.jobs j on j.id = jsd.job_id
    where jsd.user_id = p_user_id
      and jsd.date between p_start_date and p_end_date
      and (jsd.job_id != p_exclude_job_id or p_exclude_job_id is null)
      and j.status not in ('cancelled', 'completed')
  )
  or exists (
    select 1
    from public.jobs j
    where j.user_id = p_user_id
      and j.start_date is not null
      and j.end_date is not null
      and (j.id != p_exclude_job_id or p_exclude_job_id is null)
      and j.status not in ('cancelled', 'completed')
      and not exists (
        select 1
        from public.job_schedule_days existing_days
        where existing_days.job_id = j.id
      )
      and (j.start_date, j.end_date + interval '1 day') overlaps (p_start_date, p_end_date + interval '1 day')
  );
end;
$$;

create or replace function public.check_job_schedule_dates_overlap(
  p_user_id uuid,
  p_dates date[],
  p_exclude_job_id uuid default null
)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from public.job_schedule_days jsd
    join public.jobs j on j.id = jsd.job_id
    where jsd.user_id = p_user_id
      and jsd.date = any(p_dates)
      and (jsd.job_id != p_exclude_job_id or p_exclude_job_id is null)
      and j.status not in ('cancelled', 'completed')
  );
end;
$$;

create or replace function public.get_blocked_dates_for_user(
  p_user_id uuid,
  p_from_date date default current_date,
  p_to_date date default current_date + interval '90 days'
)
returns table(blocked_date date)
language plpgsql
security definer
as $$
begin
  return query
  select distinct jsd.date
  from public.job_schedule_days jsd
  join public.jobs j on j.id = jsd.job_id
  where jsd.user_id = p_user_id
    and jsd.date between p_from_date and p_to_date
    and j.status not in ('cancelled', 'completed')

  union

  select generate_series(j.start_date, j.end_date, interval '1 day')::date
  from public.jobs j
  where j.user_id = p_user_id
    and j.start_date is not null
    and j.end_date is not null
    and j.status not in ('cancelled', 'completed')
    and j.start_date <= p_to_date
    and j.end_date >= p_from_date
    and not exists (
      select 1
      from public.job_schedule_days jsd
      where jsd.job_id = j.id
    );
end;
$$;

comment on table public.job_schedule_days is
  'Per-day schedule dates for jobs. Allows one day of a multi-day job to move independently.';

comment on function public.check_job_schedule_dates_overlap is
  'Checks if any requested schedule dates overlap another active job for a user.';
