-- ============================================================
-- 004_onboarding_completed.sql
-- 온보딩 완료 여부 추적 컬럼 추가
-- handle_new_user() 트리거가 profile을 자동 생성하므로
-- onboarding_completed = false → 온보딩 미완료 상태로 시작
-- ============================================================

alter table profiles
  add column if not exists onboarding_completed boolean not null default false;

comment on column profiles.onboarding_completed is
  '온보딩(사업자 정보 입력) 완료 여부. false이면 /onboarding으로 리다이렉트';

-- 기존 유저(이미 가입된)는 완료 처리
-- (새로 배포 전 가입한 유저는 이미 정보를 입력했다고 가정)
-- 운영 환경에서는 아래 줄을 제거하거나 개별 판단 필요
-- update profiles set onboarding_completed = true;
