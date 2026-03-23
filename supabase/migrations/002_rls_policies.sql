-- ============================================================
-- 002_rls_policies.sql
-- Coatly Row Level Security 정책
-- 모든 사용자는 자신의 데이터만 접근 가능
-- ============================================================

-- ============================================================
-- profiles
-- user_id가 곧 PK이므로 user_id = auth.uid() 확인
-- ============================================================
alter table profiles enable row level security;

create policy "profiles: 본인 조회"
  on profiles for select
  using (user_id = auth.uid());

create policy "profiles: 본인 수정"
  on profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- INSERT는 handle_new_user() 트리거가 담당 (003_functions.sql)
-- 직접 INSERT를 허용하되 자신의 user_id로만 가능
create policy "profiles: 본인 생성"
  on profiles for insert
  with check (user_id = auth.uid());

create policy "profiles: 본인 삭제"
  on profiles for delete
  using (user_id = auth.uid());

-- ============================================================
-- customers
-- ============================================================
alter table customers enable row level security;

create policy "customers: 본인 데이터 조회"
  on customers for select
  using (user_id = auth.uid());

create policy "customers: 본인 데이터 생성"
  on customers for insert
  with check (user_id = auth.uid());

create policy "customers: 본인 데이터 수정"
  on customers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "customers: 본인 데이터 삭제"
  on customers for delete
  using (user_id = auth.uid());

-- ============================================================
-- quotes
-- ============================================================
alter table quotes enable row level security;

create policy "quotes: 본인 데이터 조회"
  on quotes for select
  using (user_id = auth.uid());

create policy "quotes: 본인 데이터 생성"
  on quotes for insert
  with check (user_id = auth.uid());

create policy "quotes: 본인 데이터 수정"
  on quotes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "quotes: 본인 데이터 삭제"
  on quotes for delete
  using (user_id = auth.uid());

-- ============================================================
-- quote_rooms
-- 자식 테이블 — 부모 quotes의 user_id로 권한 확인
-- ============================================================
alter table quote_rooms enable row level security;

create policy "quote_rooms: 본인 견적의 방만 조회"
  on quote_rooms for select
  using (
    exists (
      select 1 from quotes
      where quotes.id = quote_rooms.quote_id
        and quotes.user_id = auth.uid()
    )
  );

create policy "quote_rooms: 본인 견적에만 방 추가"
  on quote_rooms for insert
  with check (
    exists (
      select 1 from quotes
      where quotes.id = quote_rooms.quote_id
        and quotes.user_id = auth.uid()
    )
  );

create policy "quote_rooms: 본인 견적의 방만 수정"
  on quote_rooms for update
  using (
    exists (
      select 1 from quotes
      where quotes.id = quote_rooms.quote_id
        and quotes.user_id = auth.uid()
    )
  );

create policy "quote_rooms: 본인 견적의 방만 삭제"
  on quote_rooms for delete
  using (
    exists (
      select 1 from quotes
      where quotes.id = quote_rooms.quote_id
        and quotes.user_id = auth.uid()
    )
  );

-- ============================================================
-- quote_room_surfaces
-- 자식 테이블 — quote_rooms → quotes를 통해 user_id 확인
-- ============================================================
alter table quote_room_surfaces enable row level security;

create policy "quote_room_surfaces: 본인 데이터 조회"
  on quote_room_surfaces for select
  using (
    exists (
      select 1
      from quote_rooms
      join quotes on quotes.id = quote_rooms.quote_id
      where quote_rooms.id = quote_room_surfaces.room_id
        and quotes.user_id = auth.uid()
    )
  );

create policy "quote_room_surfaces: 본인 데이터 생성"
  on quote_room_surfaces for insert
  with check (
    exists (
      select 1
      from quote_rooms
      join quotes on quotes.id = quote_rooms.quote_id
      where quote_rooms.id = quote_room_surfaces.room_id
        and quotes.user_id = auth.uid()
    )
  );

create policy "quote_room_surfaces: 본인 데이터 수정"
  on quote_room_surfaces for update
  using (
    exists (
      select 1
      from quote_rooms
      join quotes on quotes.id = quote_rooms.quote_id
      where quote_rooms.id = quote_room_surfaces.room_id
        and quotes.user_id = auth.uid()
    )
  );

create policy "quote_room_surfaces: 본인 데이터 삭제"
  on quote_room_surfaces for delete
  using (
    exists (
      select 1
      from quote_rooms
      join quotes on quotes.id = quote_rooms.quote_id
      where quote_rooms.id = quote_room_surfaces.room_id
        and quotes.user_id = auth.uid()
    )
  );

-- ============================================================
-- invoices
-- ============================================================
alter table invoices enable row level security;

create policy "invoices: 본인 데이터 조회"
  on invoices for select
  using (user_id = auth.uid());

create policy "invoices: 본인 데이터 생성"
  on invoices for insert
  with check (user_id = auth.uid());

create policy "invoices: 본인 데이터 수정"
  on invoices for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "invoices: 본인 데이터 삭제"
  on invoices for delete
  using (user_id = auth.uid());

-- ============================================================
-- invoice_line_items
-- 자식 테이블 — invoices를 통해 user_id 확인
-- ============================================================
alter table invoice_line_items enable row level security;

create policy "invoice_line_items: 본인 데이터 조회"
  on invoice_line_items for select
  using (
    exists (
      select 1 from invoices
      where invoices.id = invoice_line_items.invoice_id
        and invoices.user_id = auth.uid()
    )
  );

create policy "invoice_line_items: 본인 데이터 생성"
  on invoice_line_items for insert
  with check (
    exists (
      select 1 from invoices
      where invoices.id = invoice_line_items.invoice_id
        and invoices.user_id = auth.uid()
    )
  );

create policy "invoice_line_items: 본인 데이터 수정"
  on invoice_line_items for update
  using (
    exists (
      select 1 from invoices
      where invoices.id = invoice_line_items.invoice_id
        and invoices.user_id = auth.uid()
    )
  );

create policy "invoice_line_items: 본인 데이터 삭제"
  on invoice_line_items for delete
  using (
    exists (
      select 1 from invoices
      where invoices.id = invoice_line_items.invoice_id
        and invoices.user_id = auth.uid()
    )
  );

-- ============================================================
-- subscriptions
-- ============================================================
alter table subscriptions enable row level security;

create policy "subscriptions: 본인 데이터 조회"
  on subscriptions for select
  using (user_id = auth.uid());

-- INSERT/UPDATE/DELETE는 서버 사이드(Stripe webhook)에서만 가능
-- service_role key로 실행되므로 RLS 우회됨 — 클라이언트 직접 접근 차단
-- (클라이언트가 구독 정보를 변조하는 것을 방지)
create policy "subscriptions: 본인 생성 불가 (webhook 전용)"
  on subscriptions for insert
  with check (false);  -- 클라이언트에서 직접 INSERT 금지

create policy "subscriptions: 본인 수정 불가 (webhook 전용)"
  on subscriptions for update
  using (false);       -- 클라이언트에서 직접 UPDATE 금지

create policy "subscriptions: 본인 삭제 불가 (webhook 전용)"
  on subscriptions for delete
  using (false);       -- 클라이언트에서 직접 DELETE 금지
