-- Quote에 작업 기간(일수) 필드 추가
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS working_days integer;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_working_days_valid
  CHECK (working_days IS NULL OR (working_days >= 1 AND working_days <= 30));

COMMENT ON COLUMN public.quotes.working_days IS
  'Estimated number of working days required for this job. Used by client booking flow.';
