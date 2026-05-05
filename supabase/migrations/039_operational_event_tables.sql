-- Operational event tables for idempotency, AI audit, and public quote tracking.

alter table public.quotes
  add column if not exists public_share_expires_at timestamptz,
  add column if not exists public_share_revoked_at timestamptz,
  add column if not exists public_share_revoked_reason text;

comment on column public.quotes.public_share_expires_at is
  'Optional expiry timestamp for public quote links.';

comment on column public.quotes.public_share_revoked_at is
  'Timestamp set when the current public quote link is revoked.';

comment on column public.quotes.public_share_revoked_reason is
  'Internal reason recorded when a public quote link is revoked.';

create index if not exists quotes_public_share_active_idx
  on public.quotes (public_share_token)
  where public_share_revoked_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_id_user_id_key'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_id_user_id_key unique (id, user_id);
  end if;
end $$;

create table if not exists public.invoice_reminder_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null,
  reminder_type text not null,
  status text not null default 'pending',
  scheduled_for date,
  resend_message_id text,
  error_message text,
  attempt_count integer not null default 0,
  last_attempted_at timestamptz,
  sent_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_reminder_events_invoice_user_fk
    foreign key (invoice_id, user_id)
    references public.invoices (id, user_id)
    on delete cascade,
  constraint invoice_reminder_events_type_check
    check (reminder_type in ('due_soon', 'overdue')),
  constraint invoice_reminder_events_status_check
    check (status in ('pending', 'sent', 'failed')),
  constraint invoice_reminder_events_attempt_count_check
    check (attempt_count >= 0),
  constraint invoice_reminder_events_invoice_type_key
    unique (invoice_id, reminder_type)
);

comment on table public.invoice_reminder_events is
  'Durable invoice reminder send attempts, used to prevent duplicate due and overdue reminders.';

comment on column public.invoice_reminder_events.resend_message_id is
  'Provider message id returned after a reminder email is accepted for delivery.';

create index if not exists invoice_reminder_events_user_created_idx
  on public.invoice_reminder_events (user_id, created_at desc);

create index if not exists invoice_reminder_events_status_scheduled_idx
  on public.invoice_reminder_events (status, scheduled_for)
  where status in ('pending', 'failed');

create index if not exists invoice_reminder_events_invoice_idx
  on public.invoice_reminder_events (invoice_id, created_at desc);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  provider text not null default 'google',
  model text,
  status text not null default 'completed',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  latency_ms integer,
  error_message text,
  request_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint ai_usage_events_action_check
    check (char_length(trim(action)) > 0),
  constraint ai_usage_events_provider_check
    check (char_length(trim(provider)) > 0),
  constraint ai_usage_events_status_check
    check (status in ('completed', 'failed')),
  constraint ai_usage_events_token_count_check
    check (input_tokens >= 0 and output_tokens >= 0 and total_tokens >= 0),
  constraint ai_usage_events_latency_check
    check (latency_ms is null or latency_ms >= 0)
);

comment on table public.ai_usage_events is
  'Per-user AI usage and audit events for cost controls, debugging, and privacy review.';

create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at desc);

create index if not exists ai_usage_events_user_action_created_idx
  on public.ai_usage_events (user_id, action, created_at desc);

create index if not exists ai_usage_events_request_id_idx
  on public.ai_usage_events (request_id)
  where request_id is not null;

create table if not exists public.public_quote_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quote_id uuid not null,
  event_type text not null,
  public_share_token uuid,
  actor_name text,
  actor_email text,
  ip_hash text,
  user_agent_hash text,
  error_message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint public_quote_events_quote_user_fk
    foreign key (quote_id, user_id)
    references public.quotes (id, user_id)
    on delete cascade,
  constraint public_quote_events_type_check
    check (
      event_type in (
        'viewed',
        'pdf_downloaded',
        'approved',
        'rejected',
        'booking_started',
        'booked',
        'failed',
        'token_revoked',
        'token_rotated'
      )
    )
);

comment on table public.public_quote_events is
  'Audit trail for customer-facing quote link activity and failures.';

create index if not exists public_quote_events_user_created_idx
  on public.public_quote_events (user_id, created_at desc);

create index if not exists public_quote_events_quote_created_idx
  on public.public_quote_events (quote_id, created_at desc);

create index if not exists public_quote_events_type_created_idx
  on public.public_quote_events (event_type, created_at desc);

create index if not exists public_quote_events_token_idx
  on public.public_quote_events (public_share_token)
  where public_share_token is not null;

drop trigger if exists invoice_reminder_events_updated_at
  on public.invoice_reminder_events;

create trigger invoice_reminder_events_updated_at
  before update on public.invoice_reminder_events
  for each row execute function public.set_updated_at();

alter table public.invoice_reminder_events enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.public_quote_events enable row level security;

drop policy if exists "users can only access their own invoice reminder events"
  on public.invoice_reminder_events;
create policy "users can only access their own invoice reminder events"
  on public.invoice_reminder_events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users can only access their own ai usage events"
  on public.ai_usage_events;
create policy "users can only access their own ai usage events"
  on public.ai_usage_events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users can only access their own public quote events"
  on public.public_quote_events;
create policy "users can only access their own public quote events"
  on public.public_quote_events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
