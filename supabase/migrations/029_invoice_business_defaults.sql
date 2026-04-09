alter table public.businesses
  add column if not exists invoice_payment_terms text,
  add column if not exists invoice_bank_details text;

alter table public.invoices
  add column if not exists business_abn text,
  add column if not exists payment_terms text,
  add column if not exists bank_details text;

update public.invoices as invoices
set
  business_abn = coalesce(invoices.business_abn, businesses.abn),
  payment_terms = coalesce(invoices.payment_terms, businesses.invoice_payment_terms),
  bank_details = coalesce(invoices.bank_details, businesses.invoice_bank_details)
from public.businesses as businesses
where businesses.user_id = invoices.user_id
  and (
    invoices.business_abn is null
    or invoices.payment_terms is null
    or invoices.bank_details is null
  );
