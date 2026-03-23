-- ============================================================
-- 009_harden_security_definer_functions.sql
-- Prevent RPC misuse across accounts
-- ============================================================

create or replace function public.generate_quote_number(user_uuid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_num integer;
begin
  if auth.uid() is distinct from user_uuid then
    raise exception 'You can only generate quote numbers for your own account.'
      using errcode = '42501';
  end if;

  select coalesce(
    max(cast(substring(quote_number from 5) as integer)),
    0
  ) + 1
  into next_num
  from public.quotes
  where user_id = user_uuid
    and quote_number ~ '^QUO-[0-9]+$';

  return 'QUO-' || lpad(next_num::text, 4, '0');
end;
$$;

create or replace function public.generate_invoice_number(user_uuid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_num integer;
begin
  if auth.uid() is distinct from user_uuid then
    raise exception 'You can only generate invoice numbers for your own account.'
      using errcode = '42501';
  end if;

  select coalesce(
    max(cast(substring(invoice_number from 5) as integer)),
    0
  ) + 1
  into next_num
  from public.invoices
  where user_id = user_uuid
    and invoice_number ~ '^INV-[0-9]+$';

  return 'INV-' || lpad(next_num::text, 4, '0');
end;
$$;

create or replace function public.calculate_quote_totals(quote_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal integer;
  v_gst integer;
  v_tier text;
  owner_id uuid;
begin
  select user_id, tier
  into owner_id, v_tier
  from public.quotes
  where id = quote_uuid;

  if owner_id is null then
    raise exception 'Quote not found.'
      using errcode = 'P0002';
  end if;

  if auth.uid() is distinct from owner_id then
    raise exception 'You can only calculate totals for your own quotes.'
      using errcode = '42501';
  end if;

  select coalesce(sum(qrs.material_cost_cents + qrs.labour_cost_cents), 0)
  into v_subtotal
  from public.quote_room_surfaces qrs
  join public.quote_rooms qr on qr.id = qrs.room_id
  where qr.quote_id = quote_uuid
    and qrs.tier = coalesce(v_tier, 'good');

  select
    v_subtotal
    + (v_subtotal * coalesce(labour_margin_percent, 0) / 100)
    + (v_subtotal * coalesce(material_margin_percent, 0) / 100)
  into v_subtotal
  from public.quotes
  where id = quote_uuid;

  v_gst := round(v_subtotal * 0.1);

  update public.quotes
  set
    subtotal_cents = v_subtotal,
    gst_cents = v_gst,
    total_cents = v_subtotal + v_gst,
    updated_at = now()
  where id = quote_uuid;
end;
$$;

create or replace function public.calculate_invoice_totals(invoice_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal integer;
  v_gst integer;
  owner_id uuid;
begin
  select user_id
  into owner_id
  from public.invoices
  where id = invoice_uuid;

  if owner_id is null then
    raise exception 'Invoice not found.'
      using errcode = 'P0002';
  end if;

  if auth.uid() is distinct from owner_id then
    raise exception 'You can only calculate totals for your own invoices.'
      using errcode = '42501';
  end if;

  select coalesce(sum(total_cents), 0)
  into v_subtotal
  from public.invoice_line_items
  where invoice_id = invoice_uuid;

  select coalesce(sum(gst_cents), 0)
  into v_gst
  from public.invoice_line_items
  where invoice_id = invoice_uuid;

  update public.invoices
  set
    subtotal_cents = v_subtotal,
    gst_cents = v_gst,
    total_cents = v_subtotal + v_gst,
    updated_at = now()
  where id = invoice_uuid;
end;
$$;

create or replace function public.get_user_active_quote_count(user_uuid uuid)
returns integer
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result_count integer;
begin
  if auth.uid() is distinct from user_uuid then
    raise exception 'You can only read active quote counts for your own account.'
      using errcode = '42501';
  end if;

  select count(*)::integer
  into result_count
  from public.quotes
  where user_id = user_uuid
    and status in ('draft', 'sent', 'accepted')
    and date_trunc('month', created_at) = date_trunc('month', now());

  return result_count;
end;
$$;
