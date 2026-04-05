-- Jobs workspace: track scheduled work linked to customers and quotes
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null,
  quote_id uuid null,
  title text not null,
  status text not null default 'scheduled',
  scheduled_date date not null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_status_check
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_customer_user_fk'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_customer_user_fk
      foreign key (customer_id, user_id)
      references public.customers (id, user_id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_quote_id_fkey'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_quote_id_fkey
      foreign key (quote_id)
      references public.quotes (id)
      on delete set null;
  end if;
end $$;

create index if not exists jobs_user_id_scheduled_date_idx
  on public.jobs (user_id, scheduled_date);

create index if not exists jobs_user_id_status_idx
  on public.jobs (user_id, status);

create or replace function public.enforce_job_quote_ownership()
returns trigger
language plpgsql
as $$
declare
  matched_quote record;
begin
  if new.quote_id is null then
    return new;
  end if;

  select id, customer_id, user_id
  into matched_quote
  from public.quotes
  where id = new.quote_id;

  if matched_quote is null then
    return new;
  end if;

  if matched_quote.user_id <> new.user_id then
    raise exception 'Job quote must belong to the same user.'
      using errcode = '23514';
  end if;

  if matched_quote.customer_id <> new.customer_id then
    raise exception 'Job quote must belong to the selected customer.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists jobs_enforce_quote_ownership on public.jobs;

create trigger jobs_enforce_quote_ownership
  before insert or update on public.jobs
  for each row
  execute function public.enforce_job_quote_ownership();

drop trigger if exists set_jobs_updated_at on public.jobs;

create trigger set_jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'users can only access their own jobs'
  ) then
    create policy "users can only access their own jobs"
      on public.jobs for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

comment on function public.enforce_job_quote_ownership() is
  'Prevents jobs from referencing quotes owned by another account or a different customer.';
