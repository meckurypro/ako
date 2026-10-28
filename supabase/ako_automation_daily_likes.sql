-- supabase/ako_automation_daily_likes.sql
-- Daily auto-like for automated accounts.
--
--   Each automated account can be set to like ONE thing a day at a chosen time (in the account's timezone):
--     1. a post by someone else (public, published, not deleted/archived, not a plain reshare) it hasn't liked yet;
--     2. once no such post is left, a comment by someone else whose stance is a question or an add ("support").
--        Pushbacks and neutral comments are never liked.
--   It never likes its own posts or comments, and never likes the same thing twice.
--
-- Columns on automated_accounts: daily_like_enabled, daily_like_time ('HH:MM'), next_like_at, like_locked_until, last_like_at.
-- next_like_at is maintained by a trigger (UTC), like next_run_at. One pg_cron job runs every minute and calls
-- automation_run_due_likes(), which claims due accounts with FOR UPDATE SKIP LOCKED, advances next_like_at in the same
-- transaction (so overlapping ticks can't double-like) and writes the reaction through the normal `reactions` table, so
-- counts, notifications and give-back triggers behave exactly as for a human like.
--
-- Admin-only (is_admin_or_moderator). Run once in the Supabase SQL editor. Safe to re-run.

alter table public.automated_accounts
  add column if not exists daily_like_enabled boolean     not null default false,
  add column if not exists daily_like_time    text        not null default '12:00',
  add column if not exists next_like_at       timestamptz,
  add column if not exists like_locked_until  timestamptz,
  add column if not exists last_like_at       timestamptz;

alter table public.automated_accounts drop constraint if exists automated_accounts_daily_like_time_check;
alter table public.automated_accounts
  add constraint automated_accounts_daily_like_time_check
  check (daily_like_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- Log of every like attempt, for the admin screen.
create table if not exists public.automation_like_log (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.automated_accounts (id) on delete cascade,
  trigger     text not null default 'schedule' check (trigger in ('schedule', 'manual')),
  status      text not null check (status in ('liked', 'nothing_to_like', 'skipped', 'failed')),
  target_type text check (target_type in ('post', 'comment')),
  post_id     uuid references public.posts (id) on delete set null,
  comment_id  uuid references public.comments (id) on delete set null,
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists automation_like_log_account_idx on public.automation_like_log (account_id, created_at desc);

alter table public.automation_like_log enable row level security;
drop policy if exists "Admins read automation like log" on public.automation_like_log;
create policy "Admins read automation like log" on public.automation_like_log
  for select to authenticated using (public.is_admin_or_moderator(auth.uid()));

-- Keep next_like_at in step with the settings (runs after automated_accounts_before_write, which validates the timezone).
create or replace function public.automated_accounts_like_schedule()
returns trigger
language plpgsql
as $$
begin
  if not new.daily_like_enabled then
    new.next_like_at := null;
  elsif tg_op = 'INSERT'
     or new.next_like_at is null
     or new.daily_like_enabled is distinct from old.daily_like_enabled
     or new.daily_like_time    is distinct from old.daily_like_time
     or new.timezone           is distinct from old.timezone then
    new.next_like_at := public.automation_next_run(
      jsonb_build_array(jsonb_build_object('time', new.daily_like_time)), new.timezone, now());
  end if;
  return new;
end;
$$;

drop trigger if exists automated_accounts_like_schedule on public.automated_accounts;
create trigger automated_accounts_like_schedule
  before insert or update on public.automated_accounts
  for each row execute function public.automated_accounts_like_schedule();

-- Backfill next_like_at for rows that already exist (no-op for disabled ones).
update public.automated_accounts set daily_like_enabled = daily_like_enabled;

-- Picks and writes ONE like for an account. Returns {status, target_type, target_id}.
create or replace function public.automation_do_like(p_account_id uuid, p_trigger text default 'schedule')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid;
  v_post    uuid;
  v_comment uuid;
begin
  select user_id into v_user from automated_accounts where id = p_account_id;
  if v_user is null then
    return jsonb_build_object('status', 'failed', 'error', 'Account not found');
  end if;

  -- 1) a post: random among the 50 newest eligible ones it hasn't reacted to.
  select id into v_post from (
    select p.id
      from posts p
     where p.author_id <> v_user
       and not p.is_deleted and not p.is_archived
       and coalesce(p.status, 'published') = 'published'
       and p.visibility = 'public'
       and not (p.reshared_post_id is not null and btrim(p.content) = '')
       and not exists (
         select 1 from reactions r
          where r.user_id = v_user and r.post_id = p.id and r.type in ('like', 'dislike') and r.acted_as_page_id is null)
     order by p.created_at desc
     limit 50
  ) t
  order by random() limit 1;

  if v_post is not null then
    begin
      insert into reactions (user_id, target_type, post_id, type) values (v_user, 'post', v_post, 'like');
    exception when others then
      insert into automation_like_log (account_id, trigger, status, target_type, post_id, error)
      values (p_account_id, p_trigger, 'failed', 'post', v_post, sqlerrm);
      return jsonb_build_object('status', 'failed', 'error', sqlerrm);
    end;
    insert into automation_like_log (account_id, trigger, status, target_type, post_id)
    values (p_account_id, p_trigger, 'liked', 'post', v_post);
    update automated_accounts set last_like_at = now() where id = p_account_id;
    return jsonb_build_object('status', 'liked', 'target_type', 'post', 'target_id', v_post);
  end if;

  -- 2) no posts left: a question or an add (stored as 'support'); never a pushback or neutral comment.
  select id into v_comment from (
    select c.id
      from comments c
      join posts p on p.id = c.post_id
     where c.author_id <> v_user
       and not c.is_deleted
       and c.stance in ('question', 'support')
       and not p.is_deleted and not p.is_archived
       and coalesce(p.status, 'published') = 'published'
       and p.visibility = 'public'
       and not exists (
         select 1 from reactions r
          where r.user_id = v_user and r.comment_id = c.id and r.type in ('like', 'dislike') and r.acted_as_page_id is null)
     order by c.created_at desc
     limit 50
  ) t
  order by random() limit 1;

  if v_comment is not null then
    begin
      insert into reactions (user_id, target_type, comment_id, type) values (v_user, 'comment', v_comment, 'like');
    exception when others then
      insert into automation_like_log (account_id, trigger, status, target_type, comment_id, error)
      values (p_account_id, p_trigger, 'failed', 'comment', v_comment, sqlerrm);
      return jsonb_build_object('status', 'failed', 'error', sqlerrm);
    end;
    insert into automation_like_log (account_id, trigger, status, target_type, comment_id)
    values (p_account_id, p_trigger, 'liked', 'comment', v_comment);
    update automated_accounts set last_like_at = now() where id = p_account_id;
    return jsonb_build_object('status', 'liked', 'target_type', 'comment', 'target_id', v_comment);
  end if;

  insert into automation_like_log (account_id, trigger, status) values (p_account_id, p_trigger, 'nothing_to_like');
  return jsonb_build_object('status', 'nothing_to_like');
end;
$$;

revoke all on function public.automation_do_like(uuid, text) from public, anon, authenticated;
grant execute on function public.automation_do_like(uuid, text) to service_role;

-- Cron entry point: likes for every account whose daily time has come. A slot missed by more than 12 hours
-- (project paused, say) is logged as skipped instead of firing late.
create or replace function public.automation_run_due_likes(p_limit integer default 20)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r       record;
  v_count integer := 0;
begin
  for r in
    select id, next_like_at, daily_like_time, timezone
      from automated_accounts
     where daily_like_enabled
       and next_like_at is not null
       and next_like_at <= now()
       and (like_locked_until is null or like_locked_until < now())
     order by next_like_at
     limit p_limit
     for update skip locked
  loop
    update automated_accounts
       set next_like_at = automation_next_run(
             jsonb_build_array(jsonb_build_object('time', r.daily_like_time)), r.timezone, now()),
           like_locked_until = now() + interval '5 minutes'
     where id = r.id;

    if r.next_like_at < now() - interval '12 hours' then
      insert into automation_like_log (account_id, status, error)
      values (r.id, 'skipped', 'Missed its slot by more than 12 hours');
    else
      perform automation_do_like(r.id, 'schedule');
      v_count := v_count + 1;
    end if;

    update automated_accounts set like_locked_until = null where id = r.id;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.automation_run_due_likes(integer) from public, anon, authenticated;
grant execute on function public.automation_run_due_likes(integer) to service_role;

-- Admin "Like now" button: one like immediately, outside the daily slot.
create or replace function public.admin_automation_like_now(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_or_moderator(auth.uid()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return public.automation_do_like(p_account_id, 'manual');
end;
$$;

revoke all on function public.admin_automation_like_now(uuid) from public, anon;
grant execute on function public.admin_automation_like_now(uuid) to authenticated;

select cron.schedule('automation-daily-likes', '* * * * *', $cron$ select public.automation_run_due_likes(); $cron$);
