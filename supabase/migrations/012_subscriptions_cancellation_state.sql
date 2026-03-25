alter table subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancel_at timestamptz;

comment on column subscriptions.cancel_at_period_end is
  'Stripe cancel_at_period_end mirror. true면 다음 갱신일에 구독 종료';

comment on column subscriptions.cancel_at is
  'Stripe cancel_at mirror. 예약 취소 시 실제 종료 예정 시각';
