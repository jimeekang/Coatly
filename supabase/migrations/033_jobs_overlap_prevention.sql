-- 날짜 범위 중복 방지 function + index
-- NOTE: PostgreSQL exclusion constraints require btree_gist extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 중복 체크 함수 (RPC용)
CREATE OR REPLACE FUNCTION public.check_job_date_overlap(
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
  p_exclude_job_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.jobs
    WHERE user_id = p_user_id
      AND start_date IS NOT NULL
      AND end_date IS NOT NULL
      AND (id != p_exclude_job_id OR p_exclude_job_id IS NULL)
      AND status NOT IN ('cancelled', 'completed')
      AND (start_date, end_date + interval '1 day') OVERLAPS (p_start_date, p_end_date + interval '1 day')
  );
END;
$$;

-- 가용 날짜 조회 함수 (public quote booking용)
-- 보안: user의 job 날짜를 직접 노출하지 않고 blocked boolean만 반환
CREATE OR REPLACE FUNCTION public.get_blocked_dates_for_user(
  p_user_id uuid,
  p_from_date date DEFAULT CURRENT_DATE,
  p_to_date date DEFAULT CURRENT_DATE + interval '90 days'
)
RETURNS TABLE(blocked_date date)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT generate_series(j.start_date, j.end_date, interval '1 day')::date
  FROM public.jobs j
  WHERE j.user_id = p_user_id
    AND j.start_date IS NOT NULL
    AND j.end_date IS NOT NULL
    AND j.status NOT IN ('cancelled', 'completed')
    AND j.start_date <= p_to_date
    AND j.end_date >= p_from_date;
END;
$$;

COMMENT ON FUNCTION public.check_job_date_overlap IS
  'Checks if a date range overlaps with existing active jobs for a user. Used by booking validation.';

COMMENT ON FUNCTION public.get_blocked_dates_for_user IS
  'Returns blocked dates for a user. Used by public booking calendar. Does not expose job details.';
