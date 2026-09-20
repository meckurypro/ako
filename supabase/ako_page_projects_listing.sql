-- ako_page_projects_listing.sql
--
-- Lists the projects attributed to a Page (projects.posted_as_page_id),
-- for the Projects tab on /page/:username.
--
-- Why an RPC and not a plain select: RLS on projects only exposes
-- is_active rows (or your own), so a plain query can't express "public
-- projects to everyone, plus the team's own work-in-progress to the
-- team". Same reasoning — and same SECURITY DEFINER shape — as
-- get_profile_projects.
--
-- Visibility:
--   * Everyone:       active AND public projects.
--   * The creator:    their own non-archived projects (drafts included —
--                     a Course starts as a draft, and the person who is
--                     building it has to be able to find it again).
--   * Active members: active private projects (RLS already lets anyone
--                     holding the URL read those, so this only affects
--                     whether the team sees them listed).
--   Drafts by a *teammate* stay unlisted: RLS wouldn't let the viewer
--   open them anyway, so listing them would only produce dead links.
--   Archived projects are never listed (they live on the creator's
--   Archive screen).

create or replace function public.get_page_projects(p_page_id uuid)
returns setof public.projects
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.projects p
  where p.posted_as_page_id = p_page_id
    and (
      (p.status = 'active' and p.is_private = false)
      or (p.status <> 'archived' and p.owner_id = auth.uid())
      or (
        p.status = 'active'
        and exists (
          select 1
          from public.page_members pm
          where pm.page_id = p_page_id
            and pm.user_id = auth.uid()
            and pm.status = 'active'
        )
      )
    )
  order by p.created_at desc;
$$;

revoke all on function public.get_page_projects(uuid) from public;
grant execute on function public.get_page_projects(uuid) to anon, authenticated;
