-- Migration 025: public quote share tokens

alter table public.quotes
  add column if not exists public_share_token uuid not null default gen_random_uuid();

comment on column public.quotes.public_share_token is
  'Stable public token used for customer-facing quote links without exposing internal ids.';

create unique index if not exists quotes_public_share_token_key
  on public.quotes (public_share_token);
