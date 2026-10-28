-- ako_discover_projects.sql
--
-- Discover listing for one project type, ranked by relevance (how many of the
-- project's topics match the signed-in viewer's interests), then popularity
-- (likes, then downloads), then — for time-bound kinds — soonest first, then newest.
--
-- Only projects with complete basics are listed: a title, a description and a
-- thumbnail. The Files type is never listed on Discover. Private, inactive and
-- unpublished (courses) projects are excluded, as are events/meetings/cohorts
-- that are already over.
--
-- p_kind (added with the groups work, ako_groups_discover) narrows room results to
-- one room kind; null = all kinds. Callers that don't pass it are unaffected.
--
-- This file mirrors the definition deployed on the production "Ako" project.
-- Security invoker (the default): the caller's RLS applies. Signed-out callers
-- have no interests, so they simply get popularity order.

-- The first version took three arguments; drop it so there is never an ambiguous overload.
drop function if exists public.discover_projects(text, integer, integer);

create or replace function public.discover_projects(p_type text, p_offset integer, p_limit integer, p_kind text default null)
returns table (project jsonb, when_at text)
language sql
stable
set search_path to 'public'
as $function$
  select
    to_jsonb(p) as project,
    coalesce(ev.event_date::text, mt.scheduled_at::text, rm.start_date::text) as when_at
  from public.projects p
  left join public.project_event_details ev on ev.project_id = p.id
  left join public.project_meeting_details mt on mt.project_id = p.id
  left join public.project_room_details rm on rm.project_id = p.id
  where p.project_type = p_type
    and p.project_type <> 'file'
    and p.status = 'active'
    and p.is_active = true
    and p.is_private = false
    and nullif(btrim(p.title), '') is not null
    and nullif(btrim(p.description), '') is not null
    and nullif(btrim(p.thumbnail_url), '') is not null
    and (p.project_type <> 'course' or p.published_at is not null)
    and (p.project_type <> 'event' or ev.event_date >= now())
    and (p.project_type <> 'meeting'
         or (mt.status in ('scheduled', 'live') and (mt.scheduled_at >= now() or mt.status = 'live')))
    and (p.project_type <> 'room' or rm.end_date is null or rm.end_date >= current_date)
    and (p_kind is null or p.project_type <> 'room' or rm.kind = p_kind)
  order by
    (select count(*)
       from public.project_topics pt
       join public.user_interests ui on ui.interest_id = pt.interest_id and ui.user_id = auth.uid()
      where pt.project_id = p.id) desc,
    p.like_count desc,
    coalesce(p.download_count, 0) desc,
    coalesce(ev.event_date::text, mt.scheduled_at::text, rm.start_date::text) asc nulls last,
    p.created_at desc
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 50);
$function$;

grant execute on function public.discover_projects(text, integer, integer, text) to anon, authenticated;
