-- ============================================================
-- 007_business_profile_address_and_logo_storage.sql
-- Align structured business address fields with profiles and
-- add storage bucket policies for uploaded business logos.
-- ============================================================

alter table public.businesses
  add column if not exists address_line1 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postcode text;

update public.businesses b
set
  address_line1 = coalesce(b.address_line1, p.address_line1),
  city = coalesce(b.city, p.city),
  state = coalesce(b.state, p.state),
  postcode = coalesce(b.postcode, p.postcode),
  address = nullif(
    concat_ws(
      ', ',
      nullif(trim(coalesce(b.address_line1, p.address_line1)), ''),
      nullif(trim(coalesce(b.city, p.city)), ''),
      nullif(trim(coalesce(b.state, p.state)), ''),
      nullif(trim(coalesce(b.postcode, p.postcode)), '')
    ),
    ''
  )
from public.profiles p
where p.user_id = b.user_id;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-assets',
  'business-assets',
  true,
  3145728,
  array['image/png', 'image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "business-assets public read" on storage.objects;
create policy "business-assets public read"
  on storage.objects for select
  using (bucket_id = 'business-assets');

drop policy if exists "business-assets owner insert" on storage.objects;
create policy "business-assets owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'business-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "business-assets owner update" on storage.objects;
create policy "business-assets owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'business-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'business-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "business-assets owner delete" on storage.objects;
create policy "business-assets owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'business-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
