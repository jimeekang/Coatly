alter table public.customers
  add column if not exists emails text[] not null default '{}',
  add column if not exists phones text[] not null default '{}',
  add column if not exists properties jsonb not null default '[]'::jsonb;

update public.customers
set
  emails = case
    when cardinality(emails) = 0 and email is not null and btrim(email) <> ''
      then array[lower(btrim(email))]
    else emails
  end,
  phones = case
    when cardinality(phones) = 0 and phone is not null and btrim(phone) <> ''
      then array[btrim(phone)]
    else phones
  end,
  properties = case
    when properties = '[]'::jsonb
      and (
        address_line1 is not null
        or address_line2 is not null
        or city is not null
        or state is not null
        or postcode is not null
      )
      then jsonb_build_array(
        jsonb_build_object(
          'label', 'Primary property',
          'address_line1', coalesce(address_line1, ''),
          'address_line2', coalesce(address_line2, ''),
          'city', coalesce(city, ''),
          'state', coalesce(state, ''),
          'postcode', coalesce(postcode, ''),
          'notes', ''
        )
      )
    else properties
  end;

comment on column public.customers.emails is
  'All customer email addresses. customers.email remains the primary email for legacy quote/invoice flows.';

comment on column public.customers.phones is
  'All customer phone numbers. customers.phone remains the primary phone for legacy quote/invoice flows.';

comment on column public.customers.properties is
  'Customer properties as an ordered JSON array. The first item is mirrored into address_* columns for legacy quote/invoice flows.';
