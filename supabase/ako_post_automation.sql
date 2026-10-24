-- supabase/ako_post_automation.sql
-- Admin-only "Automate posts": AI-run accounts that publish on a schedule through the Claude API.
--
--   * automated_accounts      one row per automated user: system prompt, limits, timezone, schedule, status.
--   * automation_ideas        the idea vault (pending / used / archived, normal / high priority).
--   * automation_topic_history  lightweight memory of topics, angles, openings and modes already used.
--   * automation_runs         every generation + publish attempt. UNIQUE (account_id, scheduled_for) is what makes a
--                             retried cron tick unable to publish the same slot twice.
--
-- Scheduling: ONE pg_cron job runs every minute, but only calls the edge function when some account is due. The
-- function claims due accounts through automation_claim_due() (FOR UPDATE SKIP LOCKED, lock + next_run_at advanced in
-- the same transaction), so two overlapping ticks can never pick up the same account.
--
-- Schedule format (automated_accounts.schedule): [{"days":[0..6] or [] for every day, "time":"HH:MM"}], 0 = Sunday,
-- interpreted in automated_accounts.timezone. next_run_at is always stored in UTC.
--
-- Everything is admin-only (is_admin_or_moderator). The edge function `run-post-automation` uses the service role.
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------------------------------------
-- Next-run calculation
-- ---------------------------------------------------------------------------------------------
create or replace function public.automation_next_run(p_schedule jsonb, p_tz text, p_after timestamptz)
returns timestamptz
language plpgsql
stable
as $$
declare
  v_local_date date;
  v_best       timestamptz;
  v_slot       jsonb;
  v_days       jsonb;
  v_day        date;
  v_dow        int;
  v_cand       timestamptz;
  d            int;
begin
  if p_schedule is null or jsonb_typeof(p_schedule) <> 'array' or jsonb_array_length(p_schedule) = 0 then
    return null;
  end if;

  v_local_date := (p_after at time zone p_tz)::date;

  for d in 0..7 loop
    v_day := v_local_date + d;
    v_dow := extract(dow from v_day)::int;

    for v_slot in select value from jsonb_array_elements(p_schedule) loop
      v_days := coalesce(v_slot -> 'days', '[]'::jsonb);
      if jsonb_array_length(v_days) > 0 and not (v_days @> to_jsonb(v_dow)) then
        continue;
      end if;
      v_cand := ((v_day::text || ' ' || (v_slot ->> 'time'))::timestamp) at time zone p_tz;
      if v_cand > p_after and (v_best is null or v_cand < v_best) then
        v_best := v_cand;
      end if;
    end loop;
  end loop;

  return v_best;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------
create table if not exists public.automated_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references public.profiles (id) on delete cascade,
  system_prompt     text not null default '',
  is_enabled        boolean not null default false,
  max_post_chars    integer not null default 450  check (max_post_chars between 50 and 1200),
  max_heading_chars integer not null default 50   check (max_heading_chars between 10 and 50),
  timezone          text not null default 'Africa/Lagos',
  schedule          jsonb not null default '[]'::jsonb,
  next_run_at       timestamptz,
  locked_until      timestamptz,
  last_run_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.automation_ideas (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.automated_accounts (id) on delete cascade,
  idea         text not null check (char_length(idea) between 1 and 1000),
  status       text not null default 'pending' check (status in ('pending', 'used', 'archived')),
  priority     text not null default 'normal'  check (priority in ('normal', 'high')),
  created_at   timestamptz not null default now(),
  used_at      timestamptz,
  used_post_id uuid references public.posts (id) on delete set null
);

create index if not exists automation_ideas_pick_idx
  on public.automation_ideas (account_id, status, priority, created_at);

create table if not exists public.automation_topic_history (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.automated_accounts (id) on delete cascade,
  post_id    uuid references public.posts (id) on delete set null,
  topic      text not null,
  angle      text,
  mode       text,
  opening    text,
  created_at timestamptz not null default now()
);

create index if not exists automation_topic_history_account_idx
  on public.automation_topic_history (account_id, created_at desc);

create table if not exists public.automation_runs (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.automated_accounts (id) on delete cascade,
  scheduled_for timestamptz not null,
  trigger       text not null default 'schedule' check (trigger in ('schedule', 'manual')),
  status        text not null default 'running' check (status in ('running', 'published', 'failed', 'skipped')),
  header        text,
  body          text,
  topic         text,
  angle         text,
  mode          text,
  idea_id       uuid references public.automation_ideas (id) on delete set null,
  post_id       uuid references public.posts (id) on delete set null,
  error         text,
  attempts      integer not null default 0,
  model         text,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz,
  unique (account_id, scheduled_for)
);

create index if not exists automation_runs_account_idx
  on public.automation_runs (account_id, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Validation + next_run_at maintenance
-- ---------------------------------------------------------------------------------------------
create or replace function public.automated_accounts_before_write()
returns trigger
language plpgsql
as $$
declare
  v_slot jsonb;
  v_day  jsonb;
begin
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

drop trigger if exists automated_accounts_before_write on public.automated_accounts;
create trigger automated_accounts_before_write
  before insert or update on public.automated_accounts
  for each row execute function public.automated_accounts_before_write();

-- ---------------------------------------------------------------------------------------------
-- Claiming due accounts (service role only)
-- ---------------------------------------------------------------------------------------------
-- Marks long-stuck runs failed, then for each due account: advances next_run_at to the next slot, takes a
-- 10 minute lock and opens a 'running' run for the slot that was due. A slot missed by more than an hour (the
-- project was paused, say) is recorded as skipped instead of firing late. A slot that already has a run row
-- (a retried tick) returns nothing, which is the idempotency guarantee.
create or replace function public.automation_claim_due(p_limit integer default 5)
returns table (out_run_id uuid, out_account_id uuid, out_scheduled_for timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  r      record;
  v_next timestamptz;
  v_run  uuid;
begin
  update automation_runs
     set status = 'failed', error = 'Timed out before finishing', finished_at = now()
   where status = 'running' and created_at < now() - interval '15 minutes';

  for r in
    select id, next_run_at, schedule, timezone
      from automated_accounts
     where is_enabled
       and next_run_at is not null
       and next_run_at <= now()
       and (locked_until is null or locked_until < now())
     order by next_run_at
     limit p_limit
     for update skip locked
  loop
    v_next := automation_next_run(r.schedule, r.timezone, now());

    if r.next_run_at < now() - interval '60 minutes' then
      insert into automation_runs (account_id, scheduled_for, trigger, status, error, finished_at)
      values (r.id, r.next_run_at, 'schedule', 'skipped', 'Missed its slot by more than an hour', now())
      on conflict (account_id, scheduled_for) do nothing;
      update automated_accounts set next_run_at = v_next where id = r.id;
      continue;
    end if;

    v_run := null;
    insert into automation_runs (account_id, scheduled_for, trigger, status)
    values (r.id, r.next_run_at, 'schedule', 'running')
    on conflict (account_id, scheduled_for) do nothing
    returning id into v_run;

    update automated_accounts
       set next_run_at = v_next, locked_until = now() + interval '10 minutes', last_run_at = now()
     where id = r.id;

    if v_run is not null then
      out_run_id := v_run;
      out_account_id := r.id;
      out_scheduled_for := r.next_run_at;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.automation_claim_due(integer) from public, anon, authenticated;
grant execute on function public.automation_claim_due(integer) to service_role;

-- ---------------------------------------------------------------------------------------------
-- RLS: admins only
-- ---------------------------------------------------------------------------------------------
alter table public.automated_accounts        enable row level security;
alter table public.automation_ideas          enable row level security;
alter table public.automation_topic_history  enable row level security;
alter table public.automation_runs           enable row level security;

drop policy if exists "Admins manage automated accounts" on public.automated_accounts;
create policy "Admins manage automated accounts" on public.automated_accounts
  for all to authenticated
  using (public.is_admin_or_moderator(auth.uid()))
  with check (public.is_admin_or_moderator(auth.uid()));

drop policy if exists "Admins manage automation ideas" on public.automation_ideas;
create policy "Admins manage automation ideas" on public.automation_ideas
  for all to authenticated
  using (public.is_admin_or_moderator(auth.uid()))
  with check (public.is_admin_or_moderator(auth.uid()));

drop policy if exists "Admins read automation topic history" on public.automation_topic_history;
create policy "Admins read automation topic history" on public.automation_topic_history
  for select to authenticated
  using (public.is_admin_or_moderator(auth.uid()));

drop policy if exists "Admins read automation runs" on public.automation_runs;
create policy "Admins read automation runs" on public.automation_runs
  for select to authenticated
  using (public.is_admin_or_moderator(auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- Cron: every minute, but only wake the edge function when something is actually due.
-- (invoke_push_function posts to the function with the shared x-webhook-secret from Vault.)
-- ---------------------------------------------------------------------------------------------
select cron.schedule(
  'run-post-automation',
  '* * * * *',
  $cron$
  do $do$
  begin
    if exists (
      select 1 from public.automated_accounts
       where is_enabled and next_run_at is not null and next_run_at <= now()
         and (locked_until is null or locked_until < now())
    ) then
      perform public.invoke_push_function('run-post-automation', '{"mode":"tick"}'::jsonb);
    end if;
  end
  $do$;
  $cron$
);
