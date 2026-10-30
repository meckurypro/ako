-- supabase/ako_automation_watch_voices.sql
--
-- AKỌ: two more ways of automating, both of which write from what people on Akọ say rather than from a brief.
-- Applied to the live database as migrations add_watch_pipeline and add_voices_pipeline. Engine support lives in
-- supabase/functions/run-post-automation (watch.ts, index.ts, llm.ts). Safe to run more than once.
--
--   watch   "Watch desk"    reads the last day of public posts by people on Akọ, picks the most consequential weakness,
--                           contradiction or questionable assumption, and writes its own post about the underlying issue.
--   voices  "Comment desk"  reads the comment sections instead, listens for the feeling, frustration, fear or division
--                           underneath what people say to each other, and writes about what the conversation reveals.
--
-- Both are anonymous by design (the model never sees who wrote anything, and a draft that names, addresses or copies from
-- them is refused) and both can decline every candidate. A deliberate "nothing deserved a post" ends the run as
-- 'skipped' with an "Editorial pass" note and is never retried.
--
-- Neither template uses the idea vault or news sources, so the global vault / System Bot never queues ideas for them.
-- Settings are stored in automated_accounts.news_settings.

-- ---------------------------------------------------------------------------------------------
-- Catalog rows
-- ---------------------------------------------------------------------------------------------
insert into public.automation_templates (id, label, description, uses_idea_vault, uses_sources, settings, sort_order, is_active)
values (
  'watch',
  'Watch desk',
  'Reads the last day of public posts by people on Akọ, picks the most consequential weakness, contradiction or questionable assumption, and writes its own post about the underlying issue without naming anyone. It can decline every candidate, so a quiet day produces no post. The idea vault and news sources are not used.',
  false,
  false,
  '[{"key":"lookback_hours","label":"Look back (hours)","help":"How far back to read posts by people on Akọ.","min":6,"max":168,"default":24},{"key":"max_candidates","label":"Posts to consider","help":"How many of the most discussed recent posts the writer chooses from.","min":5,"max":40,"default":20}]'::jsonb,
  30,
  true
)
on conflict (id) do nothing;

insert into public.automation_templates (id, label, description, uses_idea_vault, uses_sources, settings, sort_order, is_active)
values (
  'voices',
  'Comment desk',
  'Reads the comment sections on Akọ from the last day, listens for the feeling, frustration, division or contradiction underneath what people are saying, and writes its own post about it without naming or quoting anyone. It can decline every candidate, so a quiet day produces no post. The idea vault and news sources are not used.',
  false,
  false,
  '[{"key":"lookback_hours","label":"Look back (hours)","help":"How far back to read comments by people on Akọ.","min":6,"max":168,"default":24},{"key":"max_candidates","label":"Comment sections to consider","help":"How many of the busiest comment sections the writer chooses from.","min":5,"max":40,"default":15},{"key":"min_comments","label":"People needed in a section","help":"How many different people must have commented before a section is read.","min":1,"max":10,"default":2}]'::jsonb,
  35,
  true
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Which Akọ posts a run was prompted by, so the same post (or comment section) is never examined twice.
-- ---------------------------------------------------------------------------------------------
alter table public.automation_runs
  add column if not exists source_post_ids uuid[] not null default '{}';

-- ---------------------------------------------------------------------------------------------
-- A deliberate "nothing deserved a post today" skip must not be retried like a failure. Same function as before, with
-- 'editorial pass' added to the outcomes that are never retried.
-- ---------------------------------------------------------------------------------------------
create or replace function public.automation_retry_queue()
 returns table(id uuid, account_id uuid, scheduled_for timestamp with time zone)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select r.id, r.account_id, r.scheduled_for
    from automation_runs r
    join automated_accounts a on a.id = r.account_id
   where a.is_enabled
     and r.trigger = 'schedule'
     and r.status in ('failed', 'skipped')
     and r.retry_count < 10
     and r.scheduled_for > now() - interval '6 hours'
     and r.next_retry_at is not null and r.next_retry_at <= now()
     and coalesce(r.error, '') !~* '(missed its slot|rejected this api key|no ai provider key|doesn''t have a model|add a system prompt|missing or deleted|no longer exists|editorial pass)'
     and (a.locked_until is null or a.locked_until < now())
     and not exists (
       select 1 from automation_runs p
        where p.account_id = r.account_id and p.id <> r.id
          and ((p.status = 'published' and p.created_at >= r.scheduled_for) or p.status = 'running')
     )
$function$;
