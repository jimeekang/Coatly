# Generated: DB Schema Summary

> ⚠️ 이 파일은 참조용 스냅샷입니다. 정확한 스키마는 `supabase/migrations/`와 `types/database.ts`를 확인하세요.
> 마지막 업데이트: 2026-06-27 (local migrations through `20260626233327_quote_estimate_item_task2_categories.sql`, live Supabase CLI verification 기준)
> 원격 Supabase migration history는 로컬 `supabase/migrations/`와 일치하도록 정리했습니다.

## Tables

### profiles

`user_id(PK) | business_name | abn | email | phone | address | bank_details | logo_url | onboarding_completed`

### businesses

`id(PK) | user_id(FK) | address | logo | default_rates`

### customers

`id(PK) | user_id(FK) | name | email | phone | company_name | address | notes | is_archived`

### quotes

`id(PK) | user_id(FK) | customer_id(FK) | customer_email(snapshot) | customer_address(snapshot) | quote_number | title | status | job_type | tier(complexity) | estimate_category | estimate_mode | pricing_method | pricing_snapshot | pricing_method_inputs | margins | totals_cents | working_days | valid_until | public_share_token | public_share_expires_at | public_share_revoked_at | approved_at/by/signature | notes`

### quote_rooms

`id(PK) | quote_id(FK) | name | room_type | dimensions(m) | sort_order`

### quote_room_surfaces

`id(PK) | room_id(FK) | surface_type | area_sqm | coating_type | rate_per_sqm_cents | costs_cents | tier(complexity) | notes`

### quote_estimate_items

`id(PK) | quote_id(FK) | scope_section_id(FK,nullable) | category(entire_property|room|room_anchor|door|window|trim|skirting|modifier|quick_estimate) | label | quantity | unit_price_cents | total_cents | size | selected_surfaces | coating_multiplier_pct | condition_multiplier_pct | item_notes | metadata`

### quote_scope_sections

`id(PK) | quote_id(FK) | section_kind(interior|exterior|maintenance|general|optional) | title | description | area_label | surface_category | is_optional | is_selected | pricing_status | measurement_status | source | sort_order | metadata`

### quote_scope_steps

`id(PK) | section_id(FK) | label | step_type | description | prep_type | paint_system | coats_min/max | product_name | colour_status | colour | sheen | requires_confirmation | is_customer_visible | sort_order | metadata`

### quote_clause_items

`id(PK) | quote_id(FK) | section_id(FK,nullable) | clause_key | title | body | category | severity | source | is_customer_visible | sort_order | metadata`

### quote_ai_intake_snapshots

`id(PK) | quote_id(FK) | painter_user_id(FK) | job_type | maintenance_job_pack | provider | model | prompt_version | input_json | output_json | photo_refs | price_rates_snapshot_id | metadata`

### invoices

`id(PK) | user_id(FK) | customer_id(FK) | quote_id(FK,nullable) | invoice_number | status | invoice_type | totals_cents | amount_paid_cents | due_date | paid_at | public_share_token`

### invoice_line_items

`id(PK) | invoice_id(FK) | description | quantity | unit_price_cents | gst_cents | total_cents | sort_order`

### invoice_reminder_events

`id(PK) | user_id(FK) | invoice_id(FK) | reminder_type(due_soon|overdue) | status(pending|sent|failed) | scheduled_for | resend_message_id | attempt_count | last_attempted_at | sent_at | error_message | metadata`

### jobs

`id(PK) | user_id(FK) | customer_id(FK) | quote_id(FK,nullable) | title | status | scheduled_date | start_date | end_date | duration_days | schedule_source | google_sync_status | notes`

### job_schedule_days

`id(PK) | user_id(FK) | job_id(FK) | date | sort_order`

### job_variations

`id(PK) | user_id(FK) | job_id(FK) | name | quantity | unit_price_cents | total_cents | notes | sort_order`

### schedule_events

`id(PK) | user_id(FK) | title | date | start_time | end_time | is_all_day | location | notes`

### material_items

`id(PK) | user_id(FK) | category | name | unit | unit_price_cents | is_active | sort_order | notes`

### quote_line_items

`id(PK) | quote_id(FK) | material_item_id(FK,nullable) | scope_section_id(FK,nullable) | name | category | unit | quantity | unit_price_cents | total_cents | is_optional | is_selected | sort_order`

### subscriptions

`id(PK) | user_id(FK,UNIQUE) | stripe_customer_id | stripe_subscription_id | plan | status | period_start/end | cancel_at | cancel_at_period_end`

### google_calendar_connections

`user_id(PK/FK) | google_account_email | encrypted_refresh_token | granted_scopes | is_active | last_sync_at | last_sync_error`

### google_calendar_settings

`user_id(PK/FK) | display_calendar_id | availability_calendar_id | event_destination_calendar_id | timezone`

### ai_usage_events

`id(PK) | user_id(FK) | action | provider | model | status(completed|failed) | input_tokens | output_tokens | total_tokens | latency_ms | request_id | error_message | metadata | created_at`

### public_quote_events

`id(PK) | user_id(FK) | quote_id(FK) | event_type | public_share_token | actor_name | actor_email | ip_hash | user_agent_hash | error_message | metadata | created_at`

### public_route_rate_limits

`route_key(PK) | ip_hash(PK) | window_start | hit_count | expires_at | created_at | updated_at`

## Storage Buckets

| Bucket | 접근               | 용도          |
| ------ | ------------------ | ------------- |
| logos  | Private (per user) | 비즈니스 로고 |
| photos | Private (per user) | 현장 사진     |

## Migrations (001–049 + timestamped migrations)

총 49개 numbered migration과 3개 timestamped migration이 있습니다. 041–049는 detailed quick estimate, invoice public PDF token, RPC 권한 축소, trigger search_path hardening, RLS/linter 성능 보정을 포함합니다. `20260524022420_050_quote_form_structure.sql`은 customer-visible scope/steps/clauses/AI intake snapshot 구조를 추가합니다. `20260626233104_public_route_rate_limits.sql`은 public quote durable rate limit용 Supabase-backed counter와 service-role-only RPC를 추가합니다. `20260626233327_quote_estimate_item_task2_categories.sql`은 `quote_estimate_items.category`에 `room_anchor`, `trim`, `quick_estimate`를 허용합니다.
