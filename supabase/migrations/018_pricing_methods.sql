-- Migration 018: Add pricing_method support to quotes
-- Enables day_rate / room_rate / manual / sqm_rate / hybrid pricing methods

-- 1. Add pricing_method column to quotes table
alter table public.quotes
  add column if not exists pricing_method text
    check (pricing_method in ('day_rate', 'sqm_rate', 'room_rate', 'manual', 'hybrid'))
    default 'hybrid';

comment on column public.quotes.pricing_method is
  'Pricing calculation method used: day_rate (labour×days), sqm_rate (area-based), room_rate (flat per room), manual (direct input), hybrid (sqm+unit mix)';

-- 2. Add pricing_method_inputs column to store raw inputs for audit/display
alter table public.quotes
  add column if not exists pricing_method_inputs jsonb;

comment on column public.quotes.pricing_method_inputs is
  'Raw inputs used for the selected pricing_method. Shape varies by method. Internal use only — not shown on PDF.';

-- 3. Backfill existing quotes as hybrid (the previous default behaviour)
update public.quotes
  set pricing_method = 'hybrid'
  where pricing_method is null;

-- 4. Add NOT NULL constraint after backfill
alter table public.quotes
  alter column pricing_method set not null;
