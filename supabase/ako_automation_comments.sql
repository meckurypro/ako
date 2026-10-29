-- supabase/ako_automation_comments.sql
-- Comment automation for automated accounts. Two ways an account comments:
--
--   1. DAILY COMMENT (cron). Like the daily like: one comment a day at a chosen time in the account's timezone.
--      The account picks a random recent post by someone else that it has not commented on yet, reads it and writes
--      a short comment. Once it has commented on every available post it comments under other people's comments
--      instead. The stance (add / question / pushback / mixed) and the length cap are set per account.
--   2. REPLY. When a real person comments on an automated account's post (or replies to one of its comments), a reply
--      is queued to go out a random number of minutes later (the admin sets the range). The comment is the trigger.
--      Automated accounts never reply to other automated accounts, so two of them can never chat each other into a loop.
--
-- The AI call itself happens in the run-comment-automation edge function (the account's own provider and key from
-- Vault, same as run-post-automation). This file holds the settings, the log/queue, the cron-safe claim function and
-- the picker. Comments are written through the normal `comments` table, so counters, notifications and give-back
-- triggers behave exactly as for a human comment.
--
-- Admin-only. Run once in the Supabase SQL editor. Safe to re-run.

alter table public.automated_accounts
  add column if not exists daily_comment_enabled boolean     not null default false,
  add column if not exists daily_comment_time    text        not null default '14:00',
  add column if not exists next_comment_at       timestamptz,
  add column if not exists comment_locked_until  timestamptz,
  add column if not exists last_comment_at       timestamptz,
  -- support = an add, question, pushback; mixed = varies from comment to comment.
  add column if not exists comment_stance        text        not null default 'support',
  add column if not exists comment_max_chars     integer     not null default 100,
  -- Extra voice notes for comments only (how this account talks in a comment thread). Optional.
  add column if not exists comment_voice         text        not null default '',
  add column if not exists reply_enabled         boolean     not null default false,
  add column if not exists reply_delay_min       integer     not null default 3,
  add column if not exists reply_delay_max       integer     not null default 12,
  add column if not exists reply_daily_cap       integer     not null default 30;

alter table public.automated_accounts drop constraint if exists automated_accounts_daily_comment_time_check;
alter table public.automated_accounts add constraint automated_accounts_daily_comment_time_check
  check (daily_comment_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
alter table public.automated_accounts drop constraint if exists automated_accounts_comment_stance_check;
alter table public.automated_accounts add constraint automated_accounts_comment_stance_check
  check (comment_stance in ('support', 'question', 'pushback', 'mixed'));
alter table public.automated_accounts drop constraint if exists automated_accounts_comment_max_chars_check;
alter table public.automated_accounts add constraint automated_accounts_comment_max_chars_check
  check (comment_max_chars between 20 and 280);
alter table public.automated_accounts drop constraint if exists automated_accounts_comment_voice_check;
alter table public.automated_accounts add constraint automated_accounts_comment_voice_check
  check (char_length(comment_voice) <= 1200);
alter table public.automated_accounts drop constraint if exists automated_accounts_reply_delay_check;
alter table public.automated_accounts add constraint automated_accounts_reply_delay_check
  check (reply_delay_min between 1 and 1440 and reply_delay_max between 1 and 1440 and reply_delay_min <= reply_delay_max);
alter table public.automated_accounts drop constraint if exists automated_accounts_reply_daily_cap_check;
alter table public.automated_accounts add constraint automated_accounts_reply_daily_cap_check
  check (reply_daily_cap between 1 and 200);

-- Log + queue in one table. A reply is queued here the moment someone comments, and runs when due_at has passed.
create table if not exists public.automation_comment_log (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid not null references public.automated_accounts (id) on delete cascade,
  kind               text not null check (kind in ('comment', 'reply')),
  trigger            text not null check (trigger in ('schedule', 'manual', 'reply')),
  status             text not null default 'queued'
                     check (status in ('queued', 'running', 'posted', 'nothing_to_comment', 'skipped', 'failed')),
  scheduled_for      timestamptz,                      -- the daily slot (schedule runs only)
  due_at             timestamptz not null default now(),
  post_id            uuid references public.posts (id) on delete set null,
  source_comment_id  uuid references public.comments (id) on delete set null,  -- reply: the comment being answered
  comment_id         uuid references public.comments (id) on delete set null,  -- the comment that was written
  stance             text,
  content            text,
  error              text,
  model              text,
  input_tokens       integer not null default 0,
  output_tokens      integer not null default 0,
  attempts           integer not null default 0,
  attempt_started_at timestamptz,
  created_at         timestamptz not null default now(),
  finished_at        timestamptz
);
create index if not exists automation_comment_log_account_idx on public.automation_comment_log (account_id, created_at desc);
create index if not exists automation_comment_log_due_idx on public.automation_comment_log (due_at) where status = 'queued';
create unique index if not exists automation_comment_log_slot_key
  on public.automation_comment_log (account_id, scheduled_for) where trigger = 'schedule';
create unique index if not exists automation_comment_log_reply_key
  on public.automation_comment_log (account_id, source_comment_id) where kind = 'reply';
create index if not exists automation_comment_log_post_idx on public.automation_comment_log (post_id);
create index if not exists automation_comment_log_comment_idx on public.automation_comment_log (comment_id);
create index if not exists automation_comment_log_source_idx on public.automation_comment_log (source_comment_id);

alter table public.automation_comment_log enable row level security;
drop policy if exists "Admins read automation comment log" on public.automation_comment_log;
create policy "Admins read automation comment log" on public.automation_comment_log
  for select to authenticated using (public.is_admin_or_moderator((select auth.uid())));

-- Keep next_comment_at in step with the settings, and never leave commenting switched on without an AI key.
create or replace function public.automated_accounts_comment_schedule()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.api_key_secret_id is null then
    -- Turning commenting on needs a key. A key being removed (or the provider changed) switches it off quietly,
    -- exactly like is_enabled, instead of failing that other operation.
    if (new.daily_comment_enabled and (tg_op = 'INSERT' or not old.daily_comment_enabled))
       or (new.reply_enabled and (tg_op = 'INSERT' or not old.reply_enabled)) then
      raise exception 'Add an API key before turning commenting on' using errcode = '22023';
    end if;
    new.daily_comment_enabled := false;
    new.reply_enabled := false;
  end if;

  if not new.daily_comment_enabled then
    new.next_comment_at := null;
  elsif tg_op = 'INSERT'
     or new.next_comment_at is null
     or new.daily_comment_enabled is distinct from old.daily_comment_enabled
     or new.daily_comment_time    is distinct from old.daily_comment_time
     or new.timezone              is distinct from old.timezone then
    new.next_comment_at := public.automation_next_run(
      jsonb_build_array(jsonb_build_object('time', new.daily_comment_time)), new.timezone, now());
  end if;
  return new;
end;
$$;

drop trigger if exists automated_accounts_comment_schedule on public.automated_accounts;
create trigger automated_accounts_comment_schedule
  before insert or update on public.automated_accounts
  for each row execute function public.automated_accounts_comment_schedule();

update public.automated_accounts set daily_comment_enabled = daily_comment_enabled;

-- A comment by a real person on an automated account's post (or under one of its comments) queues a reply.
-- Never blocks or fails the person's comment: any error here is swallowed.
create or replace function public.automation_queue_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acct   automated_accounts%rowtype;
  v_root   uuid;
  v_thread integer;
  v_today  integer;
  v_mins   numeric;
begin
  if new.is_deleted then return new; end if;
  -- Automated accounts never trigger each other.
  if exists (select 1 from automated_accounts where user_id = new.author_id) then return new; end if;

  if new.parent_comment_id is null then
    select a.* into v_acct
      from posts p join automated_accounts a on a.user_id = p.author_id
     where p.id = new.post_id and p.posted_as_page_id is null;
  else
    select a.* into v_acct
      from comments c join automated_accounts a on a.user_id = c.author_id
     where c.id = new.parent_comment_id and not c.is_deleted;
  end if;
  if not found or not v_acct.reply_enabled then return new; end if;
  if v_acct.user_id = new.author_id then return new; end if;

  -- Someone who blocked the account should not hear from it.
  if exists (select 1 from blocked_users b
              where (b.blocker_id = new.author_id and b.blocked_id = v_acct.user_id)
                 or (b.blocker_id = v_acct.user_id and b.blocked_id = new.author_id)) then
    return new;
  end if;

  -- Cap how many times the account speaks in one thread, so a long argument has an end.
  if new.parent_comment_id is not null then
    select coalesce(pc.parent_comment_id, pc.id) into v_root from comments pc where pc.id = new.parent_comment_id;
    select count(*) into v_thread
      from comments c
     where c.author_id = v_acct.user_id and not c.is_deleted and c.post_id = new.post_id
       and (c.parent_comment_id = v_root
            or c.parent_comment_id in (select id from comments where parent_comment_id = v_root));
    if v_thread >= 4 then return new; end if;
  end if;

  -- Daily ceiling on replies, to keep AI spend predictable.
  select count(*) into v_today from automation_comment_log
   where account_id = v_acct.id and kind = 'reply' and created_at > now() - interval '24 hours'
     and status in ('queued', 'running', 'posted');
  if v_today >= v_acct.reply_daily_cap then return new; end if;

  v_mins := v_acct.reply_delay_min + random() * (v_acct.reply_delay_max - v_acct.reply_delay_min);
  insert into automation_comment_log (account_id, kind, trigger, status, due_at, post_id, source_comment_id)
  values (v_acct.id, 'reply', 'reply', 'queued', now() + make_interval(secs => round(v_mins * 60)::int), new.post_id, new.id)
  on conflict do nothing;
  return new;
exception when others then
  return new;
end;
$$;

revoke all on function public.automation_queue_reply() from public, anon, authenticated;

drop trigger if exists trg_automation_queue_reply on public.comments;
create trigger trg_automation_queue_reply
  after insert on public.comments
  for each row execute function public.automation_queue_reply();

-- Cron-safe claim. Returns the log rows the edge function should work on now:
--   1. daily slots that are due (a row is opened for each, UNIQUE (account_id, scheduled_for) makes a slot run once);
--   2. queued rows whose due_at has passed: replies, manual runs, and earlier failures waiting to retry.
create or replace function public.automation_claim_due_comments(p_limit integer default 5)
returns table (out_log_id uuid, out_account_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  r       record;
  v_next  timestamptz;
  v_log   uuid;
  v_count integer := 0;
begin
  update automation_comment_log
     set status = 'failed', error = 'Timed out before finishing', finished_at = now()
   where status = 'running' and attempt_started_at < now() - interval '10 minutes';

  for r in
    select id, next_comment_at, daily_comment_time, timezone
      from automated_accounts
     where daily_comment_enabled
       and next_comment_at is not null
       and next_comment_at <= now()
       and (comment_locked_until is null or comment_locked_until < now())
     order by next_comment_at
     limit p_limit
     for update skip locked
  loop
    v_next := automation_next_run(jsonb_build_array(jsonb_build_object('time', r.daily_comment_time)), r.timezone, now());

    if r.next_comment_at < now() - interval '12 hours' then
      insert into automation_comment_log (account_id, kind, trigger, status, scheduled_for, error, finished_at)
      values (r.id, 'comment', 'schedule', 'skipped', r.next_comment_at, 'Missed its slot by more than 12 hours', now())
      on conflict do nothing;
      update automated_accounts set next_comment_at = v_next where id = r.id;
      continue;
    end if;

    v_log := null;
    insert into automation_comment_log (account_id, kind, trigger, status, scheduled_for, attempts, attempt_started_at)
    values (r.id, 'comment', 'schedule', 'running', r.next_comment_at, 1, now())
    on conflict do nothing
    returning id into v_log;

    update automated_accounts
       set next_comment_at = v_next, comment_locked_until = now() + interval '10 minutes', last_comment_at = now()
     where id = r.id;

    if v_log is not null then
      out_log_id := v_log;
      out_account_id := r.id;
      v_count := v_count + 1;
      return next;
    end if;
  end loop;

  for r in
    select l.id, l.account_id, l.kind, l.trigger, a.reply_enabled, a.daily_comment_enabled
      from automation_comment_log l
      join automated_accounts a on a.id = l.account_id
     where l.status = 'queued' and l.due_at <= now()
     order by l.due_at
     limit greatest(p_limit - v_count, 0)
     for update of l skip locked
  loop
    -- The on/off switches govern the automatic paths only; a manual run was asked for by an admin.
    if (r.trigger = 'reply' and not r.reply_enabled)
       or (r.trigger = 'schedule' and not r.daily_comment_enabled) then
      update automation_comment_log
         set status = 'skipped', error = 'Switched off before it ran', finished_at = now()
       where id = r.id;
      continue;
    end if;

    update automation_comment_log
       set status = 'running', attempts = attempts + 1, attempt_started_at = now()
     where id = r.id;
    out_log_id := r.id;
    out_account_id := r.account_id;
    v_count := v_count + 1;
    return next;
  end loop;
end;
$$;

revoke all on function public.automation_claim_due_comments(integer) from public, anon, authenticated;
grant execute on function public.automation_claim_due_comments(integer) to service_role;

-- Picks what the account should comment on now. Returns {kind: 'post'|'comment'|null, post_id, comment_id}.
--   1. A random one of the 50 newest public posts by someone else that the account has no comment on yet.
--   2. When there are none, a random top-level comment by someone else that the account has not answered.
-- p_exclude lets the caller ask again for a different target when the model decides one is not worth a comment.
create or replace function public.automation_pick_comment_target(p_account_id uuid, p_exclude uuid[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid;
  v_post    uuid;
  v_comment uuid;
  v_cpost   uuid;
begin
  select user_id into v_user from automated_accounts where id = p_account_id;
  if v_user is null then return jsonb_build_object('kind', null); end if;

  select id into v_post from (
    select p.id
      from posts p
      join profiles pr on pr.id = p.author_id
     where p.author_id <> v_user
       and not pr.is_deleted and not pr.is_private
       and not p.is_deleted and not p.is_archived
       and coalesce(p.status, 'published') = 'published'
       and p.visibility = 'public'
       and p.posted_as_page_id is null
       and char_length(btrim(coalesce(p.content, ''))) >= 20
       and p.id <> all (p_exclude)
       and not exists (select 1 from comments c where c.post_id = p.id and c.author_id = v_user and not c.is_deleted)
       and not exists (select 1 from blocked_users b where b.blocker_id = p.author_id and b.blocked_id = v_user)
     order by p.created_at desc
     limit 50
  ) t
  order by random() limit 1;

  if v_post is not null then
    return jsonb_build_object('kind', 'post', 'post_id', v_post);
  end if;

  select id, post_id into v_comment, v_cpost from (
    select c.id, c.post_id
      from comments c
      join posts p on p.id = c.post_id
      join profiles pr on pr.id = c.author_id
     where c.author_id <> v_user
       and p.author_id <> v_user
       and c.parent_comment_id is null
       and not c.is_deleted
       and not pr.is_deleted
       and char_length(btrim(c.content)) >= 8
       and not p.is_deleted and not p.is_archived
       and coalesce(p.status, 'published') = 'published'
       and p.visibility = 'public'
       and c.id <> all (p_exclude)
       and not exists (select 1 from comments r where r.parent_comment_id = c.id and r.author_id = v_user and not r.is_deleted)
       and not exists (select 1 from blocked_users b where b.blocker_id = c.author_id and b.blocked_id = v_user)
     order by c.created_at desc
     limit 50
  ) t
  order by random() limit 1;

  if v_comment is not null then
    return jsonb_build_object('kind', 'comment', 'post_id', v_cpost, 'comment_id', v_comment);
  end if;
  return jsonb_build_object('kind', null);
end;
$$;

revoke all on function public.automation_pick_comment_target(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.automation_pick_comment_target(uuid, uuid[]) to service_role;

-- Cron: tick the edge function every minute, but only when something is due (like run-post-automation).
select cron.schedule('automation-comments', '* * * * *', $cron$
  do $do$
  begin
    if exists (
      select 1 from public.automated_accounts
       where daily_comment_enabled and next_comment_at is not null and next_comment_at <= now()
         and (comment_locked_until is null or comment_locked_until < now())
    ) or exists (
      select 1 from public.automation_comment_log where status = 'queued' and due_at <= now()
    ) then
      perform public.invoke_push_function('run-comment-automation', '{"mode":"tick"}'::jsonb);
    end if;
  end
  $do$;
$cron$);

select cron.schedule('automation-prune-comment-log', '23 3 * * *', $cron$
  delete from public.automation_comment_log where created_at < now() - interval '30 days';
$cron$);
