-- File: supabase/ako_exchange_rate_auto_sync.sql
-- Automatic USD->NGN exchange-rate sync (every 6 hours).
--
-- Model: the admin keeps typing deposit/withdrawal rates on /admin/exchange-rates exactly as before.
-- Each manual save also records its OFFSET from the latest market rate (e.g. deposit = market + 120,
-- withdrawal = market - 80). Every 6 hours the `sync-exchange-rate` edge function fetches the market
-- rate and calls apply_market_rate(), which re-applies those offsets, so the admin's spread survives.
-- Past transactions are untouched (each already has its own rate frozen on its row).

create table if not exists public.exchange_rate_settings (
  id boolean primary key default true check (id),            -- singleton row
  auto_sync_enabled boolean not null default true,
  deposit_offset numeric,                                     -- NGN added to the market rate
  withdrawal_offset numeric,
  last_market_rate numeric,
  last_synced_at timestamptz,
  last_status text,                                           -- 'ok' | 'skipped: ...' | 'error: ...'
  last_attempt_at timestamptz
);
insert into public.exchange_rate_settings (id) values (true) on conflict do nothing;

alter table public.exchange_rate_settings enable row level security;

drop policy if exists "Admins can read rate settings" on public.exchange_rate_settings;
create policy "Admins can read rate settings" on public.exchange_rate_settings
  for select to authenticated
  using (exists (select 1 from public.admin_roles where user_id = (select auth.uid())));

drop policy if exists "Admins can update rate settings" on public.exchange_rate_settings;
create policy "Admins can update rate settings" on public.exchange_rate_settings
  for update to authenticated
  using (exists (select 1 from public.admin_roles where user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_roles where user_id = (select auth.uid())));

-- A manual save (anything not made by apply_market_rate) records its offset from the last market rate.
create or replace function public.track_manual_rate_offset()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market numeric;
begin
  if coalesce(current_setting('ako.rate_sync', true), '') = 'on' then
    return new;                                              -- written by the sync itself
  end if;
  select last_market_rate into v_market from public.exchange_rate_settings where id;
  if v_market is null or new.rate = old.rate then
    return new;
  end if;
  if new.kind = 'deposit' then
    update public.exchange_rate_settings set deposit_offset = new.rate - v_market where id;
  elsif new.kind = 'withdrawal' then
    update public.exchange_rate_settings set withdrawal_offset = new.rate - v_market where id;
  end if;
  return new;
end;
$$;

drop trigger if exists exchange_rates_track_manual_offset on public.exchange_rates;
create trigger exchange_rates_track_manual_offset
  before update on public.exchange_rates
  for each row execute function public.track_manual_rate_offset();

-- Called only by the sync edge function (service role). Applies a fresh market rate.
create or replace function public.apply_market_rate(p_market numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.exchange_rate_settings;
  v_dep numeric;
  v_wd numeric;
  v_dep_new numeric;
  v_wd_new numeric;
begin
  select * into s from public.exchange_rate_settings where id for update;

  update public.exchange_rate_settings set last_attempt_at = now() where id;

  if p_market is null or p_market <= 0 then
    update public.exchange_rate_settings set last_status = 'error: invalid market rate' where id;
    return jsonb_build_object('applied', false, 'reason', 'invalid market rate');
  end if;

  if not s.auto_sync_enabled then
    update public.exchange_rate_settings set last_status = 'skipped: auto-sync is off' where id;
    return jsonb_build_object('applied', false, 'reason', 'auto-sync off');
  end if;

  -- Sanity guard: refuse a >25% jump from a market rate seen in the last 24h (bad API data).
  if s.last_market_rate is not null and s.last_synced_at > now() - interval '24 hours'
     and abs(p_market - s.last_market_rate) / s.last_market_rate > 0.25 then
    update public.exchange_rate_settings
      set last_status = 'skipped: market rate moved more than 25% (' || p_market || ')' where id;
    return jsonb_build_object('applied', false, 'reason', 'moved more than 25%');
  end if;

  select rate into v_dep from public.exchange_rates where kind = 'deposit';
  select rate into v_wd from public.exchange_rates where kind = 'withdrawal';

  -- First run: derive offsets from whatever the admin currently has set.
  update public.exchange_rate_settings
    set deposit_offset = coalesce(deposit_offset, v_dep - p_market),
        withdrawal_offset = coalesce(withdrawal_offset, v_wd - p_market)
    where id
    returning * into s;

  v_dep_new := round(p_market + s.deposit_offset, 2);
  v_wd_new := round(p_market + s.withdrawal_offset, 2);

  if v_dep_new <= 0 or v_wd_new <= 0 then
    update public.exchange_rate_settings set last_status = 'error: computed rate not positive' where id;
    return jsonb_build_object('applied', false, 'reason', 'computed rate not positive');
  end if;

  perform set_config('ako.rate_sync', 'on', true);
  update public.exchange_rates set rate = v_dep_new, updated_at = now(), updated_by = null where kind = 'deposit';
  update public.exchange_rates set rate = v_wd_new, updated_at = now(), updated_by = null where kind = 'withdrawal';

  update public.exchange_rate_settings
    set last_market_rate = p_market, last_synced_at = now(), last_status = 'ok' where id;

  return jsonb_build_object('applied', true, 'market', p_market, 'deposit', v_dep_new, 'withdrawal', v_wd_new);
end;
$$;

revoke all on function public.apply_market_rate(numeric) from public, anon, authenticated;
grant execute on function public.apply_market_rate(numeric) to service_role;

-- Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC), same shared-secret scheme as check-push-receipts.
select cron.unschedule('sync-exchange-rate') where exists (select 1 from cron.job where jobname = 'sync-exchange-rate');
select cron.schedule('sync-exchange-rate', '0 */6 * * *', $$select public.invoke_push_function('sync-exchange-rate', '{}'::jsonb)$$);
