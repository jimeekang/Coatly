-- Jobs 테이블 날짜 범위 지원
-- scheduled_date는 호환성을 위해 유지하되 start_date/end_date 추가
-- 기존 데이터: start_date = scheduled_date, end_date = scheduled_date (단일일 기준)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS duration_days integer;

-- 기존 데이터 마이그레이션
UPDATE public.jobs
SET start_date = scheduled_date,
    end_date = scheduled_date,
    duration_days = 1
WHERE start_date IS NULL AND scheduled_date IS NOT NULL;

-- check constraint
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_date_range_valid
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_duration_days_valid
  CHECK (duration_days IS NULL OR (duration_days >= 1 AND duration_days <= 30));
