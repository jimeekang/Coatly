-- Durable rate limiting for public, unauthenticated routes.

create table if not exists public.public_route_rate_limits (
  route_key text not null,
  ip_hash text not null,
  window_start timestamptz not null default now(),
  hit_count integer not null default 0 check (hit_count >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (route_key, ip_hash)
);

create index if not exists public_route_rate_limits_expires_at_idx
  on public.public_route_rate_limits (expires_at);

alter table public.public_route_rate_limits enable row level security;

revoke all on table public.public_route_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.public_route_rate_limits to service_role;

create or replace function public.check_public_route_rate_limit(
  p_route_key text,
  p_ip_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  hit_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_window interval;
  v_limit public.public_route_rate_limits%rowtype;
begin
  if nullif(btrim(p_route_key), '') is null then
    raise exception 'route key is required' using errcode = '22023';
  end if;

  if nullif(btrim(p_ip_hash), '') is null then
    raise exception 'IP hash is required' using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 1 then
    raise exception 'rate limit must be greater than zero' using errcode = '22023';
  end if;

  if p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'rate limit window must be greater than zero' using errcode = '22023';
  end if;

  v_window := make_interval(secs => p_window_seconds);

  delete from public.public_route_rate_limits
  where expires_at < v_now - interval '1 hour';

  insert into public.public_route_rate_limits as limits (
    route_key,
    ip_hash,
    window_start,
    hit_count,
    expires_at,
    created_at,
    updated_at
  )
  values (
    p_route_key,
    p_ip_hash,
    v_now,
    1,
    v_now + v_window,
    v_now,
    v_now
  )
  on conflict (route_key, ip_hash) do update
  set
    window_start = case
      when limits.expires_at <= v_now then v_now
      else limits.window_start
    end,
    hit_count = case
      when limits.expires_at <= v_now then 1
      else limits.hit_count + 1
    end,
    expires_at = case
      when limits.expires_at <= v_now then v_now + v_window
      else limits.expires_at
    end,
    updated_at = v_now
  returning * into v_limit;

  allowed := v_limit.hit_count <= p_limit;
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      1,
      ceil(extract(epoch from (v_limit.expires_at - v_now)))::integer
    )
  end;
  hit_count := v_limit.hit_count;

  return next;
end;
$$;

revoke all on function public.check_public_route_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_public_route_rate_limit(text, text, integer, integer)
  to service_role;
