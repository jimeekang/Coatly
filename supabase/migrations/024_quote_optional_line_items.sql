-- Migration 024: optional customer-selectable quote line items

alter table public.quote_line_items
  add column if not exists is_optional boolean not null default false,
  add column if not exists is_selected boolean not null default true;

comment on column public.quote_line_items.is_optional is
  'Marks the line item as an optional add-on that can be accepted or declined.';

comment on column public.quote_line_items.is_selected is
  'When true, the line item is included in quote totals. Optional items start unselected until chosen.';
