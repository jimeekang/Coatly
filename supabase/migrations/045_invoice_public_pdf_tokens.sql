alter table public.invoices
  add column if not exists public_share_token uuid;

create unique index if not exists invoices_public_share_token_idx
  on public.invoices (public_share_token)
  where public_share_token is not null;

comment on column public.invoices.public_share_token is
  'Opaque token used for customer-facing invoice PDF links.';
