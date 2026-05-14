-- Allow Quick Estimate room snapshots in quote_estimate_items.

alter table public.quote_estimate_items
  drop constraint if exists quote_estimate_items_category_check;

alter table public.quote_estimate_items
  add constraint quote_estimate_items_category_check
  check (
    category in (
      'entire_property',
      'room',
      'door',
      'window',
      'skirting',
      'modifier',
      'quick_estimate'
    )
  );
