-- Atomically update a draft invoice and replace its line items.

create or replace function public.update_invoice_with_line_items(
  p_invoice_id uuid,
  p_user_id uuid,
  p_invoice jsonb,
  p_line_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'You can only update your own invoices.'
      using errcode = '42501';
  end if;

  select status
  into v_status
  from public.invoices
  where id = p_invoice_id
    and user_id = p_user_id
  for update;

  if v_status is null then
    raise exception 'Invoice not found.'
      using errcode = 'P0002';
  end if;

  if v_status <> 'draft' then
    raise exception 'Only draft invoices can be edited.'
      using errcode = 'P0001';
  end if;

  update public.invoices
  set
    customer_id = (p_invoice ->> 'customer_id')::uuid,
    quote_id = nullif(p_invoice ->> 'quote_id', '')::uuid,
    status = p_invoice ->> 'status',
    invoice_type = p_invoice ->> 'invoice_type',
    business_abn = nullif(p_invoice ->> 'business_abn', ''),
    payment_terms = nullif(p_invoice ->> 'payment_terms', ''),
    bank_details = nullif(p_invoice ->> 'bank_details', ''),
    subtotal_cents = (p_invoice ->> 'subtotal_cents')::integer,
    gst_cents = (p_invoice ->> 'gst_cents')::integer,
    total_cents = (p_invoice ->> 'total_cents')::integer,
    amount_paid_cents = (p_invoice ->> 'amount_paid_cents')::integer,
    due_date = nullif(p_invoice ->> 'due_date', '')::date,
    paid_date = nullif(p_invoice ->> 'paid_date', '')::date,
    paid_at = nullif(p_invoice ->> 'paid_at', '')::timestamptz,
    payment_method = nullif(p_invoice ->> 'payment_method', ''),
    notes = nullif(p_invoice ->> 'notes', ''),
    updated_at = now()
  where id = p_invoice_id
    and user_id = p_user_id;

  delete from public.invoice_line_items
  where invoice_id = p_invoice_id;

  insert into public.invoice_line_items (
    invoice_id,
    description,
    quantity,
    unit_price_cents,
    gst_cents,
    total_cents,
    sort_order
  )
  select
    p_invoice_id,
    item.description,
    item.quantity,
    item.unit_price_cents,
    item.gst_cents,
    item.total_cents,
    item.sort_order
  from jsonb_to_recordset(p_line_items) as item(
    description text,
    quantity numeric,
    unit_price_cents integer,
    gst_cents integer,
    total_cents integer,
    sort_order integer
  );
end;
$$;

comment on function public.update_invoice_with_line_items(uuid, uuid, jsonb, jsonb) is
  'Atomically updates a draft invoice and replaces invoice_line_items to avoid partial parent/detail writes.';
