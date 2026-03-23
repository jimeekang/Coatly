-- ============================================================
-- 011_drop_ambiguous_foreign_keys.sql
-- Remove legacy single-column foreign keys that make embeds ambiguous
-- ============================================================

alter table public.quotes
  drop constraint if exists quotes_customer_id_fkey;

alter table public.invoices
  drop constraint if exists invoices_customer_id_fkey;
