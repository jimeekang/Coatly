-- Migrate tier values from good/better/best to standard/moderate/complex.
-- The column stays named "tier" (rename is not needed), only the CHECK constraint
-- and existing row values change.

-- ─── quotes.tier ─────────────────────────────────────────────────────────────

-- Drop old CHECK constraint
alter table public.quotes
  drop constraint if exists quotes_tier_check;

-- Update existing rows
update public.quotes
  set tier = case tier
    when 'good'   then 'standard'
    when 'better' then 'standard'
    when 'best'   then 'complex'
    else tier
  end
  where tier in ('good', 'better', 'best');

-- Add new CHECK constraint
alter table public.quotes
  add constraint quotes_tier_check
  check (tier in ('standard', 'moderate', 'complex'));

-- ─── quote_room_surfaces.tier ────────────────────────────────────────────────

alter table public.quote_room_surfaces
  drop constraint if exists quote_room_surfaces_tier_check;

update public.quote_room_surfaces
  set tier = case tier
    when 'good'   then 'standard'
    when 'better' then 'standard'
    when 'best'   then 'complex'
    else tier
  end
  where tier in ('good', 'better', 'best');

alter table public.quote_room_surfaces
  add constraint quote_room_surfaces_tier_check
  check (tier in ('standard', 'moderate', 'complex'));

comment on column public.quotes.tier is 'Job complexity level: standard (normal access/condition) | moderate (2-storey, minor prep) | complex (scaffolding, heavy prep, heritage)';
comment on column public.quote_room_surfaces.tier is 'Complexity level applied when this surface rate was set';
