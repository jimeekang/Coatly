create schema if not exists extensions;
do $$
begin
  if exists (select 1 from pg_extension where extname = 'btree_gist') then
    alter extension btree_gist set schema extensions;
  end if;
end $$;

alter function public.generate_quote_number(uuid) security invoker;
alter function public.generate_invoice_number(uuid) security invoker;
alter function public.calculate_quote_totals(uuid) security invoker;
alter function public.calculate_invoice_totals(uuid) security invoker;
alter function public.get_user_active_quote_count(uuid) security invoker;
alter function public.check_job_date_overlap(uuid, date, date, uuid) security invoker;
alter function public.check_job_schedule_dates_overlap(uuid, date[], uuid) security invoker;
alter function public.get_blocked_dates_for_user(uuid, date, date) security invoker;
alter function public.update_invoice_with_line_items(uuid, uuid, jsonb, jsonb) security invoker;

do $$
declare
  policy_record record;
  using_expr text;
  check_expr text;
  role_expr text;
begin
  for policy_record in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
      and (
        coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%'
      )
  loop
    using_expr := replace(policy_record.qual, 'auth.uid()', '(select auth.uid())');
    check_expr := replace(policy_record.with_check, 'auth.uid()', '(select auth.uid())');

    select string_agg(format('%I', role_name), ', ')
    into role_expr
    from unnest(policy_record.roles) as role_name;

    execute format(
      'drop policy %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );

    execute concat(
      format(
        'create policy %I on %I.%I as %s for %s to %s',
        policy_record.policyname,
        policy_record.schemaname,
        policy_record.tablename,
        policy_record.permissive,
        policy_record.cmd,
        role_expr
      ),
      case when using_expr is not null then format(' using (%s)', using_expr) else '' end,
      case when check_expr is not null then format(' with check (%s)', check_expr) else '' end
    );
  end loop;
end $$;
