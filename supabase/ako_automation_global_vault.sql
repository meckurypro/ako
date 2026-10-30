-- supabase/ako_automation_global_vault.sql
-- Global idea vault + System Bot for Automate posts. ADDITIVE: nothing existing is altered except three nullable
-- columns on automation_ideas, so run-post-automation keeps working untouched.
--
--   automation_vault         the global idea vault. Paste any thought here; nobody has to choose an account.
--   automation_system_bot    singleton: the System Bot's own AI provider + key (Vault) and the rotation rules.
--   automation_ideas         stays the per account QUEUE. Each row is one "turn" of a global idea (vault_id set).
--                            status 'pending' = queued, 'used' = Done, so the engine needs no change: it already
--                            picks the account's next pending row and marks it used when the post is published.
--
-- Rules (rotation), enforced in automation_vault_eligible_accounts():
--   * Only an idea with no queued turn can be placed. One account at a time.
--   * A Done idea is untouchable for cooldown_months (6) after its latest Done turn, for every account.
--   * An account that already did an idea cannot do it again until min_other_accounts (3) DIFFERENT accounts have
--     done it since that account's last turn. Each of those turns is at least cooldown_months apart because of the
--     rule above.
--   * Only enabled accounts whose template uses the idea vault take part (knowledge, editorial). An editorial
--     account whose knowledge channel share is 0 is skipped, since its queue would never be read.
--   * An account with queue_cap or more waiting ideas receives no more.
--
-- Placement is done by the assign-vault-ideas edge function (the System Bot): on submit, and hourly through cron for
-- anything waiting or whose cooldown has ended. It may answer "no fit"; nothing is forced into a wrong account.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------------------------------------
-- System Bot (singleton)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.automation_system_bot (
  id                 boolean primary key default true check (id),
  ai_provider        text    not null default 'anthropic' check (ai_provider in ('anthropic', 'openai', 'gemini')),
  ai_model           text    check (ai_model is null or char_length(ai_model) between 1 and 80),
  api_key_secret_id  uuid,
  api_key_last4      text,
  is_enabled         boolean not null default false,
  cooldown_months    integer not null default 6  check (cooldown_months between 1 and 36),
  min_other_accounts integer not null default 3  check (min_other_accounts between 1 and 9),
  queue_cap          integer not null default 15 check (queue_cap between 1 and 100),
  updated_at         timestamptz not null default now()
);

insert into public.automation_system_bot (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Global vault
-- ---------------------------------------------------------------------------------------------
create table if not exists public.automation_vault (
  id            uuid primary key default gen_random_uuid(),
  idea          text not null check (char_length(idea) between 1 and 1000),
  priority      text not null default 'normal' check (priority in ('normal', 'high')),
  -- new: waiting for its first placement. active: has been placed at least once, stays in rotation.
  -- unfit: the System Bot found no account it suits. retired: taken out of rotation by an admin.
  status        text not null default 'new' check (status in ('new', 'active', 'unfit', 'retired')),
  fit_note      text,
  assessed_at   timestamptz,
  next_check_at timestamptz,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);

create index if not exists automation_vault_status_idx on public.automation_vault (status, created_at);

-- ---------------------------------------------------------------------------------------------
-- Turns: the account queue rows now remember which global idea they came from
-- ---------------------------------------------------------------------------------------------
alter table public.automation_ideas
  add column if not exists vault_id      uuid references public.automation_vault (id) on delete cascade,
  add column if not exists assigned_by   text check (assigned_by is null or assigned_by in ('system', 'admin')),
  add column if not exists assigned_note text;

create index if not exists automation_ideas_vault_idx on public.automation_ideas (vault_id, status);

-- One queued turn per global idea, whatever races.
create unique index if not exists automation_ideas_one_open_turn
  on public.automation_ideas (vault_id) where vault_id is not null and status = 'pending';

-- ---------------------------------------------------------------------------------------------
-- RLS: admins only. The System Bot row is read-only from the browser (settings go through functions).
-- ---------------------------------------------------------------------------------------------
alter table public.automation_vault      enable row level security;
alter table public.automation_system_bot enable row level security;

drop policy if exists "Admins manage automation vault" on public.automation_vault;
create policy "Admins manage automation vault" on public.automation_vault
  for all to authenticated
  using (public.is_admin_or_moderator((select auth.uid())))
  with check (public.is_admin_or_moderator((select auth.uid())));

drop policy if exists "Admins read system bot" on public.automation_system_bot;
create policy "Admins read system bot" on public.automation_system_bot
  for select to authenticated
  using (public.is_admin_or_moderator((select auth.uid())));

-- ---------------------------------------------------------------------------------------------
-- Rotation rules: which accounts may take this idea right now
-- ---------------------------------------------------------------------------------------------
create or replace function public.automation_vault_eligible_accounts(p_vault_id uuid)
returns table (account_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with cfg as (
    select cooldown_months, min_other_accounts, queue_cap from public.automation_system_bot limit 1
  ),
  idea as (
    select v.id from public.automation_vault v where v.id = p_vault_id and v.status in ('new', 'active')
  ),
  hist as (
    select i.account_id, i.used_at
      from public.automation_ideas i
     where i.vault_id = p_vault_id and i.status = 'used' and i.used_at is not null
  ),
  gate as (
    select
      not exists (select 1 from public.automation_ideas q where q.vault_id = p_vault_id and q.status = 'pending') as no_open_turn,
      (select max(used_at) from hist) as last_done
  )
  select a.id
    from public.automated_accounts a
    join public.automation_templates t on t.id = a.pipeline and t.uses_idea_vault
   cross join cfg
   cross join gate g
   where exists (select 1 from idea)
     and g.no_open_turn
     and (g.last_done is null or g.last_done <= now() - make_interval(months => cfg.cooldown_months))
     and a.is_enabled
     and (
       a.pipeline <> 'editorial'
       or coalesce(
            case when jsonb_typeof(a.news_settings -> 'mix_knowledge') = 'number'
                 then (a.news_settings ->> 'mix_knowledge')::numeric end,
            35) > 0
     )
     and (select count(*) from public.automation_ideas q where q.account_id = a.id and q.status = 'pending') < cfg.queue_cap
     and (
       not exists (select 1 from hist h where h.account_id = a.id)
       or (
         select count(distinct h2.account_id)
           from hist h2
          where h2.account_id <> a.id
            and h2.used_at > (select max(h3.used_at) from hist h3 where h3.account_id = a.id)
       ) >= cfg.min_other_accounts
     );
$$;

revoke all on function public.automation_vault_eligible_accounts(uuid) from public, anon, authenticated;
grant execute on function public.automation_vault_eligible_accounts(uuid) to service_role;

-- Ideas that need the System Bot's attention: waiting or past their cooldown, with at least one account able to take
-- them, high priority first, then the one that has waited longest.
create or replace function public.automation_vault_due(p_limit integer default 3)
returns table (vault_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select v.id
    from public.automation_vault v
   where v.status in ('new', 'active')
     and (v.next_check_at is null or v.next_check_at <= now())
     and exists (select 1 from public.automation_vault_eligible_accounts(v.id))
   order by (v.priority = 'high') desc,
            coalesce((select max(i.used_at) from public.automation_ideas i where i.vault_id = v.id and i.status = 'used'), v.created_at) asc
   limit greatest(1, least(coalesce(p_limit, 3), 20));
$$;

revoke all on function public.automation_vault_due(integer) from public, anon, authenticated;
grant execute on function public.automation_vault_due(integer) to service_role;

-- Place an idea in an account's queue. Re-checks the rules inside the transaction, so a stale decision can never
-- break them. Returns the new queue row id, or null when the idea can no longer go to that account.
create or replace function public.automation_vault_assign(
  p_vault_id   uuid,
  p_account_id uuid,
  p_note       text,
  p_by         text default 'system'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_idea public.automation_vault%rowtype;
  v_turn uuid;
begin
  select * into v_idea from public.automation_vault where id = p_vault_id and status in ('new', 'active') for update;
  if not found then
    return null;
  end if;
  if not exists (select 1 from public.automation_vault_eligible_accounts(p_vault_id) e where e.account_id = p_account_id) then
    return null;
  end if;

  insert into public.automation_ideas (account_id, idea, priority, vault_id, assigned_by, assigned_note)
  values (p_account_id, v_idea.idea, v_idea.priority, p_vault_id, case when p_by = 'admin' then 'admin' else 'system' end, left(p_note, 400))
  returning id into v_turn;

  update public.automation_vault
     set status = 'active', fit_note = left(p_note, 400), assessed_at = now(), next_check_at = null
   where id = p_vault_id;
  return v_turn;
exception
  when unique_violation then
    return null;
end;
$$;

revoke all on function public.automation_vault_assign(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.automation_vault_assign(uuid, uuid, text, text) to service_role;

-- The System Bot found nothing that suits. A brand new idea is marked 'unfit' (an admin can edit and retry it); one
-- that has already had turns stays in rotation and is looked at again in 30 days.
create or replace function public.automation_vault_no_fit(p_vault_id uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.automation_ideas where vault_id = p_vault_id) then
    update public.automation_vault
       set fit_note = left(p_reason, 400), assessed_at = now(), next_check_at = now() + interval '30 days'
     where id = p_vault_id and status in ('new', 'active');
    return 'waiting';
  end if;
  update public.automation_vault
     set status = 'unfit', fit_note = left(p_reason, 400), assessed_at = now(), next_check_at = null
   where id = p_vault_id and status = 'new';
  return 'unfit';
end;
$$;

revoke all on function public.automation_vault_no_fit(uuid, text) from public, anon, authenticated;
grant execute on function public.automation_vault_no_fit(uuid, text) to service_role;

-- ---------------------------------------------------------------------------------------------
-- System Bot: provider + key (Vault, same approach as per account keys) and rules
-- ---------------------------------------------------------------------------------------------
create or replace function public.automation_set_system_ai(p_provider text, p_model text, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_bot    public.automation_system_bot%rowtype;
  v_key    text := nullif(btrim(coalesce(p_key, '')), '');
  v_model  text := nullif(btrim(coalesce(p_model, '')), '');
  v_secret uuid;
begin
  if auth.uid() is null or not public.is_admin_or_moderator(auth.uid()) then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if p_provider is null or p_provider not in ('anthropic', 'openai', 'gemini') then
    raise exception 'Choose Anthropic, OpenAI or Gemini' using errcode = '22023';
  end if;
  if v_model is not null and (char_length(v_model) > 80 or v_model ~ '\s') then
    raise exception 'A model name has no spaces and is at most 80 characters' using errcode = '22023';
  end if;
  if v_key is not null and (char_length(v_key) < 16 or char_length(v_key) > 400 or v_key ~ '\s') then
    raise exception 'That does not look like a valid API key' using errcode = '22023';
  end if;

  select * into v_bot from public.automation_system_bot where id for update;

  -- New provider without a new key: the old key belongs to the old provider, so drop it and pause the bot.
  if v_key is null and p_provider is distinct from v_bot.ai_provider then
    if v_bot.api_key_secret_id is not null then
      delete from vault.secrets where id = v_bot.api_key_secret_id;
    end if;
    update public.automation_system_bot
       set ai_provider = p_provider, ai_model = v_model, api_key_secret_id = null, api_key_last4 = null,
           is_enabled = false, updated_at = now()
     where id;
    return jsonb_build_object('key_saved', false, 'key_removed', v_bot.api_key_secret_id is not null, 'paused', v_bot.is_enabled);
  end if;

  if v_key is not null then
    if v_bot.api_key_secret_id is not null
       and exists (select 1 from vault.secrets where id = v_bot.api_key_secret_id) then
      perform vault.update_secret(v_bot.api_key_secret_id, v_key);
      v_secret := v_bot.api_key_secret_id;
    else
      v_secret := vault.create_secret(v_key, 'automation_system_bot_api_key', 'AI provider key for the Automate posts System Bot');
    end if;
    update public.automation_system_bot
       set ai_provider = p_provider, ai_model = v_model, api_key_secret_id = v_secret,
           api_key_last4 = right(v_key, 4), updated_at = now()
     where id;
    return jsonb_build_object('key_saved', true, 'key_removed', false, 'paused', false);
  end if;

  update public.automation_system_bot set ai_model = v_model, updated_at = now() where id;
  return jsonb_build_object('key_saved', false, 'key_removed', false, 'paused', false);
end;
$$;

revoke all on function public.automation_set_system_ai(text, text, text) from public, anon;
grant execute on function public.automation_set_system_ai(text, text, text) to authenticated;

create or replace function public.automation_clear_system_key()
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
  select api_key_secret_id into v_secret from public.automation_system_bot where id for update;
  if v_secret is not null then
    delete from vault.secrets where id = v_secret;
  end if;
  update public.automation_system_bot
     set api_key_secret_id = null, api_key_last4 = null, is_enabled = false, updated_at = now()
   where id;
end;
$$;

revoke all on function public.automation_clear_system_key() from public, anon;
grant execute on function public.automation_clear_system_key() to authenticated;

create or replace function public.automation_set_system_bot_settings(
  p_enabled         boolean,
  p_cooldown_months integer,
  p_min_others      integer,
  p_queue_cap       integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_key boolean;
begin
  if auth.uid() is null or not public.is_admin_or_moderator(auth.uid()) then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if p_cooldown_months is null or p_cooldown_months not between 1 and 36 then
    raise exception 'The waiting period is 1 to 36 months' using errcode = '22023';
  end if;
  if p_min_others is null or p_min_others not between 1 and 9 then
    raise exception 'Other accounts needed is 1 to 9' using errcode = '22023';
  end if;
  if p_queue_cap is null or p_queue_cap not between 1 and 100 then
    raise exception 'Queue limit is 1 to 100' using errcode = '22023';
  end if;

  select api_key_secret_id is not null into v_has_key from public.automation_system_bot where id;
  if p_enabled and not coalesce(v_has_key, false) then
    raise exception 'Save an API key for the System Bot before turning it on' using errcode = '22023';
  end if;

  update public.automation_system_bot
     set is_enabled = p_enabled, cooldown_months = p_cooldown_months, min_other_accounts = p_min_others,
         queue_cap = p_queue_cap, updated_at = now()
   where id;
end;
$$;

revoke all on function public.automation_set_system_bot_settings(boolean, integer, integer, integer) from public, anon;
grant execute on function public.automation_set_system_bot_settings(boolean, integer, integer, integer) to authenticated;

-- Read the key (service role only: the assign-vault-ideas edge function).
create or replace function public.automation_get_system_key()
returns table (provider text, model text, api_key text, is_enabled boolean)
language sql
stable
security definer
set search_path = public, vault
as $$
  select b.ai_provider, b.ai_model, s.decrypted_secret, b.is_enabled
    from public.automation_system_bot b
    join vault.decrypted_secrets s on s.id = b.api_key_secret_id
   where b.id;
$$;

revoke all on function public.automation_get_system_key() from public, anon, authenticated;
grant execute on function public.automation_get_system_key() to service_role;

-- ---------------------------------------------------------------------------------------------
-- Cron: hourly, and only wakes the function when the bot is on and something needs placing.
-- ---------------------------------------------------------------------------------------------
select cron.schedule(
  'automation-vault-sweep',
  '7 * * * *',
  $cron$
  do $do$
  begin
    if exists (select 1 from public.automation_system_bot where is_enabled and api_key_secret_id is not null)
       and exists (select 1 from public.automation_vault_due(1)) then
      perform public.invoke_push_function('assign-vault-ideas', '{"mode":"sweep"}'::jsonb);
    end if;
  end
  $do$;
  $cron$
);
