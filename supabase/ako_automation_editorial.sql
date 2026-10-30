-- supabase/ako_automation_editorial.sql
--
-- AKỌ: the Editorial desk, one automated account with four discovery channels. Applied to the live database as migration
-- automation_editorial_desk_template. Engine support lives in supabase/functions/run-post-automation (editorial.ts,
-- index.ts). Safe to run more than once, and it never overwrites a template row that already exists.
--
-- Each run picks the channel furthest below its target share, resolves it to an existing pipeline and behaves like it:
--   knowledge      -> 'knowledge'  the brief and the idea vault
--   research       -> 'knowledge'  no idea vault; examines a popular claim or documented fact, evidence first
--   news           -> 'news'       fresh articles from the account's sources
--   conversations  -> 'watch'      what people on Akọ posted in the last day
-- A channel with nothing to write about hands over to the next one, so a slot is not lost. The shares are targets, not
-- quotas, and live in automated_accounts.news_settings under the keys below. The conversations window uses watch_ names
-- because lookback_hours and max_stories already mean the news window.
--
-- The idea vault and the global vault / System Bot treat an editorial account as a vault account while its knowledge
-- share is above zero (see ako_automation_global_vault.sql).

-- ---------------------------------------------------------------------------------------------
-- Catalog row
-- ---------------------------------------------------------------------------------------------
insert into public.automation_templates (id, label, description, uses_idea_vault, uses_sources, settings, sort_order, is_active)
values (
  'editorial',
  'Editorial desk',
  'Four discovery channels in one account: independent knowledge and reasoning (idea vault), news from the sources you add, what people on Akọ are saying, and historical or intellectual research. Each run picks the channel furthest below its target share, and falls back to another when a channel has nothing worth writing about.',
  true,
  true,
  '[
    {"key":"mix_knowledge","label":"Share: knowledge and reasoning (%)","help":"Target share of posts written from the brief and idea vault.","min":0,"max":100,"default":35},
    {"key":"mix_news","label":"Share: news (%)","help":"Target share of posts written from fresh articles in the sources you add.","min":0,"max":100,"default":25},
    {"key":"mix_conversations","label":"Share: Akọ conversations (%)","help":"Target share of posts prompted by what people on Akọ posted in the last day.","min":0,"max":100,"default":20},
    {"key":"mix_research","label":"Share: history and research (%)","help":"Target share of evidence first posts that examine a popular claim or a documented fact.","min":0,"max":100,"default":20},
    {"key":"lookback_hours","label":"News: look back (hours)","help":"How far back to collect articles.","min":6,"max":120,"default":36},
    {"key":"min_sources","label":"News: outlets to trust a story","help":"How many different outlets must report a story before it is used.","min":1,"max":5,"default":2},
    {"key":"max_stories","label":"News: stories to consider","help":"How many of the best stories the writer chooses from.","min":1,"max":12,"default":6},
    {"key":"watch_lookback_hours","label":"Conversations: look back (hours)","help":"How far back to read posts by people on Akọ.","min":6,"max":168,"default":24},
    {"key":"watch_max_candidates","label":"Conversations: posts to consider","help":"How many of the most discussed recent posts the writer chooses from.","min":5,"max":40,"default":20}
  ]'::jsonb,
  40,
  true
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Which channel a published run came from. Drives the next channel choice. Null for non editorial accounts.
-- ---------------------------------------------------------------------------------------------
alter table public.automation_runs
  add column if not exists channel text;
