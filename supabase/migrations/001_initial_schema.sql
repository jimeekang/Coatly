-- ============================================================
-- 001_initial_schema.sql
-- Coatly 초기 스키마 정의
-- 실행: supabase db push 또는 supabase migration up
-- ============================================================

-- updated_at 자동 갱신을 위한 헬퍼 함수 (001에서 먼저 정의)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 1. profiles — 사업자 프로필 (auth.users 1:1)
-- ============================================================
create table if not exists profiles (
  -- auth.users의 id를 PK로 사용 (1:1 관계)
  user_id         uuid primary key references auth.users(id) on delete cascade,

  -- 비즈니스 기본 정보
  business_name   text not null,
  abn             text,                        -- Australian Business Number (11자리)
  email           text,
  phone           text,

  -- 주소
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,
  postcode        text,

  -- 은행 계좌 (청구서 하단 표시용)
  bank_bsb            text,                    -- BSB 번호 (xxx-xxx 형식)
  bank_account_number text,
  bank_account_name   text,

  -- 기본 설정
  default_payment_terms integer default 14,    -- 결제 기한 (일 단위), 기본 14일
  logo_url              text,                  -- Supabase Storage URL

  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- updated_at 자동 갱신 트리거
create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at_column();

comment on table profiles is '사업자 프로필. auth.users와 1:1 관계';
comment on column profiles.abn is 'Australian Business Number — 11자리 숫자';
comment on column profiles.default_payment_terms is '청구서 기본 결제 기한 (일 단위)';

-- ============================================================
-- 2. customers — 고객 목록
-- ============================================================
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  -- 고객 기본 정보
  name        text not null,
  email       text,
  phone       text,
  company_name text,

  -- 주소
  address_line1 text,
  address_line2 text,
  city          text,
  state         text,
  postcode      text,

  notes       text,                            -- 내부 메모 (고객에게 비공개)
  is_archived boolean default false not null,  -- 삭제 대신 보관처리

  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- 인덱스: 자주 쓰는 조회 패턴 최적화
create index idx_customers_user_id on customers(user_id);
create index idx_customers_user_archived on customers(user_id, is_archived);
create index idx_customers_user_name on customers(user_id, name);

create trigger customers_updated_at
  before update on customers
  for each row execute function update_updated_at_column();

comment on table customers is '고객 목록. is_archived=true인 고객은 목록에서 숨김';

-- ============================================================
-- 3. quotes — 견적서
-- ============================================================
create table if not exists quotes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict,

  -- 견적 식별
  quote_number text not null,                  -- QUO-0001 형식, 유저별 unique
  title        text,                           -- 작업 제목 (예: "123 Smith St 내부 도색")

  -- 상태: draft → sent → accepted/declined, expired는 valid_until 지나면 자동
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),

  -- 메모
  notes          text,                         -- 고객에게 보이는 메모
  internal_notes text,                         -- 내부 전용 메모 (PDF에 미포함)

  -- 마진 설정 (%)
  labour_margin_percent   integer default 0 not null,
  material_margin_percent integer default 0 not null,

  -- 금액 합계 (cents 단위 — 프론트에서 /100 표시)
  subtotal_cents integer default 0 not null,
  gst_cents      integer default 0 not null,   -- GST = subtotal * 10%
  total_cents    integer default 0 not null,

  -- 유효 기간 및 선택 티어
  valid_until date,
  tier text check (tier in ('good', 'better', 'best')),  -- 현재 선택된 가격 티어

  -- 유저별 견적번호 unique 보장
  unique (user_id, quote_number),

  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create index idx_quotes_user_id on quotes(user_id);
create index idx_quotes_user_status on quotes(user_id, status);
create index idx_quotes_user_customer on quotes(user_id, customer_id);

create trigger quotes_updated_at
  before update on quotes
  for each row execute function update_updated_at_column();

comment on table quotes is '견적서. 금액은 모두 cents(정수) 단위로 저장';
comment on column quotes.gst_cents is 'GST = subtotal_cents * 10%';
comment on column quotes.tier is '고객에게 보여줄 good/better/best 중 선택된 티어';

-- ============================================================
-- 4. quote_rooms — 견적서 내 방/구역
-- ============================================================
create table if not exists quote_rooms (
  id       uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,

  name      text not null,                     -- 예: "Master Bedroom", "Living Room"
  room_type text not null default 'interior'
    check (room_type in ('interior', 'exterior')),

  -- 치수 (m 단위)
  length_m numeric(6,2),
  width_m  numeric(6,2),
  height_m numeric(6,2) default 2.7,           -- 호주 표준 천장 높이 2.7m

  sort_order integer default 0 not null,       -- 방 순서 (드래그 정렬용)

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_quote_rooms_quote_id on quote_rooms(quote_id);

create trigger quote_rooms_updated_at
  before update on quote_rooms
  for each row execute function update_updated_at_column();

comment on table quote_rooms is '견적서 내 방/구역 목록. sort_order로 순서 관리';

-- ============================================================
-- 5. quote_room_surfaces — 방별 도색 면 상세
-- ============================================================
create table if not exists quote_room_surfaces (
  id      uuid primary key default gen_random_uuid(),
  room_id uuid not null references quote_rooms(id) on delete cascade,

  -- 면 종류
  surface_type text not null
    check (surface_type in (
      'walls', 'ceiling', 'trim', 'doors', 'windows',
      'exterior_walls', 'exterior_trim', 'fascia', 'gutters'
    )),

  -- 면적 및 도색 방식
  area_m2       numeric(8,2) not null,
  coating_type  text
    check (coating_type in (
      'touch_up_1coat', 'repaint_2coat', 'new_plaster_3coat', 'stain', 'specialty'
    )),

  -- 가격 (cents 단위)
  rate_per_m2_cents    integer not null,        -- m² 당 단가
  material_cost_cents  integer default 0 not null,
  labour_cost_cents    integer default 0 not null,

  -- 도료 계산
  paint_litres_needed numeric(6,2),            -- 필요 도료량 (자동 계산)

  -- 티어 (good/better/best 별 다른 단가 지원)
  tier text not null default 'good'
    check (tier in ('good', 'better', 'best')),

  notes text,                                  -- 해당 면 관련 메모

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_quote_room_surfaces_room_id on quote_room_surfaces(room_id);

create trigger quote_room_surfaces_updated_at
  before update on quote_room_surfaces
  for each row execute function update_updated_at_column();

comment on table quote_room_surfaces is '방별 도색 면 상세. 각 면의 단가/면적/코팅 방식 저장';

-- ============================================================
-- 6. invoices — 청구서
-- ============================================================
create table if not exists invoices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict,
  quote_id    uuid references quotes(id) on delete set null, -- 견적 없이도 청구 가능

  -- 청구서 식별
  invoice_number text not null,               -- INV-0001 형식, 유저별 unique

  -- 상태
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),

  -- 청구 유형: 전액/계약금/중도금/잔금
  invoice_type text not null default 'full'
    check (invoice_type in ('full', 'deposit', 'progress', 'final')),

  -- 금액 (cents 단위)
  subtotal_cents    integer default 0 not null,
  gst_cents         integer default 0 not null,
  total_cents       integer default 0 not null,
  amount_paid_cents integer default 0 not null, -- 부분 납부 추적용

  -- 날짜
  due_date date,                               -- 결제 기한
  paid_at  timestamptz,                        -- 실제 납부 일시

  notes text,                                  -- 고객에게 보이는 메모

  unique (user_id, invoice_number),

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_invoices_user_id on invoices(user_id);
create index idx_invoices_user_status on invoices(user_id, status);
create index idx_invoices_user_customer on invoices(user_id, customer_id);

create trigger invoices_updated_at
  before update on invoices
  for each row execute function update_updated_at_column();

comment on table invoices is '청구서. quote_id는 nullable — 견적 없이 직접 청구 가능';
comment on column invoices.amount_paid_cents is '부분 납부 시 납부된 금액 추적';

-- ============================================================
-- 7. invoice_line_items — 청구서 항목
-- ============================================================
create table if not exists invoice_line_items (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,

  description    text not null,
  quantity       numeric(8,2) default 1 not null,
  unit_price_cents integer not null,           -- 단가 (cents)
  gst_cents        integer default 0 not null, -- 항목별 GST
  total_cents      integer not null,           -- quantity * unit_price_cents

  sort_order integer default 0 not null,       -- 항목 순서

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_invoice_line_items_invoice_id on invoice_line_items(invoice_id);

create trigger invoice_line_items_updated_at
  before update on invoice_line_items
  for each row execute function update_updated_at_column();

-- ============================================================
-- 8. subscriptions — Stripe 구독 동기화
-- ============================================================
create table if not exists subscriptions (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,

  -- Stripe 식별자
  stripe_customer_id     text,
  stripe_subscription_id text,

  -- 구독 정보
  plan   text check (plan in ('starter', 'pro')),
  status text check (status in ('active', 'cancelled', 'past_due', 'trialing')),

  -- 현재 구독 기간
  current_period_start timestamptz,
  current_period_end   timestamptz,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_subscriptions_user_id on subscriptions(user_id);
create index idx_subscriptions_stripe_customer on subscriptions(stripe_customer_id);

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at_column();

comment on table subscriptions is 'Stripe 구독 정보 캐시. Stripe webhook으로 동기화';
