-- Migration 015: Add manual_adjustment_cents to quotes
-- Allows final +/- price adjustment before PDF generation

alter table public.quotes
  add column if not exists manual_adjustment_cents integer not null default 0;

comment on column public.quotes.manual_adjustment_cents is
  'Final manual price adjustment in cents (positive = increase, negative = discount). Applied after GST calculation.';
