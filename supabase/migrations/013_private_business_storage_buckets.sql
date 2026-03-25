-- ============================================================
-- 011_private_business_storage_buckets.sql
-- Lock business file buckets to the authenticated owner's folder
-- and create dedicated private buckets for logos and job photos.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-assets',
  'business-assets',
  false,
  3145728,
  array['image/png', 'image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  false,
  3145728,
  array['image/png', 'image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "business-assets public read" on storage.objects;
drop policy if exists "business-assets owner insert" on storage.objects;
drop policy if exists "business-assets owner update" on storage.objects;
drop policy if exists "business-assets owner delete" on storage.objects;

drop policy if exists "business file owners can read" on storage.objects;
create policy "business file owners can read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('business-assets', 'logos', 'photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "business file owners can insert" on storage.objects;
create policy "business file owners can insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('business-assets', 'logos', 'photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "business file owners can update" on storage.objects;
create policy "business file owners can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('business-assets', 'logos', 'photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('business-assets', 'logos', 'photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "business file owners can delete" on storage.objects;
create policy "business file owners can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('business-assets', 'logos', 'photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
