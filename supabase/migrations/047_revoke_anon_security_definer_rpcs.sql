revoke execute on function public.check_job_date_overlap(uuid, date, date, uuid) from anon;
revoke execute on function public.check_job_schedule_dates_overlap(uuid, date[], uuid) from anon;
revoke execute on function public.get_blocked_dates_for_user(uuid, date, date) from anon;
revoke execute on function public.generate_quote_number(uuid) from anon;
revoke execute on function public.generate_invoice_number(uuid) from anon;
revoke execute on function public.calculate_quote_totals(uuid) from anon;
revoke execute on function public.calculate_invoice_totals(uuid) from anon;
revoke execute on function public.get_user_active_quote_count(uuid) from anon;
revoke execute on function public.update_invoice_with_line_items(uuid, uuid, jsonb, jsonb) from anon;
