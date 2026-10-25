-- supabase/ako_automation_catalog.sql
--
-- AKỌ: the catalog behind the admin "Automate posts" screen. The screen itself names no template and no news
-- provider. It reads three small tables and builds its dropdowns, settings and presets from them, so adding a way of
-- automating is a row here (plus engine support in run-post-automation), not a change to the app.
--
--   automation_templates         what an account can be: its label, which panels it shows and its tunable settings.
--   automation_source_providers  the feeds a template with sources can read from.
--   automation_source_presets    ready made source configurations for a provider.
--
-- A template or provider also needs code in supabase/functions/run-post-automation to actually do anything. A template
-- the engine doesn't know behaves like the plain brief and ideas account.
--
-- Safe to run more than once. Seeds never overwrite a row you have edited.

create table if not exists public.automation_templates (
  id text primary key check (id ~ '^[a-z][a-z0-9_]{1,31}$'),
  label text not null check (char_length(label) between 1 and 60),
  description text not null default '',
  -- Which template specific panels the account screen shows.
  uses_idea_vault boolean not null default false,
  uses_sources boolean not null default false,
  -- Tunable settings, stored in automated_accounts.news_settings. A list of
  -- { key, label, help, min, max, default }. Numbers only for now.
  settings jsonb not null default '[]'::jsonb check (jsonb_typeof(settings) = 'array'),
  sort_order int not null default 100,
  is_active boolean not null default true
);

create table if not exists public.automation_source_providers (
  id text primary key check (id ~ '^[a-z][a-z0-9_]{1,31}$'),
  label text not null check (char_length(label) between 1 and 60),
  needs_key boolean not null default false,
  -- Shown under the config box when adding or editing a source.
  config_help text not null default '',
  -- What a new source of this provider starts with.
  blank_config jsonb not null default '{}'::jsonb check (jsonb_typeof(blank_config) = 'object'),
  sort_order int not null default 100,
  is_active boolean not null default true
);

create table if not exists public.automation_source_presets (
  id text primary key check (id ~ '^[a-z][a-z0-9_]{1,47}$'),
  provider_id text not null references public.automation_source_providers (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  note text not null default '',
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  sort_order int not null default 100,
  is_active boolean not null default true
);

alter table public.automation_templates enable row level security;
alter table public.automation_source_providers enable row level security;
alter table public.automation_source_presets enable row level security;

-- Admins read the catalog. Nobody writes it from the app: edit it here, in SQL.
drop policy if exists automation_templates_read on public.automation_templates;
create policy automation_templates_read on public.automation_templates
  for select using (public.is_admin_or_moderator(auth.uid()));

drop policy if exists automation_source_providers_read on public.automation_source_providers;
create policy automation_source_providers_read on public.automation_source_providers
  for select using (public.is_admin_or_moderator(auth.uid()));

drop policy if exists automation_source_presets_read on public.automation_source_presets;
create policy automation_source_presets_read on public.automation_source_presets
  for select using (public.is_admin_or_moderator(auth.uid()));

grant select on public.automation_templates, public.automation_source_providers, public.automation_source_presets
  to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Seeds
-- ---------------------------------------------------------------------------------------------------------------

insert into public.automation_templates (id, label, description, uses_idea_vault, uses_sources, settings, sort_order)
values
  (
    'knowledge',
    'Brief and ideas',
    'Writes from the brief and the idea vault, with no outside sources.',
    true,
    false,
    '[]'::jsonb,
    10
  ),
  (
    'news',
    'News desk',
    'Collects fresh articles from the sources you add, groups them into stories, writes about stories not yet covered and adds a sources line to each post. The idea vault is not used.',
    false,
    true,
    '[
      {"key":"lookback_hours","label":"Look back (hours)","help":"How far back to collect articles.","min":6,"max":120,"default":36},
      {"key":"min_sources","label":"Outlets to trust a story","help":"How many different outlets must report a story before it is used.","min":1,"max":5,"default":2},
      {"key":"max_stories","label":"Stories to consider","help":"How many of the best stories the writer chooses from.","min":1,"max":12,"default":6}
    ]'::jsonb,
    20
  )
on conflict (id) do nothing;

insert into public.automation_source_providers (id, label, needs_key, config_help, blank_config, sort_order)
values
  (
    'newsdata',
    'NewsData.io',
    true,
    'A list of requests, each with the NewsData latest endpoint parameters (country, category, language, q and so on). Every request costs one credit per page. On the free plan articles arrive about 12 hours late and each request returns 10.',
    '{"requests":[{"country":"ng","category":"top","language":"en"}]}'::jsonb,
    10
  ),
  (
    'gdelt',
    'GDELT',
    false,
    'A list of requests, each with a GDELT query, timespan and maxrecords. No key needed. Headlines only, and about 6 seconds per extra request.',
    '{"requests":[{"query":"Nigeria sourcelang:english","timespan":"1d","maxrecords":75}]}'::jsonb,
    20
  )
on conflict (id) do nothing;

insert into public.automation_source_presets (id, provider_id, label, note, config, sort_order)
values
  (
    'africa_newsdata',
    'newsdata',
    'Africa, NewsData.io',
    'Twenty countries across four requests, plus international reporting about Africa. Uses 5 credits per fetch.',
    '{"requests":[
      {"country":"ng,gh,ke,za,eg","category":"politics,business,technology,top","language":"en"},
      {"country":"ng,gh,ke,za,eg","category":"entertainment,lifestyle,science,world","language":"en"},
      {"country":"ma,tz,ug,et,sn","category":"politics,business,technology,top","language":"en"},
      {"country":"rw,zm,zw,ci,cm","category":"politics,business,technology,top","language":"en"},
      {"q":"Africa OR African","category":"politics,business,technology,entertainment,lifestyle","language":"en"}
    ]}'::jsonb,
    10
  ),
  (
    'africa_gdelt',
    'gdelt',
    'Africa, GDELT',
    'Free, no key. Headlines only, so it adds breadth rather than detail.',
    '{"requests":[{"query":"(Africa OR Nigeria OR Ghana OR Kenya OR \"South Africa\" OR Egypt OR Ethiopia OR ECOWAS OR AfCFTA) sourcelang:english","timespan":"1d","maxrecords":75}]}'::jsonb,
    20
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------------------------------------------
-- Replace the hard coded value lists with references to the catalog, so a new template or provider needs no
-- migration. Existing rows already use catalog ids.
-- ---------------------------------------------------------------------------------------------------------------

alter table public.automated_accounts drop constraint if exists automated_accounts_pipeline_check;
alter table public.automated_accounts drop constraint if exists automated_accounts_pipeline_fkey;
alter table public.automated_accounts
  add constraint automated_accounts_pipeline_fkey
  foreign key (pipeline) references public.automation_templates (id) on update cascade;

alter table public.automation_sources drop constraint if exists automation_sources_provider_check;
alter table public.automation_sources drop constraint if exists automation_sources_provider_fkey;
alter table public.automation_sources
  add constraint automation_sources_provider_fkey
  foreign key (provider) references public.automation_source_providers (id) on update cascade;
