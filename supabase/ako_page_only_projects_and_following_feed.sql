-- ako_page_only_projects_and_following_feed.sql
--
-- Content published as a Page belongs to that Page, not to the team member
-- who happened to publish it (author_id / owner_id still record who, for
-- accountability and edit rights).
--
-- 1. Projects: exclude page projects from the creator's personal profile
--    listings. Pages can only publish event / room / course / book / url
--    (PROJECT_TYPE_ACCESS), so only the two functions that list those
--    types by owner need the filter.
-- 2. Following feed: a followed *person's* page posts no longer show up
--    under them; page posts appear when the viewer follows the *page*
--    (public.page_follows). Done as an in-place edit of the deployed
--    function so nothing else in it can drift.

-- 1a. get_profile_projects ---------------------------------------------
create or replace function public.get_profile_projects(p_profile_id uuid, p_viewer_id uuid)
returns setof projects
language sql
stable
security definer
set search_path to 'public'
as $function$
  SELECT p.*
  FROM public.projects p
  WHERE p.owner_id = p_profile_id
    AND p.posted_as_page_id IS NULL
    AND p.status = 'active'
    AND (
      p.is_private = false
      OR (
        p_viewer_id = auth.uid()
        AND (
          p_viewer_id = p_profile_id
          OR EXISTS (
            SELECT 1 FROM public.purchases pur
            WHERE pur.project_id = p.id AND pur.buyer_id = p_viewer_id
          )
          OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = p_viewer_id
          )
          OR EXISTS (
            SELECT 1 FROM public.room_members rm
            WHERE rm.project_id = p.id AND rm.user_id = p_viewer_id
          )
          OR EXISTS (
            SELECT 1 FROM public.event_tickets et
            WHERE et.project_id = p.id AND et.buyer_id = p_viewer_id AND et.refunded_at IS NULL
          )
        )
      )
    )
  ORDER BY p.created_at DESC;
$function$;

-- 1b. get_profile_type_categories --------------------------------------
create or replace function public.get_profile_type_categories(p_account_id uuid)
returns table(category text, project_type text, project_count bigint)
language sql
stable
set search_path to 'public'
as $function$
  select
    case p.project_type
      when 'book' then 'Books'
      when 'course' then 'Courses'
      when 'event' then 'Events'
      when 'room' then 'Rooms'
      when 'file' then 'Files'
    end as category,
    p.project_type,
    count(*) as project_count
  from public.projects p
  where p.owner_id = p_account_id
    and p.posted_as_page_id is null
    and p.status = 'active'
    and p.is_private = false
    and p.project_type in ('book', 'course', 'event', 'room', 'file')
  group by p.project_type
  having count(*) > 0;
$function$;

-- 2. get_following_feed ---------------------------------------------------
do $$
declare
  d   text := pg_get_functiondef('public.get_following_feed(uuid, integer, integer)'::regprocedure);
  old text := 'AND p.author_id IN (SELECT id FROM following)';
  new text := 'AND (
      (p.posted_as_page_id IS NULL AND p.author_id IN (SELECT id FROM following))
      OR (p.posted_as_page_id IS NOT NULL AND p.posted_as_page_id IN (
        SELECT pf.page_id FROM public.page_follows pf WHERE pf.follower_id = p_viewer_id
      ))
    )';
begin
  -- Refuse to run against a function that has drifted from what this
  -- edit was written for, rather than silently doing nothing.
  if (length(d) - length(replace(d, old, ''))) / length(old) <> 1 then
    raise exception 'get_following_feed does not contain exactly one match for the expected filter; not modified';
  end if;
  execute replace(d, old, new);
end $$;
