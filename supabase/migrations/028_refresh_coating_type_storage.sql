-- ============================================================
-- 028_refresh_coating_type_storage.sql
-- Canonicalise refresh coating keys across quote storage and rate presets
-- ============================================================

-- 1. Quote room surfaces: update legacy stored values first, then tighten the check.
update public.quote_room_surfaces
set coating_type = 'refresh_1coat'
where coating_type = 'touch_up_1coat';

alter table public.quote_room_surfaces
  drop constraint if exists quote_room_surfaces_coating_type_check;

alter table public.quote_room_surfaces
  add constraint quote_room_surfaces_coating_type_check
  check (
    coating_type in (
      'refresh_1coat',
      'repaint_2coat',
      'new_plaster_3coat',
      'stain',
      'specialty'
    )
  );

comment on column public.quote_room_surfaces.coating_type is
  'Coating system for the surface. refresh_1coat is the canonical 1-coat refresh value.';

-- 2. Quote estimate payloads: rename any legacy wall_paint_system value and
-- backfill repaint_2coat on interior estimates that predate the new field.
update public.quotes
set estimate_context = jsonb_set(
  estimate_context,
  '{wall_paint_system}',
  to_jsonb('refresh_1coat'::text),
  true
)
where estimate_context ->> 'wall_paint_system' = 'touch_up_2coat';

update public.quotes
set estimate_context = jsonb_set(
  estimate_context,
  '{wall_paint_system}',
  to_jsonb('repaint_2coat'::text),
  true
)
where estimate_category = 'interior'
  and coalesce(estimate_context ->> 'wall_paint_system', '') = '';

-- 3. Businesses.default_rates: rename touch_up_2coat to refresh_1coat for every
-- stored surface object without disturbing unrelated JSON keys.
do $$
declare
  business_row record;
  surface_name text;
  next_rates jsonb;
  surface_rates jsonb;
begin
  for business_row in
    select user_id, default_rates
    from public.businesses
    where default_rates is not null
  loop
    next_rates := business_row.default_rates;

    foreach surface_name in array array['walls', 'ceiling', 'trim', 'doors', 'windows']
    loop
      surface_rates := next_rates -> surface_name;

      if jsonb_typeof(surface_rates) = 'object' and surface_rates ? 'touch_up_2coat' then
        if not (surface_rates ? 'refresh_1coat') then
          surface_rates := jsonb_set(
            surface_rates,
            '{refresh_1coat}',
            surface_rates -> 'touch_up_2coat',
            true
          );
        end if;

        surface_rates := surface_rates - 'touch_up_2coat';
        next_rates := jsonb_set(next_rates, array[surface_name], surface_rates, true);
      end if;
    end loop;

    if next_rates is distinct from business_row.default_rates then
      update public.businesses
      set
        default_rates = next_rates,
        updated_at = now()
      where user_id = business_row.user_id;
    end if;
  end loop;
end
$$;
