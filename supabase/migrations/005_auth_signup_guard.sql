-- ============================================================
-- 005_auth_signup_guard.sql
-- Auth signup guard:
-- - prevent duplicate accounts across email and Google
-- - allow Google only for already-registered emails
-- ============================================================

create or replace function public.before_user_created_signup_guard(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  incoming_email text;
  incoming_provider text;
  existing_has_email boolean := false;
  existing_has_google boolean := false;
begin
  incoming_email := lower(trim(event->'user'->>'email'));
  incoming_provider := coalesce(event->'user'->'app_metadata'->>'provider', 'email');

  if incoming_email is null or incoming_email = '' then
    return '{}'::jsonb;
  end if;

  select
    coalesce(
      (u.app_metadata->>'provider') = 'email'
      or (u.app_metadata->'providers') ? 'email',
      false
    ),
    coalesce(
      (u.app_metadata->>'provider') = 'google'
      or (u.app_metadata->'providers') ? 'google',
      false
    )
  into existing_has_email, existing_has_google
  from auth.users u
  where lower(u.email) = incoming_email
  limit 1;

  if not found then
    existing_has_email := false;
    existing_has_google := false;
  end if;

  if not existing_has_email and not existing_has_google then
    if incoming_provider = 'google' then
      return jsonb_build_object(
        'error',
        jsonb_build_object(
          'http_code', 403,
          'message', 'This Google account is not registered yet. Sign up with email and password first.'
        )
      );
    end if;

    return '{}'::jsonb;
  end if;

  if incoming_provider = 'email' then
    if existing_has_google and not existing_has_email then
      return jsonb_build_object(
        'error',
        jsonb_build_object(
          'http_code', 409,
          'message', 'This email is already registered with Google. Continue with Google instead.'
        )
      );
    end if;

    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 409,
        'message', 'This email is already registered. Sign in instead.'
      )
    );
  end if;

  if incoming_provider = 'google' then
    if existing_has_google then
      return jsonb_build_object(
        'error',
        jsonb_build_object(
          'http_code', 409,
          'message', 'This Google account is already registered. Continue with Google from the login screen.'
        )
      );
    end if;

    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 409,
        'message', 'This email is already registered with email and password. Sign in with email first.'
      )
    );
  end if;

  return jsonb_build_object(
    'error',
    jsonb_build_object(
      'http_code', 400,
      'message', 'Unsupported sign-in provider.'
    )
  );
end;
$$;

comment on function public.before_user_created_signup_guard(jsonb) is
  'Prevents duplicate auth accounts across providers and blocks first-time Google account creation.';

grant usage on schema public to supabase_auth_admin;
grant execute
  on function public.before_user_created_signup_guard(jsonb)
  to supabase_auth_admin;

revoke execute
  on function public.before_user_created_signup_guard(jsonb)
  from authenticated, anon, public;
