-- Migration 041: Add detailed_quick pricing method + quote_estimate_items columns
-- for Quick Estimate (room × size × surface matrix with coating/condition multipliers)

-- 1) Extend pricing_method check constraint to allow 'detailed_quick'
alter table public.quotes
  drop constraint if exists quotes_pricing_method_check;

alter table public.quotes
  add constraint quotes_pricing_method_check
  check (pricing_method in (
    'day_rate', 'sqm_rate', 'room_rate', 'manual', 'hybrid', 'detailed_quick'
  ));

-- 2) Add Quick Estimate metadata columns to quote_estimate_items
--    All nullable so existing rows are unaffected
alter table public.quote_estimate_items
  add column if not exists size text
    check (size in ('small', 'medium', 'large')),
  add column if not exists selected_surfaces jsonb,
  add column if not exists coating_multiplier_pct numeric,
  add column if not exists condition_multiplier_pct numeric,
  add column if not exists item_notes text;
