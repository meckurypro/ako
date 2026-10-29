-- supabase/ako_automation_bot_rules.sql
-- Applied to the Ako project as migration `ako_automation_bot_rules`. Supersedes the versions of
-- automation_do_like / automation_pick_comment_target / automation_queue_reply in ako_automation_daily_likes.sql
-- and ako_automation_comments.sql.
--
-- Rules for automated accounts (bots):
--   Likes     never on a bot's post, never on a bot's comment.
--   Comments  any post (a bot's post is fine). Once per post per bot. Only one bot per post per 6 days.
--             Posts with fewer bot comments are preferred. The fallback (a comment under a comment) is human comments only.
--   Replies   a bot comment on a bot's post gets one closing reply (or a like) from the post's bot.
--             a bot reply under a bot's comment gets only a like or dislike back, no reply.
--             a thread with a human allows 3 replies from the bot in total.
-- The edge function run-comment-automation decides reply / close / react from who wrote the comment.

create or replace function public.automation_is_bot(p_user uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from automated_accounts where user_id = p_user)
$function$;

create or replace function public.automation_bot_comment_window()
returns interval language sql immutable as $function$ select interval '6 days' $function$;

create or replace function public.automation_do_like(p_account_id uuid, p_trigger text default 'schedule')
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_user    uuid;
  v_post    uuid;
  v_comment uuid;
begin
  select user_id into v_user from automated_accounts where id = p_account_id;
  if v_user is null then
    return jsonb_build_object('status', 'failed', 'error', 'Account not found');
  end if;

  select id into v_post from (
    select p.id
      from posts p
     where p.author_id <> v_user
       and not public.automation_is_bot(p.author_id)
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

  select id into v_comment from (
    select c.id
      from comments c
      join posts p on p.id = c.post_id
     where c.author_id <> v_user
       and not public.automation_is_bot(c.author_id)
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
$function$;

create or replace function public.automation_pick_comment_target(p_account_id uuid, p_exclude uuid[] default '{}'::uuid[])
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_user    uuid;
  v_post    uuid;
  v_comment uuid;
  v_cpost   uuid;
  v_win     interval := public.automation_bot_comment_window();
begin
  select user_id into v_user from automated_accounts where id = p_account_id;
  if v_user is null then return jsonb_build_object('kind', null); end if;

  select id into v_post from (
    select p.id,
           (select count(*) from comments bc
             where bc.post_id = p.id and not bc.is_deleted and bc.author_id <> p.author_id
               and public.automation_is_bot(bc.author_id)) as bot_cnt
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
       and not exists (
         select 1 from comments bc
          where bc.post_id = p.id and not bc.is_deleted
            and bc.author_id <> p.author_id
            and bc.created_at > now() - v_win
            and public.automation_is_bot(bc.author_id))
       and not exists (
         select 1 from blocked_users b
          where (b.blocker_id = p.author_id and b.blocked_id = v_user)
             or (b.blocker_id = v_user and b.blocked_id = p.author_id))
     order by p.created_at desc
     limit 50
  ) t
  order by bot_cnt asc, random() limit 1;

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
       and not public.automation_is_bot(c.author_id)
       and c.parent_comment_id is null
       and not c.is_deleted
       and not pr.is_deleted
       and char_length(btrim(c.content)) >= 8
       and not p.is_deleted and not p.is_archived
       and coalesce(p.status, 'published') = 'published'
       and p.visibility = 'public'
       and c.id <> all (p_exclude)
       and c.post_id <> all (p_exclude)
       and not exists (select 1 from comments own where own.post_id = c.post_id and own.author_id = v_user and not own.is_deleted)
       and not exists (
         select 1 from comments bc
          where bc.post_id = c.post_id and not bc.is_deleted
            and bc.author_id <> p.author_id
            and bc.created_at > now() - v_win
            and public.automation_is_bot(bc.author_id))
       and not exists (
         select 1 from blocked_users b
          where (b.blocker_id = c.author_id and b.blocked_id = v_user)
             or (b.blocker_id = v_user and b.blocked_id = c.author_id)
             or (b.blocker_id = p.author_id and b.blocked_id = v_user))
     order by c.created_at desc
     limit 50
  ) t
  order by random() limit 1;

  if v_comment is not null then
    return jsonb_build_object('kind', 'comment', 'post_id', v_cpost, 'comment_id', v_comment);
  end if;
  return jsonb_build_object('kind', null);
end;
$function$;

-- Hard guard, so the rules hold even when two bots pick the same post in the same minute.
-- Admin "comment now" runs (trigger = 'manual') are exempt.
create or replace function public.automation_guard_bot_comment()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_post_author uuid;
  v_win         interval := public.automation_bot_comment_window();
begin
  if not public.automation_is_bot(new.author_id) then return new; end if;

  if new.client_request_id is not null
     and exists (select 1 from automation_comment_log l where l.id = new.client_request_id and l.trigger = 'manual') then
    return new;
  end if;

  select author_id into v_post_author from posts where id = new.post_id;
  if v_post_author is null or v_post_author = new.author_id then return new; end if;

  perform pg_advisory_xact_lock(hashtextextended('bot_comment:' || new.post_id::text, 0));

  if exists (select 1 from comments c where c.post_id = new.post_id and c.author_id = new.author_id and not c.is_deleted) then
    if new.parent_comment_id is null then
      raise exception 'bot_rule: this account already commented on this post' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if exists (
    select 1 from comments c
     where c.post_id = new.post_id and not c.is_deleted
       and c.author_id <> new.author_id and c.author_id <> v_post_author
       and c.created_at > now() - v_win
       and public.automation_is_bot(c.author_id)
  ) then
    raise exception 'bot_rule: another automated account commented on this post recently' using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_automation_guard_bot_comment on public.comments;
create trigger trg_automation_guard_bot_comment
  before insert on public.comments
  for each row execute function public.automation_guard_bot_comment();

create or replace function public.automation_queue_reply()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_acct       automated_accounts%rowtype;
  v_root       uuid;
  v_thread     integer;
  v_today      integer;
  v_mins       numeric;
  v_author_bot boolean;
begin
  if new.is_deleted then return new; end if;
  v_author_bot := public.automation_is_bot(new.author_id);

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

  if exists (select 1 from blocked_users b
              where (b.blocker_id = new.author_id and b.blocked_id = v_acct.user_id)
                 or (b.blocker_id = v_acct.user_id and b.blocked_id = new.author_id)) then
    return new;
  end if;

  -- A human is in this thread: up to 3 replies from the bot in total.
  if new.parent_comment_id is not null and not v_author_bot then
    select coalesce(pc.parent_comment_id, pc.id) into v_root from comments pc where pc.id = new.parent_comment_id;
    select count(*) into v_thread
      from comments c
     where c.author_id = v_acct.user_id and not c.is_deleted and c.post_id = new.post_id
       and (c.parent_comment_id = v_root
            or c.parent_comment_id in (select id from comments where parent_comment_id = v_root));
    if v_thread >= 3 then return new; end if;
  end if;

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
$function$;
