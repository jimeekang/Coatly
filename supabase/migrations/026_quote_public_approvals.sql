-- Migration 026: public quote approvals and typed signatures

alter table public.quotes
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_name text,
  add column if not exists approved_by_email text,
  add column if not exists approval_signature text;

comment on column public.quotes.approved_at is
  'Timestamp captured when a customer approves the quote from the public quote page.';

comment on column public.quotes.approved_by_name is
  'Customer-provided approver name captured on public quote approval.';

comment on column public.quotes.approved_by_email is
  'Customer-provided approver email captured on public quote approval.';

comment on column public.quotes.approval_signature is
  'Typed signature captured on public quote approval.';
