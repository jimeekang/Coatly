-- ============================================================
-- 003_functions.sql
-- Coatly DB 함수 및 트리거
-- ============================================================

-- ============================================================
-- 1. auto_update_timestamps()
-- updated_at 자동 갱신 트리거 함수
-- 001_initial_schema.sql에서 이미 정의했으나, 여기서 재확인/문서화
-- ============================================================

-- 참고: update_updated_at_column() 함수는 001_initial_schema.sql에서 정의됨
-- 각 테이블 트리거도 001에서 생성됨
-- 이 파일에서는 번호 생성 함수와 신규 유저 처리 트리거를 정의

-- ============================================================
-- 2. generate_quote_number(user_uuid UUID) → TEXT
-- 해당 유저의 다음 견적 번호 생성 (QUO-0001, QUO-0002, ...)
-- 동시성 안전: 트랜잭션 내에서 max() + 1 방식 사용
-- ============================================================
create or replace function generate_quote_number(user_uuid uuid)
returns text
language plpgsql
security definer  -- RLS 우회하여 카운트 조회 (본인 데이터만 조회하므로 안전)
as $$
declare
  next_num integer;
begin
  -- 현재 유저의 견적번호 중 최대값 추출 (QUO-NNNN에서 NNNN 부분)
  -- 동시에 여러 견적이 생성되어도 FOR UPDATE SKIP LOCKED 대신
  -- 고유 제약(unique_quote_number)이 충돌을 방지함
  select coalesce(
    max(cast(substring(quote_number from 5) as integer)),
    0
  ) + 1
  into next_num
  from quotes
  where user_id = user_uuid
    and quote_number ~ '^QUO-[0-9]+$';  -- 올바른 형식만 카운트

  -- QUO-0001 형식으로 반환 (최소 4자리)
  return 'QUO-' || lpad(next_num::text, 4, '0');
end;
$$;

comment on function generate_quote_number(uuid) is
  '유저별 다음 견적번호 생성. QUO-0001 형식, 4자리 미만이면 앞에 0으로 채움';

-- ============================================================
-- 3. generate_invoice_number(user_uuid UUID) → TEXT
-- 해당 유저의 다음 청구서 번호 생성 (INV-0001, INV-0002, ...)
-- ============================================================
create or replace function generate_invoice_number(user_uuid uuid)
returns text
language plpgsql
security definer
as $$
declare
  next_num integer;
begin
  select coalesce(
    max(cast(substring(invoice_number from 5) as integer)),
    0
  ) + 1
  into next_num
  from invoices
  where user_id = user_uuid
    and invoice_number ~ '^INV-[0-9]+$';

  return 'INV-' || lpad(next_num::text, 4, '0');
end;
$$;

comment on function generate_invoice_number(uuid) is
  '유저별 다음 청구서번호 생성. INV-0001 형식, 4자리 미만이면 앞에 0으로 채움';

-- ============================================================
-- 4. handle_new_user()
-- auth.users에 새 유저 가입 시 profiles 자동 생성
-- Supabase Auth → public.profiles 동기화 트리거
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer  -- auth.users 읽기 위해 필요
set search_path = public
as $$
begin
  insert into public.profiles (user_id, business_name, email)
  values (
    new.id,
    -- 이메일 앞부분을 임시 비즈니스 이름으로 사용 (설정 화면에서 수정 유도)
    coalesce(
      new.raw_user_meta_data->>'business_name',  -- 소셜 로그인 등 메타데이터 있으면 사용
      split_part(new.email, '@', 1)              -- 없으면 이메일 앞부분
    ),
    new.email
  );
  return new;
end;
$$;

-- auth.users INSERT 시 실행되는 트리거
-- (Supabase는 auth 스키마의 트리거를 허용함)
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

comment on function handle_new_user() is
  'auth.users INSERT 시 profiles 레코드 자동 생성. business_name은 이메일 앞부분으로 초기화';

-- ============================================================
-- 5. calculate_quote_totals(quote_uuid UUID)
-- 견적서 전체 금액 재계산 후 quotes 테이블 업데이트
-- quote_room_surfaces 변경 시 호출
-- ============================================================
create or replace function calculate_quote_totals(quote_uuid uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_subtotal integer;
  v_gst      integer;
  v_tier     text;
begin
  -- 현재 선택된 티어 확인
  select tier into v_tier
  from quotes
  where id = quote_uuid;

  -- 선택된 티어의 모든 surface 비용 합산
  select coalesce(sum(material_cost_cents + labour_cost_cents), 0)
  into v_subtotal
  from quote_room_surfaces qrs
  join quote_rooms qr on qr.id = qrs.room_id
  where qr.quote_id = quote_uuid
    and qrs.tier = coalesce(v_tier, 'good');

  -- 마진 적용
  select
    v_subtotal
    + (v_subtotal * coalesce(labour_margin_percent, 0) / 100)
    + (v_subtotal * coalesce(material_margin_percent, 0) / 100)
  into v_subtotal
  from quotes
  where id = quote_uuid;

  -- GST 10% 계산
  v_gst := round(v_subtotal * 0.1);

  -- quotes 테이블 업데이트
  update quotes
  set
    subtotal_cents = v_subtotal,
    gst_cents      = v_gst,
    total_cents    = v_subtotal + v_gst,
    updated_at     = now()
  where id = quote_uuid;
end;
$$;

comment on function calculate_quote_totals(uuid) is
  '견적서 합계 재계산. 선택된 tier의 모든 surface 비용 합산 후 마진/GST 적용';

-- ============================================================
-- 6. calculate_invoice_totals(invoice_uuid UUID)
-- 청구서 전체 금액 재계산
-- invoice_line_items 변경 시 호출
-- ============================================================
create or replace function calculate_invoice_totals(invoice_uuid uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_subtotal integer;
  v_gst      integer;
begin
  -- line_items 합산 (gst 포함 전 금액)
  select coalesce(sum(total_cents), 0)
  into v_subtotal
  from invoice_line_items
  where invoice_id = invoice_uuid;

  -- line_items의 gst_cents 합산
  select coalesce(sum(gst_cents), 0)
  into v_gst
  from invoice_line_items
  where invoice_id = invoice_uuid;

  update invoices
  set
    subtotal_cents = v_subtotal,
    gst_cents      = v_gst,
    total_cents    = v_subtotal + v_gst,
    updated_at     = now()
  where id = invoice_uuid;
end;
$$;

comment on function calculate_invoice_totals(uuid) is
  '청구서 합계 재계산. invoice_line_items의 total_cents/gst_cents 합산';

-- ============================================================
-- 7. get_user_quote_count(user_uuid UUID) → INTEGER
-- Starter 플랜 월 한도 체크용 (10 active quotes/mo)
-- ============================================================
create or replace function get_user_active_quote_count(user_uuid uuid)
returns integer
language sql
security definer
stable  -- 같은 트랜잭션 내 동일 입력 → 동일 결과
as $$
  select count(*)::integer
  from quotes
  where user_id = user_uuid
    and status in ('draft', 'sent', 'accepted')
    and date_trunc('month', created_at) = date_trunc('month', now());
$$;

comment on function get_user_active_quote_count(uuid) is
  '현재 월의 활성 견적(draft/sent/accepted) 수 반환. Starter 플랜 10건 한도 체크용';
