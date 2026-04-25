# Generated: DB Schema Summary

> ⚠️ 이 파일은 참조용 스냅샷입니다. 정확한 스키마는 `supabase/migrations/`와 `types/database.ts`를 확인하세요.
> 마지막 업데이트: 2026-04-25 (migration 036 기준)

## Tables

### profiles
`user_id(PK) | business_name | abn | email | phone | address | bank_details | logo_url | onboarding_completed`

### businesses
`id(PK) | user_id(FK) | address | logo | default_rates`

### customers
`id(PK) | user_id(FK) | name | email | phone | company_name | address | notes | is_archived`

### quotes
`id(PK) | user_id(FK) | customer_id(FK) | customer_email(snapshot) | customer_address(snapshot) | quote_number | title | status | tier(complexity: standard|moderate|complex) | margins | totals_cents | valid_until | notes`

### quote_rooms
`id(PK) | quote_id(FK) | name | room_type | dimensions(m) | sort_order`

### quote_room_surfaces
`id(PK) | room_id(FK) | surface_type | area_sqm | coating_type | rate_per_sqm_cents | costs_cents | tier(complexity) | notes`

### invoices
`id(PK) | user_id(FK) | customer_id(FK) | quote_id(FK,nullable) | invoice_number | status | invoice_type | totals_cents | amount_paid_cents | due_date | paid_at`

### invoice_line_items
`id(PK) | invoice_id(FK) | description | quantity | unit_price_cents | gst_cents | total_cents | sort_order`

### jobs
`id(PK) | user_id(FK) | customer_id(FK) | quote_id(FK,nullable) | title | status | scheduled_date | start_date | end_date | duration_days | schedule_source | google_sync_status | notes`

### job_variations
`id(PK) | user_id(FK) | job_id(FK) | name | quantity | unit_price_cents | total_cents | notes | sort_order`

### schedule_events
`id(PK) | user_id(FK) | title | date | start_time | end_time | is_all_day | location | notes`

### material_items
`id(PK) | user_id(FK) | category | name | unit | unit_price_cents | is_active | sort_order | notes`

### quote_line_items
`id(PK) | quote_id(FK) | material_item_id(FK,nullable) | name | category | unit | quantity | unit_price_cents | total_cents | is_optional | is_selected | sort_order`

### subscriptions
`id(PK) | user_id(FK,UNIQUE) | stripe_customer_id | stripe_subscription_id | plan | status | period_start/end | cancel_at | cancel_at_period_end`

### google_calendar_connections
`user_id(PK/FK) | google_account_email | encrypted_refresh_token | granted_scopes | is_active | last_sync_at | last_sync_error`

### google_calendar_settings
`user_id(PK/FK) | display_calendar_id | availability_calendar_id | event_destination_calendar_id | timezone`

## Storage Buckets

| Bucket | 접근 | 용도 |
|--------|------|------|
| logos | Private (per user) | 비즈니스 로고 |
| photos | Private (per user) | 현장 사진 |

## Migrations (001–036)

총 36개 마이그레이션. 상세 내용은 `supabase/migrations/` 디렉토리 참조.
