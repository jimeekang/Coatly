-- Allow Task 2 quote estimate item categories used by Advanced and Quick snapshots.

alter table public.quote_estimate_items
  drop constraint if exists quote_estimate_items_category_check;

alter table public.quote_estimate_items
  add constraint quote_estimate_items_category_check
  check (
    category in (
      'entire_property',
      'room',
      'room_anchor',
      'door',
      'window',
      'trim',
      'skirting',
      'modifier',
      'quick_estimate'
    )
  );
