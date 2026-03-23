-- ============================================================
-- 010_strengthen_rls_parent_ownership.sql
-- Ensure direct client writes can only reference owned parents
-- ============================================================

drop policy if exists "quotes: 본인 데이터 생성" on public.quotes;
drop policy if exists "quotes: 본인 데이터 수정" on public.quotes;

create policy "quotes: own insert with owned customer"
  on public.quotes
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.customers
      where customers.id = quotes.customer_id
        and customers.user_id = auth.uid()
    )
  );

create policy "quotes: own update with owned customer"
  on public.quotes
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.customers
      where customers.id = quotes.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "invoices: 본인 데이터 생성" on public.invoices;
drop policy if exists "invoices: 본인 데이터 수정" on public.invoices;

create policy "invoices: own insert with owned parents"
  on public.invoices
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.customers
      where customers.id = invoices.customer_id
        and customers.user_id = auth.uid()
    )
    and (
      quote_id is null
      or exists (
        select 1
        from public.quotes
        where quotes.id = invoices.quote_id
          and quotes.user_id = auth.uid()
          and quotes.customer_id = invoices.customer_id
      )
    )
  );

create policy "invoices: own update with owned parents"
  on public.invoices
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.customers
      where customers.id = invoices.customer_id
        and customers.user_id = auth.uid()
    )
    and (
      quote_id is null
      or exists (
        select 1
        from public.quotes
        where quotes.id = invoices.quote_id
          and quotes.user_id = auth.uid()
          and quotes.customer_id = invoices.customer_id
      )
    )
  );
