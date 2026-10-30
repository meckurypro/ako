-- supabase/ako_automation_reciprocity_follow.sql
-- Applied to the Ako project as migration `ako_automation_reciprocity_follow`.
--
-- Reciprocity auto-follow: a GLOBAL automation rule (not per account) that applies to every automated account.
--
--   An enabled automated account follows another account (a person or another automated account) once
--     1. it has engaged with that account at least `outgoing_min` times (default 100), AND
--     2. that account has engaged back with it at least `reciprocal_min` times (default 50).
--   The other account does not have to follow the automated account first.
--
-- What counts as one engagement (always done personally, never as a Page, on content the other account authored
-- personally, never on its Page content; deleted content is not counted):
--   - a reaction on a post or a comment  (one per post or comment, however many reaction types were used)
--   - a comment on a post, or a reply to a comment
--   - a reshare of a post, or a share of a comment
--   - a gift
-- Each action is counted once, because counts are read straight from the source rows. Nothing is incremented by an
-- event handler, so a repeated trigger or a duplicate webhook cannot inflate them. Counts are per ordered pair,
-- so what A does to B is tracked apart from what B does to A.
--
-- One time only: the first time a pair qualifies the follow is made and logged in automation_follow_log with the
-- counts and thresholds that triggered it. An account that was followed and later unfollowed is never followed again.
-- Blocked pairs (either direction) and deleted accounts are skipped.
--
-- The rule lives in automation_rules (admin only) and is edited on Admin > Automate posts. The sweep runs every
-- 10 minutes (pg_cron) and can be run by an admin on demand.

-- 1) Global rules table ----------------------------------------------------------------------------
create table if not exists public.automation_rules (
  key text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.automation_rules enable row level security;
revoke all on public.automation_rules from anon;

drop policy if exists automation_rules_admin_all on public.automation_rules;
create policy automation_rules_admin_all on public.automation_rules for all to authenticated
  using (public.is_admin_or_moderator((select auth.uid())))
  with check (public.is_admin_or_moderator((select auth.uid())));

create or replace function public.automation_rules_validate()
returns trigger language plpgsql set search_path to 'public' as $function$
declare
  v_out numeric;
  v_rec numeric;
begin
  if new.key = 'reciprocity_follow' then
    v_out := (new.config ->> 'outgoing_min')::numeric;
    v_rec := (new.config ->> 'reciprocal_min')::numeric;
    if v_out is null or v_rec is null then
      raise exception 'Both thresholds are required';
    end if;
    if v_out < 1 or v_rec < 1 or v_out > 100000 or v_rec > 100000 or v_out <> trunc(v_out) or v_rec <> trunc(v_rec) then
      raise exception 'Thresholds must be whole numbers from 1 to 100000';
    end if;
    new.config := jsonb_build_object('outgoing_min', v_out::int, 'reciprocal_min', v_rec::int);
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$function$;

drop trigger if exists trg_automation_rules_validate on public.automation_rules;
create trigger trg_automation_rules_validate before insert or update on public.automation_rules
  for each row execute function public.automation_rules_validate();

insert into public.automation_rules (key, enabled, config)
values ('reciprocity_follow', true, '{"outgoing_min":100,"reciprocal_min":50}'::jsonb)
on conflict (key) do nothing;

-- 2) Log of follows the rule made (also the one-time guard) -------------------------------------------
create table if not exists public.automation_follow_log (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  rule_key text not null default 'reciprocity_follow',
  outgoing_count integer not null,
  reciprocal_count integer not null,
  outgoing_min integer not null,
  reciprocal_min integer not null,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id)
);
create index if not exists automation_follow_log_created_idx on public.automation_follow_log (created_at desc);
create index if not exists automation_follow_log_following_idx on public.automation_follow_log (following_id);

alter table public.automation_follow_log enable row level security;
revoke all on public.automation_follow_log from anon;

drop policy if exists automation_follow_log_admin_read on public.automation_follow_log;
create policy automation_follow_log_admin_read on public.automation_follow_log for select to authenticated
  using (public.is_admin_or_moderator((select auth.uid())));

-- 3) Engagement counts for one actor, per target account --------------------------------------------
-- Returns how many times p_actor has engaged each account (or only p_target when given).
create or replace function public.automation_engagements_from(p_actor uuid, p_target uuid default null)
returns table (target_id uuid, engagements bigint)
language sql stable security definer set search_path to 'public' as $function$
  with e as (
    -- reactions on a post: one per post
    select 'rp:' || r.post_id::text as ekey, p.author_id as tgt
      from reactions r
      join posts p on p.id = r.post_id
     where r.user_id = p_actor and r.acted_as_page_id is null and r.post_id is not null
       and p.posted_as_page_id is null and not p.is_deleted
    union
    -- reactions on a comment: one per comment
    select 'rc:' || r.comment_id::text, c.author_id
      from reactions r
      join comments c on c.id = r.comment_id
     where r.user_id = p_actor and r.acted_as_page_id is null and r.comment_id is not null
       and c.posted_as_page_id is null and not c.is_deleted
    union
    -- a comment on someone's post
    select 'c:' || c.id::text, p.author_id
      from comments c
      join posts p on p.id = c.post_id
     where c.author_id = p_actor and c.posted_as_page_id is null and not c.is_deleted
       and p.posted_as_page_id is null and not p.is_deleted
    union
    -- a reply to someone's comment
    select 'c:' || c.id::text, pc.author_id
      from comments c
      join comments pc on pc.id = c.parent_comment_id
     where c.author_id = p_actor and c.posted_as_page_id is null and not c.is_deleted
       and pc.posted_as_page_id is null and not pc.is_deleted
    union
    -- a reshare of someone's post
    select 'sh:' || rs.id::text, o.author_id
      from posts rs
      join posts o on o.id = rs.reshared_post_id
     where rs.author_id = p_actor and rs.posted_as_page_id is null and not rs.is_deleted
       and o.posted_as_page_id is null and not o.is_deleted
    union
    -- a share of someone's comment
    select 'cs:' || cs.comment_id::text, c.author_id
      from comment_shares cs
      join comments c on c.id = cs.comment_id
     where cs.user_id = p_actor and c.posted_as_page_id is null and not c.is_deleted
    union
    -- a gift
    select 'g:' || g.id::text, g.recipient_id
      from gifts g
     where g.sender_id = p_actor
  )
  select e.tgt, count(*)::bigint
    from e
   where e.tgt is not null and e.tgt <> p_actor
     and (p_target is null or e.tgt = p_target)
   group by e.tgt
$function$;

-- 4) The sweep -----------------------------------------------------------------------------------
create or replace function public.automation_run_reciprocity_follow()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_rule      automation_rules;
  v_out_min   integer;
  v_rec_min   integer;
  v_bot       record;
  v_cand      record;
  v_rec       bigint;
  v_followed  integer := 0;
  v_checked   integer := 0;
begin
  select * into v_rule from automation_rules where key = 'reciprocity_follow';
  if v_rule.key is null or not v_rule.enabled then
    return jsonb_build_object('status', 'disabled');
  end if;
  v_out_min := coalesce((v_rule.config ->> 'outgoing_min')::int, 100);
  v_rec_min := coalesce((v_rule.config ->> 'reciprocal_min')::int, 50);

  for v_bot in select user_id from automated_accounts where is_enabled loop
    for v_cand in
      select ef.target_id, ef.engagements
        from automation_engagements_from(v_bot.user_id) ef
        join profiles tp on tp.id = ef.target_id and not coalesce(tp.is_deleted, false)
       where ef.engagements >= v_out_min
         and not exists (select 1 from follows f where f.follower_id = v_bot.user_id and f.following_id = ef.target_id)
         and not exists (select 1 from automation_follow_log l where l.follower_id = v_bot.user_id and l.following_id = ef.target_id)
         and not exists (select 1 from blocked_users b
                          where (b.blocker_id = v_bot.user_id and b.blocked_id = ef.target_id)
                             or (b.blocker_id = ef.target_id and b.blocked_id = v_bot.user_id))
    loop
      v_checked := v_checked + 1;
      select coalesce(sum(r.engagements), 0) into v_rec
        from automation_engagements_from(v_cand.target_id, v_bot.user_id) r;
      if v_rec >= v_rec_min then
        begin
          insert into follows (follower_id, following_id) values (v_bot.user_id, v_cand.target_id)
          on conflict do nothing;
          insert into automation_follow_log (follower_id, following_id, outgoing_count, reciprocal_count, outgoing_min, reciprocal_min)
          values (v_bot.user_id, v_cand.target_id, v_cand.engagements, v_rec, v_out_min, v_rec_min)
          on conflict (follower_id, following_id) do nothing;
          v_followed := v_followed + 1;
        exception when others then
          raise warning 'reciprocity follow failed for % -> %: %', v_bot.user_id, v_cand.target_id, sqlerrm;
        end;
      end if;
    end loop;
  end loop;

  return jsonb_build_object('status', 'ok', 'checked', v_checked, 'followed', v_followed,
                            'outgoing_min', v_out_min, 'reciprocal_min', v_rec_min);
end;
$function$;

-- Admin "Run now" wrapper (the sweep itself is not callable by clients).
create or replace function public.admin_run_reciprocity_follow()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_admin_or_moderator(auth.uid()) then
    raise exception 'Admins only';
  end if;
  return public.automation_run_reciprocity_follow();
end;
$function$;

revoke all on function public.automation_engagements_from(uuid, uuid) from public, anon, authenticated;
revoke all on function public.automation_run_reciprocity_follow() from public, anon, authenticated;
revoke all on function public.admin_run_reciprocity_follow() from public, anon;
grant execute on function public.admin_run_reciprocity_follow() to authenticated;

-- 5) Schedule ------------------------------------------------------------------------------------
select cron.schedule('automation-reciprocity-follow', '*/10 * * * *', 'select public.automation_run_reciprocity_follow();');
