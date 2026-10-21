-- supabase/audit_unpublished_posts_exposure.sql
--
-- READ-ONLY audit. Run in the Supabase SQL editor. Changes nothing.
--
-- Drafts and scheduled posts (posts.status <> 'published') are readable by their author and by admins /
-- moderators ("Authors and admins can always see their own posts") and by NO ONE else. That is intended —
-- but it means the *client* must never list them as if they were live and must label them when opened.
-- (A draft once showed on its author's profile and to an admin, was shared as a link, and then everyone else
-- was told it "is no longer available".) Re-run this after any RLS change on public.posts.

-- 1) Every post that is not live right now, with who owns it. Review anything unexpected.
select p.id, p.status, p.scheduled_for, a.username, p.created_at, p.edited_at,
       left(coalesce(nullif(p.heading, ''), p.content), 50) as snippet
from public.posts p
join public.profiles a on a.id = p.author_id
where p.status <> 'published' and not p.is_deleted
order by p.created_at desc;

-- 2) A signed-out visitor / link-preview bot must see ZERO unpublished posts. Expect 0.
begin;
set local role anon;
select count(*) as unpublished_posts_visible_to_anon from public.posts where status <> 'published';
rollback;

-- 3) Only scheduled posts may ever be auto-published, and only by this function (expect status = 'scheduled'
--    in its WHERE clause). A draft can never be promoted by the cron.
select pg_get_functiondef('public.publish_due_scheduled_posts'::regproc);
