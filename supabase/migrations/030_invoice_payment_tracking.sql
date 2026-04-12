alter table public.invoices
  add column if not exists paid_date date,
  add column if not exists payment_method text;

update public.invoices
set paid_date = coalesce(paid_date, paid_at::date)
where paid_at is not null;

alter table public.invoices
  drop constraint if exists invoices_payment_method_check;

alter table public.invoices
  add constraint invoices_payment_method_check
  check (
    payment_method is null
    or payment_method in ('bank_transfer', 'cash', 'card', 'cheque', 'other')
  );
