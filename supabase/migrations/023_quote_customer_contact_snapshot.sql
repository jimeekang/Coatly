alter table public.quotes
  add column if not exists customer_email text,
  add column if not exists customer_address text;

comment on column public.quotes.customer_email is
  'Customer email snapshot captured when the quote is created.';

comment on column public.quotes.customer_address is
  'Customer address snapshot captured when the quote is created.';
