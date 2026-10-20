-- supabase/ako_app_download.sql
-- "Download the mobile app" — admin-managed store links + a directly downloadable Android APK.
--
--   • app_download_settings: a SINGLE row (id = 1) holding the Google Play URL, the App Store URL and
--     the metadata of the currently uploaded APK. Any signed-in user can read it (the Settings CTA and
--     the download modal need it); only admins (admin_roles, via is_admin_or_moderator) can change it.
--   • app-releases bucket: PUBLIC read (an APK is not a secret, and a plain link keeps the browser's
--     download + install flow simple), admin-only write. Each upload goes to a NEW object path and the
--     old object is deleted afterwards, so "replace the APK" never serves a stale CDN-cached file.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.app_download_settings (
  id              smallint primary key default 1 check (id = 1),
  android_store_url text,
  ios_store_url     text,
  apk_path          text,
  apk_file_name     text,
  apk_size_bytes    bigint,
  apk_uploaded_at   timestamptz,
  updated_at        timestamptz not null default now(),
  updated_by        uuid references auth.users (id) on delete set null,
  -- Store links are opened straight from a click, so only real web links are allowed (no javascript:, etc.).
  constraint app_download_android_url_https check (android_store_url is null or android_store_url ~* '^https?://\S+$'),
  constraint app_download_ios_url_https     check (ios_store_url     is null or ios_store_url     ~* '^https?://\S+$')
);

insert into public.app_download_settings (id) values (1) on conflict (id) do nothing;

alter table public.app_download_settings enable row level security;

drop policy if exists "Authenticated users can read app download settings" on public.app_download_settings;
create policy "Authenticated users can read app download settings"
  on public.app_download_settings for select to authenticated
  using (true);

drop policy if exists "Admins can insert app download settings" on public.app_download_settings;
create policy "Admins can insert app download settings"
  on public.app_download_settings for insert to authenticated
  with check (public.is_admin_or_moderator((select auth.uid())));

drop policy if exists "Admins can update app download settings" on public.app_download_settings;
create policy "Admins can update app download settings"
  on public.app_download_settings for update to authenticated
  using (public.is_admin_or_moderator((select auth.uid())))
  with check (public.is_admin_or_moderator((select auth.uid())));

-- ---------------------------------------------------------------------------------------------
-- Storage: public bucket for the APK. 200 MB per file (the project's own global upload limit, set in
-- Supabase > Storage settings, still applies on top of this — raise it there if an APK is larger).
-- ---------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('app-releases', 'app-releases', true, 209715200)
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit;

drop policy if exists "App releases are publicly readable" on storage.objects;
create policy "App releases are publicly readable"
  on storage.objects for select
  using (bucket_id = 'app-releases');

drop policy if exists "Admins can upload app releases" on storage.objects;
create policy "Admins can upload app releases"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'app-releases' and public.is_admin_or_moderator((select auth.uid())));

drop policy if exists "Admins can update app releases" on storage.objects;
create policy "Admins can update app releases"
  on storage.objects for update to authenticated
  using (bucket_id = 'app-releases' and public.is_admin_or_moderator((select auth.uid())));

drop policy if exists "Admins can delete app releases" on storage.objects;
create policy "Admins can delete app releases"
  on storage.objects for delete to authenticated
  using (bucket_id = 'app-releases' and public.is_admin_or_moderator((select auth.uid())));
