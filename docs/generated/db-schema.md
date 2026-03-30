# Generated: DB Schema Summary

> ⚠️ 이 파일은 참조용 스냅샷입니다. 정확한 스키마는 `supabase/migrations/`와 `types/database.ts`를 확인하세요.
> 마지막 업데이트: 2026-03-29 (migration 013 기준)

## Tables

### profiles
`user_id(PK) | business_name | abn | email | phone | address | bank_details | logo_url | onboarding_completed`

### businesses
`id(PK) | user_id(FK) | address | logo | default_rates`

### customers
`id(PK) | user_id(FK) | name | email | phone | company_name | address | notes | is_archived`

### quotes
`id(PK) | user_id(FK) | customer_id(FK) | quote_number | title | status | tier | margins | totals_cents | valid_until | notes`

### quote_rooms
`id(PK) | quote_id(FK) | name | room_type | dimensions(m) | sort_order`

### quote_room_surfaces
`id(PK) | room_id(FK) | surface_type | area_m2 | coating_type | rate_per_m2_cents | costs_cents | tier | notes`

### invoices
`id(PK) | user_id(FK) | customer_id(FK) | quote_id(FK,nullable) | invoice_number | status | invoice_type | totals_cents | amount_paid_cents | due_date | paid_at`

### invoice_line_items
`id(PK) | invoice_id(FK) | description | quantity | unit_price_cents | gst_cents | total_cents | sort_order`

### subscriptions
`id(PK) | user_id(FK,UNIQUE) | stripe_customer_id | stripe_subscription_id | plan | status | period_start/end | cancel_at | cancel_at_period_end`

## Storage Buckets

| Bucket | 접근 | 용도 |
|--------|------|------|
| logos | Private (per user) | 비즈니스 로고 |
| photos | Private (per user) | 현장 사진 |

## Migrations (001–013)

총 13개 마이그레이션. 상세 내용은 `supabase/migrations/` 디렉토리 참조.
