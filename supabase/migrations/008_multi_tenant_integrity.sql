-- ============================================================
-- 008_multi_tenant_integrity.sql
-- Account isolation hardening
-- Prevent cross-account references between customers, quotes, and invoices
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customers_id_user_id_key'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_id_user_id_key unique (id, user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotes_id_user_id_key'
      and conrelid = 'public.quotes'::regclass
  ) then
    alter table public.quotes
      add constraint quotes_id_user_id_key unique (id, user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotes_id_customer_id_user_id_key'
      and conrelid = 'public.quotes'::regclass
  ) then
    alter table public.quotes
      add constraint quotes_id_customer_id_user_id_key unique (id, customer_id, user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotes_customer_user_fk'
      and conrelid = 'public.quotes'::regclass
  ) then
    alter table public.quotes
      add constraint quotes_customer_user_fk
      foreign key (customer_id, user_id)
      references public.customers (id, user_id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_customer_user_fk'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_customer_user_fk
      foreign key (customer_id, user_id)
      references public.customers (id, user_id)
      on delete restrict;
  end if;
end $$;

create or replace function public.enforce_invoice_quote_ownership()
returns trigger
language plpgsql
as $$
declare
  matched_quote record;
begin
  if new.quote_id is null then
    return new;
  end if;

  select id, customer_id, user_id
  into matched_quote
  from public.quotes
  where id = new.quote_id;

  if matched_quote is null then
    return new;
  end if;

  if matched_quote.user_id <> new.user_id then
    raise exception 'Invoice quote must belong to the same user.'
      using errcode = '23514';
  end if;

  if matched_quote.customer_id <> new.customer_id then
    raise exception 'Invoice quote must belong to the selected customer.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_enforce_quote_ownership on public.invoices;

create trigger invoices_enforce_quote_ownership
  before insert or update on public.invoices
  for each row
  execute function public.enforce_invoice_quote_ownership();

comment on function public.enforce_invoice_quote_ownership() is
  'Prevents invoices from referencing quotes owned by another account or a different customer.';
