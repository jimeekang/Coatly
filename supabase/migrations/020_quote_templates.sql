-- Quote templates: saved quote configurations a user can reload
create table if not exists quote_templates (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  -- snapshot of the quote form payload (rooms, margins, complexity, notes)
  payload      jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table quote_templates enable row level security;

create policy "users can only access their own quote_templates"
  on quote_templates for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists quote_templates_user_id_idx on quote_templates(user_id);
