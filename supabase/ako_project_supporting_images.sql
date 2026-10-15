-- Project supporting images
-- Applied to "Ako Temp" (khxrbutzwkhrqzuolfvp) as migration `project_supporting_images`.
--
-- Up to 4 extra images per project, in display order. They're revealed ONLY on the
-- project's own page (swipe the thumbnail); grids/lists/cards keep using thumbnail_url.
-- Same text[] pattern as posts.media_urls. Every `SETOF projects` RPC
-- (get_profile_projects, get_page_projects, resolve_project_slug, ...) and every
-- select('*') returns the new column automatically, and the existing owner/admin
-- UPDATE policies already cover it.

alter table public.projects
  add column if not exists supporting_image_urls text[] not null default '{}'::text[];

alter table public.projects
  drop constraint if exists projects_supporting_images_max_4,
  add constraint projects_supporting_images_max_4
    check (coalesce(cardinality(supporting_image_urls), 0) <= 4),
  drop constraint if exists projects_supporting_images_no_nulls,
  add constraint projects_supporting_images_no_nulls
    check (array_position(supporting_image_urls, null) is null);

comment on column public.projects.supporting_image_urls is
  'Up to 4 extra image URLs (display order) swiped through on the project page after the thumbnail. Never shown in lists/grids.';
