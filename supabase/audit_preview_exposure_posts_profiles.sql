-- supabase/audit_preview_exposure_posts_profiles.sql
--
-- READ-ONLY audit for the link-preview endpoint (api/share.ts) when it unfurls
-- /post/:id and /profile/:username. Run in the Supabase SQL editor. Changes nothing.
--
-- The endpoint looks posts/profiles up with the anon key, so RLS decides what a
-- signed-out visitor (and therefore a link-preview bot) can read; the endpoint
-- then additionally requires public + published + not deleted/archived and an
-- approved, non-private author. These queries show what anon can read today.
-- If a query returns rows you didn't expect, tighten the RLS policy — the
-- preview can never show more than anon can already select.

-- 1) Is anon allowed to read these tables at all? (no rows = previews stay generic)
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public'
  and table_name in ('posts', 'profiles', 'pages')
order by table_name, privilege_type;

-- 2) RLS policies that apply to anon / public on those tables.
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('posts', 'profiles', 'pages')
  and (roles @> '{anon}' or roles @> '{public}')
order by tablename, policyname;

-- 3) What does a signed-out visitor actually see? Expect 0 for every row below.
set local role anon;
select count(*) as followers_only_posts_visible_to_anon from public.posts where visibility <> 'public';
select count(*) as draft_or_scheduled_posts_visible_to_anon from public.posts where status is not null and status <> 'published';
select count(*) as deleted_or_archived_posts_visible_to_anon from public.posts where is_deleted or is_archived;
select count(*) as private_profiles_visible_to_anon from public.profiles where is_private;
reset role;
