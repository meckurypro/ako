-- supabase/ako_post_automation_news.sql
-- News pipeline for Automate posts (builds on ako_post_automation.sql and ako_post_automation_api_keys.sql).
--
--   * automated_accounts.pipeline        'knowledge' (default: the account writes from its own prompt, like Deep Mind) or
--                                        'news' (the account writes from fresh articles the engine collects first).
--   * automated_accounts.news_settings   per account tuning for the news pipeline, all optional:
--                                        {"lookback_hours": 36, "min_sources": 2, "max_stories": 6}
--   * automation_sources                 the news feeds an account reads. One row per feed, with its own JSON config.
--                                        Providers today: 'newsdata' (needs a key) and 'gdelt' (no key). Adding a provider is
--                                        a code change in run-post-automation/news.ts plus one value in the CHECK below.
--                                        A feed's key lives in Supabase Vault exactly like an account's AI key: admins can
--                                        only SET or CLEAR it, never read it; only the service role reads it at run time.
--   * automation_articles                cache of what the feeds returned, per account. UNIQUE (account_id, url_hash) means
--                                        the same link is never stored twice. 'new' articles are candidates, 'used' ones
--                                        went into a published post. Pruned after 30 days.
--   * automation_runs.source_article_ids / sources   what each published post was built from.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------------------------------------
-- Accounts: pipeline + settings
-- ---------------------------------------------------------------------------------------------
alter table public.automated_accounts
  add column if not exists pipeline      text  not null default 'knowledge',
  add column if not exists news_settings jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'automated_accounts_pipeline_check') then
    alter table public.automated_accounts
      add constraint automated_accounts_pipeline_check check (pipeline in ('knowledge', 'news'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'automated_accounts_news_settings_check') then
    alter table public.automated_accounts
      add constraint automated_accounts_news_settings_check check (jsonb_typeof(news_settings) = 'object');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Sources
-- ---------------------------------------------------------------------------------------------
create table if not exists public.automation_sources (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.automated_accounts (id) on delete cascade,
  provider          text not null check (provider in ('newsdata', 'gdelt')),
  label             text not null check (char_length(label) between 1 and 60),
  is_enabled        boolean not null default true,
  config            jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  api_key_secret_id uuid,
  api_key_last4     text,
  last_fetched_at   timestamptz,
  last_status       text check (last_status is null or last_status in ('ok', 'error')),
  last_error        text,
  last_count        integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (account_id, provider, label)
);

create index if not exists automation_sources_account_idx on public.automation_sources (account_id);

create or replace function public.automation_sources_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.api_key_secret_id := null;
    new.api_key_last4 := null;
  elsif (new.api_key_secret_id is distinct from old.api_key_secret_id
      or new.api_key_last4     is distinct from old.api_key_last4)
     and coalesce(current_setting('automation.key_write', true), '') <> 'on' then
    raise exception 'A source key can only be changed from the source settings' using errcode = '42501';
  end if;

  if new.config ? 'requests' then
    if jsonb_typeof(new.config -> 'requests') <> 'array' then
      raise exception 'config.requests must be a list' using errcode = '22023';
    end if;
    if jsonb_array_length(new.config -> 'requests') > 10 then
      raise exception 'A source can have at most 10 requests' using errcode = '22023';
    end if;
  end if;

  if new.is_enabled and new.provider = 'newsdata' and new.api_key_secret_id is null then
    raise exception 'Add an API key before turning this source on' using errcode = '22023';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists automation_sources_before_write on public.automation_sources;
create trigger automation_sources_before_write
  before insert or update on public.automation_sources
  for each row execute function public.automation_sources_before_write();

-- ---------------------------------------------------------------------------------------------
-- Source keys (Vault). Admin can set / clear; only the service role can read.
-- ---------------------------------------------------------------------------------------------
create or replace function public.automation_set_source_key(p_source_id uuid, p_key text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_src    public.automation_sources%rowtype;
  v_key    text := nullif(btrim(coalesce(p_key, '')), '');
  v_secret uuid;
begin
  if auth.uid() is null or not public.is_admin_or_moderator(auth.uid()) then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if v_key is null or char_length(v_key) < 8 or char_length(v_key) > 400 or v_key ~ '\s' then
    raise exception 'That does not look like a valid API key' using errcode = '22023';
  end if;

  select * into v_src from public.automation_sources where id = p_source_id for update;
  if not found then
    raise exception 'That source no longer exists' using errcode = 'P0002';
  end if;

  perform set_config('automation.key_write', 'on', true);

  if v_src.api_key_secret_id is not null
     and exists (select 1 from vault.secrets where id = v_src.api_key_secret_id) then
    perform vault.update_secret(v_src.api_key_secret_id, v_key);
    v_secret := v_src.api_key_secret_id;
  else
    v_secret := vault.create_secret(
      v_key,
      'automation_source_key_' || p_source_id::text,
      'News source key for an automated account'
    );
  end if;

  update public.automation_sources
     set api_key_secret_id = v_secret, api_key_last4 = right(v_key, 4)
   where id = p_source_id;
end;
$$;

revoke all on function public.automation_set_source_key(uuid, text) from public, anon;
grant execute on function public.automation_set_source_key(uuid, text) to authenticated;

create or replace function public.automation_clear_source_key(p_source_id uuid)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret uuid;
begin
  if auth.uid() is null or not public.is_admin_or_moderator(auth.uid()) then
    raise exception 'Admins only' using errcode = '42501';
  end if;

  select api_key_secret_id into v_secret from public.automation_sources where id = p_source_id for update;
  if not found then
    raise exception 'That source no longer exists' using errcode = 'P0002';
  end if;

  perform set_config('automation.key_write', 'on', true);
  if v_secret is not null then
    delete from vault.secrets where id = v_secret;
  end if;
  update public.automation_sources
     set api_key_secret_id = null,
         api_key_last4 = null,
         is_enabled = case when provider = 'newsdata' then false else is_enabled end
   where id = p_source_id;
end;
$$;

revoke all on function public.automation_clear_source_key(uuid) from public, anon;
grant execute on function public.automation_clear_source_key(uuid) to authenticated;

create or replace function public.automation_get_source_key(p_source_id uuid)
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select s.decrypted_secret
    from public.automation_sources a
    join vault.decrypted_secrets s on s.id = a.api_key_secret_id
   where a.id = p_source_id;
$$;

revoke all on function public.automation_get_source_key(uuid) from public, anon, authenticated;
grant execute on function public.automation_get_source_key(uuid) to service_role;

create or replace function public.automation_sources_cleanup_secret()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if old.api_key_secret_id is not null then
    delete from vault.secrets where id = old.api_key_secret_id;
  end if;
  return old;
end;
$$;

drop trigger if exists automation_sources_cleanup_secret on public.automation_sources;
create trigger automation_sources_cleanup_secret
  after delete on public.automation_sources
  for each row execute function public.automation_sources_cleanup_secret();

-- ---------------------------------------------------------------------------------------------
-- Article cache
-- ---------------------------------------------------------------------------------------------
create table if not exists public.automation_articles (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references public.automated_accounts (id) on delete cascade,
  source_id      uuid references public.automation_sources (id) on delete set null,
  provider       text not null,
  external_id    text,
  url            text not null,
  url_hash       text not null,
  title          text not null,
  summary        text,
  source_name    text,
  source_domain  text,
  source_country text,
  language       text,
  categories     text[] not null default '{}',
  image_url      text,
  published_at   timestamptz not null,
  fetched_at     timestamptz not null default now(),
  status         text not null default 'new' check (status in ('new', 'used', 'skipped')),
  used_run_id    uuid references public.automation_runs (id) on delete set null,
  unique (account_id, url_hash)
);

create index if not exists automation_articles_pick_idx
  on public.automation_articles (account_id, status, published_at desc);
create index if not exists automation_articles_fetched_idx
  on public.automation_articles (fetched_at);

-- ---------------------------------------------------------------------------------------------
-- Run attribution
-- ---------------------------------------------------------------------------------------------
alter table public.automation_runs
  add column if not exists source_article_ids uuid[] not null default '{}',
  add column if not exists sources            jsonb;

-- ---------------------------------------------------------------------------------------------
-- RLS: admins only (the edge function uses the service role)
-- ---------------------------------------------------------------------------------------------
alter table public.automation_sources  enable row level security;
alter table public.automation_articles enable row level security;

drop policy if exists "Admins manage automation sources" on public.automation_sources;
create policy "Admins manage automation sources" on public.automation_sources
  for all to authenticated
  using (public.is_admin_or_moderator(auth.uid()))
  with check (public.is_admin_or_moderator(auth.uid()));

drop policy if exists "Admins read automation articles" on public.automation_articles;
create policy "Admins read automation articles" on public.automation_articles
  for select to authenticated
  using (public.is_admin_or_moderator(auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- Housekeeping: drop cached articles after 30 days, daily at 03:17 UTC.
-- ---------------------------------------------------------------------------------------------
select cron.schedule(
  'automation-prune-articles',
  '17 3 * * *',
  $cron$ delete from public.automation_articles where fetched_at < now() - interval '30 days'; $cron$
);
