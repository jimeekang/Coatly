-- Unified Schedule & Jobs cleanup.
-- Jobs are the source of scheduled work; schedule_events are standalone non-job events.
-- These indexes support the combined schedule calendar/list filters and completed-job lookup.

create index if not exists jobs_user_id_status_scheduled_date_idx
  on public.jobs (user_id, status, scheduled_date);

create index if not exists jobs_user_id_start_end_idx
  on public.jobs (user_id, start_date, end_date);

create index if not exists jobs_user_id_updated_at_idx
  on public.jobs (user_id, updated_at desc);

create index if not exists schedule_events_user_id_date_start_time_idx
  on public.schedule_events (user_id, date, start_time);

comment on table public.jobs is
  'Primary source for customer work and job schedule data shown in the unified Schedule & Jobs workspace.';

comment on table public.schedule_events is
  'Standalone non-job schedule events shown alongside jobs in the unified Schedule & Jobs workspace.';
