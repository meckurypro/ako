-- supabase/ako_post_automation_api_keys.sql
-- Per-account AI provider + API key for Automate posts (builds on ako_post_automation.sql).
--
--   * automated_accounts gets ai_provider ('anthropic' | 'openai' | 'gemini'), an optional ai_model override, and two
--     NON secret markers: api_key_secret_id (which Vault row holds the key) and api_key_last4 (so the admin screen can
--     show "saved, ending 1234").
--   * The key itself lives in Supabase Vault (encrypted at rest), one secret per account. It is never in a column the
--     admin screen can select, and nothing ever returns it to a browser: the admin UI can only SET or CLEAR it
--     (automation_set_ai / automation_clear_api_key, admin checked). Only the service role can READ it
--     (automation_get_api_key), which is what the edge function does at run time.
--   * Because the key is per account, a later "let users automate their own accounts" feature can reuse this as is:
--     each user stores their own key against their own account.
--   * api_key_secret_id / api_key_last4 / ai_provider can only change through those functions (a trigger enforces it),
--     so a direct table update can't point an account at another account's key.
--   * An account can't be turned on without a key, and removing the key (or switching provider without pasting a new
--     key, since the old key belongs to the old provider) pauses it.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table public.automated_accounts
  add column if not exists ai_provider        text not null default 'anthropic',
  add column if not exists ai_model           text,
  add column if not exists api_key_secret_id  uuid,
  add column if not exists api_key_last4      text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'automated_accounts_ai_provider_check') then
    alter table public.automated_accounts
      add constraint automated_accounts_ai_provider_check check (ai_provider in ('anthropic', 'openai', 'gemini'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'automated_accounts_ai_model_check') then
    alter table public.automated_accounts
      add constraint automated_accounts_ai_model_check check (ai_model is null or char_length(ai_model) between 1 and 80);
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Trigger: validation as before, plus the key rules
-- ---------------------------------------------------------------------------------------------
create or replace function public.automated_accounts_before_write()
returns trigger
language plpgsql
as $$
declare
  v_slot jsonb;
  v_day  jsonb;
begin
  if tg_op = 'INSERT' then
    new.api_key_secret_id := null;
    new.api_key_last4 := null;
  elsif (new.api_key_secret_id is distinct from old.api_key_secret_id
      or new.api_key_last4     is distinct from old.api_key_last4
      or new.ai_provider       is distinct from old.ai_provider)
     and coalesce(current_setting('automation.key_write', true), '') <> 'on' then
    raise exception 'The AI provider and key can only be changed from the AI settings' using errcode = '42501';
  end if;

  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown timezone: %', new.timezone using errcode = '22023';
  end if;

  if jsonb_typeof(new.schedule) <> 'array' then
    raise exception 'schedule must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(new.schedule) > 12 then
    raise exception 'A schedule can have at most 12 time slots' using errcode = '22023';
  end if;

  for v_slot in select value from jsonb_array_elements(new.schedule) loop
    if jsonb_typeof(v_slot) <> 'object' or coalesce(v_slot ->> 'time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception 'Each schedule slot needs a time as HH:MM' using errcode = '22023';
    end if;
    if v_slot ? 'days' then
      if jsonb_typeof(v_slot -> 'days') <> 'array' then
        raise exception 'days must be an array' using errcode = '22023';
      end if;
      for v_day in select value from jsonb_array_elements(v_slot -> 'days') loop
        if jsonb_typeof(v_day) <> 'number' or (v_day #>> '{}') !~ '^[0-6]$' then
          raise exception 'days must be numbers from 0 (Sunday) to 6 (Saturday)' using errcode = '22023';
        end if;
      end loop;
    end if;
  end loop;

  if new.is_enabled and jsonb_array_length(new.schedule) = 0 then
    raise exception 'Add at least one publishing time before turning automation on' using errcode = '22023';
  end if;
  if new.is_enabled and new.api_key_secret_id is null then
    raise exception 'Add an API key before turning automation on' using errcode = '22023';
  end if;

  new.updated_at := now();

  if not new.is_enabled then
    new.next_run_at := null;
  elsif tg_op = 'INSERT'
     or new.next_run_at is null
     or new.is_enabled is distinct from old.is_enabled
     or new.schedule   is distinct from old.schedule
     or new.timezone   is distinct from old.timezone then
    new.next_run_at := public.automation_next_run(new.schedule, new.timezone, now());
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Set provider / model / key (admin only). Returns what happened so the screen can say so.
--   * key given        -> stored in Vault (replacing any earlier key), provider + model saved.
--   * no key, same provider -> only the model is updated.
--   * no key, new provider  -> the old key is removed (it belongs to the old provider) and the account is paused.
-- ---------------------------------------------------------------------------------------------
create or replace function public.automation_set_ai(
  p_account_id uuid,
  p_provider   text,
  p_model      text,
  p_key        text
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_acc    public.automated_accounts%rowtype;
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

  select * into v_acc from public.automated_accounts where id = p_account_id for update;
  if not found then
    raise exception 'That automated account no longer exists' using errcode = 'P0002';
  end if;

  perform set_config('automation.key_write', 'on', true);

  if v_key is null and p_provider is distinct from v_acc.ai_provider then
    if v_acc.api_key_secret_id is not null then
      delete from vault.secrets where id = v_acc.api_key_secret_id;
    end if;
    update public.automated_accounts
       set ai_provider = p_provider, ai_model = v_model,
           api_key_secret_id = null, api_key_last4 = null, is_enabled = false
     where id = p_account_id;
    return jsonb_build_object('key_saved', false, 'key_removed', v_acc.api_key_secret_id is not null, 'paused', v_acc.is_enabled);
  end if;

  if v_key is not null then
    if v_acc.api_key_secret_id is not null
       and exists (select 1 from vault.secrets where id = v_acc.api_key_secret_id) then
      perform vault.update_secret(v_acc.api_key_secret_id, v_key);
      v_secret := v_acc.api_key_secret_id;
    else
      v_secret := vault.create_secret(
        v_key,
        'automation_api_key_' || p_account_id::text,
        'AI provider key for an automated account'
      );
    end if;
    update public.automated_accounts
       set ai_provider = p_provider, ai_model = v_model,
           api_key_secret_id = v_secret, api_key_last4 = right(v_key, 4)
     where id = p_account_id;
    return jsonb_build_object('key_saved', true, 'key_removed', false, 'paused', false);
  end if;

  update public.automated_accounts set ai_model = v_model where id = p_account_id;
  return jsonb_build_object('key_saved', false, 'key_removed', false, 'paused', false);
end;
$$;

revoke all on function public.automation_set_ai(uuid, text, text, text) from public, anon;
grant execute on function public.automation_set_ai(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Remove the key (admin only). Pauses the account.
-- ---------------------------------------------------------------------------------------------
create or replace function public.automation_clear_api_key(p_account_id uuid)
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

  select api_key_secret_id into v_secret from public.automated_accounts where id = p_account_id for update;
  if not found then
    raise exception 'That automated account no longer exists' using errcode = 'P0002';
  end if;

  perform set_config('automation.key_write', 'on', true);
  if v_secret is not null then
    delete from vault.secrets where id = v_secret;
  end if;
  update public.automated_accounts
     set api_key_secret_id = null, api_key_last4 = null, is_enabled = false
   where id = p_account_id;
end;
$$;

revoke all on function public.automation_clear_api_key(uuid) from public, anon;
grant execute on function public.automation_clear_api_key(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Read the key (service role only: the edge function). Never granted to a browser role.
-- ---------------------------------------------------------------------------------------------
create or replace function public.automation_get_api_key(p_account_id uuid)
returns table (provider text, model text, api_key text)
language sql
stable
security definer
set search_path = public, vault
as $$
  select a.ai_provider, a.ai_model, s.decrypted_secret
    from public.automated_accounts a
    join vault.decrypted_secrets s on s.id = a.api_key_secret_id
   where a.id = p_account_id;
$$;

revoke all on function public.automation_get_api_key(uuid) from public, anon, authenticated;
grant execute on function public.automation_get_api_key(uuid) to service_role;

-- ---------------------------------------------------------------------------------------------
-- Deleting an automated account also deletes its Vault secret
-- ---------------------------------------------------------------------------------------------
create or replace function public.automated_accounts_cleanup_secret()
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

drop trigger if exists automated_accounts_cleanup_secret on public.automated_accounts;
create trigger automated_accounts_cleanup_secret
  after delete on public.automated_accounts
  for each row execute function public.automated_accounts_cleanup_secret();
