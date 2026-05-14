alter function public.update_schedule_events_updated_at() set search_path = public, pg_temp;
alter function public.set_google_calendar_updated_at() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.enforce_job_quote_ownership() set search_path = public, pg_temp;
alter function public.enforce_invoice_quote_ownership() set search_path = public, pg_temp;
alter function public.update_updated_at_column() set search_path = public, pg_temp;
alter function public.enforce_job_schedule_day_owner() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;

revoke execute on function public.enforce_job_schedule_day_owner() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
