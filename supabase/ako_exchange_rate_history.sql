-- File: supabase/ako_exchange_rate_history.sql
-- Rate history for /admin/exchange-rates/history.
--
-- Until now exchange_rates only held the CURRENT deposit/withdrawal rate, so there was nothing to chart.
-- This adds an append-only log: one row per rate change (manual save) and one per automatic sync run
-- (even when the rate didn't move, so the market rate is tracked every 6h). Rows are written by a trigger
-- on exchange_rates; clients can only read them (admins only) — there are no insert/update/delete policies.
--
-- Run AFTER ako_exchange_rate_auto_sync.sql. Safe to re-run.
-- History starts from the first run of this script (a single 'baseline' row per kind); older changes were never recorded.

create table if not exists public.exchange_rate_history (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('deposit', 'withdrawal')),
  rate numeric not null,
  previous_rate numeric,
  market_rate numeric,                                        -- live market USD->NGN known at that moment
  source text not null check (source in ('auto', 'manual', 'baseline')),
  changed_by uuid,                                            -- admin who saved it (null for auto/baseline)
  recorded_at timestamptz not null default now()
);

create index if not exists exchange_rate_history_kind_time_idx
  on public.exchange_rate_history (kind, recorded_at desc);

alter table public.exchange_rate_history enable row level security;

drop policy if exists "Admins can read rate history" on public.exchange_rate_history;
create policy "Admins can read rate history" on public.exchange_rate_history
  for select to authenticated
  using (exists (select 1 from public.admin_roles where user_id = (select auth.uid())));

-- apply_market_rate() now also exposes the market rate to the trigger below (one added set_config line;
-- identical to the copy in ako_exchange_rate_auto_sync.sql).

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
  perform set_config('ako.market_rate', p_market::text, true);   -- lets the history trigger record the market rate this run used
  update public.exchange_rates set rate = v_dep_new, updated_at = now(), updated_by = null where kind = 'deposit';
  update public.exchange_rates set rate = v_wd_new, updated_at = now(), updated_by = null where kind = 'withdrawal';

  update public.exchange_rate_settings
    set last_market_rate = p_market, last_synced_at = now(), last_status = 'ok' where id;

  return jsonb_build_object('applied', true, 'market', p_market, 'deposit', v_dep_new, 'withdrawal', v_wd_new);
end;
$$;

create or replace function public.record_exchange_rate_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auto boolean := coalesce(current_setting('ako.rate_sync', true), '') = 'on';
  v_market numeric;
begin
  -- Manual save that didn't change the rate: nothing to record. Sync runs are always recorded.
  if tg_op = 'UPDATE' and not v_auto and new.rate is not distinct from old.rate then
    return new;
  end if;

  if v_auto then
    v_market := nullif(current_setting('ako.market_rate', true), '')::numeric;
  end if;
  if v_market is null then
    select last_market_rate into v_market from public.exchange_rate_settings where id;
  end if;

  insert into public.exchange_rate_history (kind, rate, previous_rate, market_rate, source, changed_by)
  values (
    new.kind,
    new.rate,
    case when tg_op = 'UPDATE' then old.rate end,
    v_market,
    case when v_auto then 'auto' else 'manual' end,
    case when v_auto then null else new.updated_by end
  );
  return new;
end;
$$;

drop trigger if exists exchange_rates_record_history on public.exchange_rates;
create trigger exchange_rates_record_history
  after insert or update on public.exchange_rates
  for each row execute function public.record_exchange_rate_history();

-- Baseline: the rates as they stand now (only if nothing has been recorded yet).
insert into public.exchange_rate_history (kind, rate, market_rate, source, recorded_at)
select r.kind, r.rate, (select last_market_rate from public.exchange_rate_settings where id), 'baseline', r.updated_at
from public.exchange_rates r
where not exists (select 1 from public.exchange_rate_history);

-- Bucketed history for the admin chart/table. p_bucket: 'day' | 'week' (Mon-Sun) | 'month', bucketed in the
-- business timezone (Africa/Lagos). p_from = null returns everything. Admins only.
create or replace function public.get_exchange_rate_history(
  p_from timestamptz default null,
  p_bucket text default 'day'
)
returns table (
  bucket_start date,
  kind text,
  open_rate numeric,
  close_rate numeric,
  low_rate numeric,
  high_rate numeric,
  avg_rate numeric,
  market_avg numeric,
  change_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_roles where user_id = (select auth.uid())) then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if p_bucket not in ('day', 'week', 'month') then
    raise exception 'p_bucket must be day, week or month';
  end if;

  return query
  select
    date_trunc(p_bucket, h.recorded_at at time zone 'Africa/Lagos')::date,
    h.kind,
    (array_agg(h.rate order by h.recorded_at, h.id))[1],
    (array_agg(h.rate order by h.recorded_at desc, h.id desc))[1],
    min(h.rate),
    max(h.rate),
    round(avg(h.rate), 2),
    round(avg(h.market_rate), 2),
    count(*)::integer
  from public.exchange_rate_history h
  where p_from is null or h.recorded_at >= p_from
  group by 1, 2
  order by 1, 2;
end;
$$;

revoke all on function public.get_exchange_rate_history(timestamptz, text) from public, anon;
grant execute on function public.get_exchange_rate_history(timestamptz, text) to authenticated;
