create or replace function public.check_job_date_overlap(
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
  p_exclude_job_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'anon' then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if auth.role() = 'authenticated' and auth.uid() is distinct from p_user_id then
    raise exception 'You can only check your own job dates.' using errcode = '42501';
  end if;

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
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'anon' then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if auth.role() = 'authenticated' and auth.uid() is distinct from p_user_id then
    raise exception 'You can only check your own job dates.' using errcode = '42501';
  end if;

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
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'anon' then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if auth.role() = 'authenticated' and auth.uid() is distinct from p_user_id then
    raise exception 'You can only read your own blocked dates.' using errcode = '42501';
  end if;

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

revoke execute on function public.check_job_date_overlap(uuid, date, date, uuid) from public;
revoke execute on function public.check_job_schedule_dates_overlap(uuid, date[], uuid) from public;
revoke execute on function public.get_blocked_dates_for_user(uuid, date, date) from public;
revoke execute on function public.generate_quote_number(uuid) from public;
revoke execute on function public.generate_invoice_number(uuid) from public;
revoke execute on function public.calculate_quote_totals(uuid) from public;
revoke execute on function public.calculate_invoice_totals(uuid) from public;
revoke execute on function public.get_user_active_quote_count(uuid) from public;
revoke execute on function public.update_invoice_with_line_items(uuid, uuid, jsonb, jsonb) from public;

grant execute on function public.check_job_date_overlap(uuid, date, date, uuid) to authenticated, service_role;
grant execute on function public.check_job_schedule_dates_overlap(uuid, date[], uuid) to authenticated, service_role;
grant execute on function public.get_blocked_dates_for_user(uuid, date, date) to authenticated, service_role;
grant execute on function public.generate_quote_number(uuid) to authenticated, service_role;
grant execute on function public.generate_invoice_number(uuid) to authenticated, service_role;
grant execute on function public.calculate_quote_totals(uuid) to authenticated, service_role;
grant execute on function public.calculate_invoice_totals(uuid) to authenticated, service_role;
grant execute on function public.get_user_active_quote_count(uuid) to authenticated, service_role;
grant execute on function public.update_invoice_with_line_items(uuid, uuid, jsonb, jsonb) to authenticated, service_role;

create index if not exists invoice_reminder_events_invoice_user_idx
  on public.invoice_reminder_events (invoice_id, user_id);
create index if not exists invoices_customer_user_idx
  on public.invoices (customer_id, user_id);
create index if not exists invoices_quote_id_idx
  on public.invoices (quote_id);
create index if not exists jobs_customer_user_idx
  on public.jobs (customer_id, user_id);
create index if not exists jobs_quote_id_idx
  on public.jobs (quote_id);
create index if not exists public_quote_events_quote_user_idx
  on public.public_quote_events (quote_id, user_id);
create index if not exists quote_line_items_material_item_id_idx
  on public.quote_line_items (material_item_id);
create index if not exists quotes_customer_user_idx
  on public.quotes (customer_id, user_id);
