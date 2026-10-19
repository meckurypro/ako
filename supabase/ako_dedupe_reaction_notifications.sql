-- Like/unlike/like toggling used to create a brand-new notification each time (unlike deletes the
-- reaction row, re-like inserts it again, and the trigger had no guard). One actor + one reaction
-- type + one target now yields exactly one notification, however often they toggle.

-- 1) One-off cleanup: keep the newest of each duplicate group, drop the rest.
delete from public.notifications n
using (
  select id, row_number() over (
    partition by user_id, actor_id, type, target_type, target_id
    order by created_at desc, id desc
  ) as rn
  from public.notifications
  where actor_id is not null
    and type in ('like','dislike','share','comment_like','comment_dislike')
) d
where n.id = d.id and d.rn > 1;

delete from public.page_notifications n
using (
  select id, row_number() over (
    partition by page_id, actor_id, type, target_type, target_id
    order by created_at desc, id desc
  ) as rn
  from public.page_notifications
  where actor_id is not null
    and type in ('like','dislike','share')
) d
where n.id = d.id and d.rn > 1;

-- 2) Personal notifications: guard every insert.
create or replace function public.notify_on_reaction()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_post_id uuid;
  v_post_author_id uuid;
  v_comment_author_id uuid;
  v_project_owner_id uuid;
  v_type text;
begin
  if new.target_type = 'post' then
    select author_id into v_post_author_id from posts where id = new.post_id;

    if v_post_author_id is not null and v_post_author_id <> new.user_id
       and not exists (
         select 1 from notifications
         where user_id = v_post_author_id and actor_id = new.user_id
           and type = new.type and target_type = 'post' and target_id = new.post_id
       ) then
      insert into notifications (user_id, type, actor_id, target_type, target_id)
      values (v_post_author_id, new.type, new.user_id, 'post', new.post_id);
    end if;

  elsif new.target_type = 'comment' then
    select author_id, post_id into v_comment_author_id, v_post_id
    from comments where id = new.comment_id;
    select author_id into v_post_author_id from posts where id = v_post_id;

    v_type := case new.type when 'like' then 'comment_like' when 'dislike' then 'comment_dislike' else new.type end;

    if v_comment_author_id is not null and v_comment_author_id <> new.user_id
       and not exists (
         select 1 from notifications
         where user_id = v_comment_author_id and actor_id = new.user_id
           and type = v_type and target_type = 'comment' and target_id = new.comment_id
       ) then
      insert into notifications (user_id, type, actor_id, target_type, target_id)
      values (v_comment_author_id, v_type, new.user_id, 'comment', new.comment_id);
    end if;

    if v_post_author_id is not null
       and v_post_author_id <> new.user_id
       and v_post_author_id <> v_comment_author_id
       and not exists (
         select 1 from notifications
         where user_id = v_post_author_id and actor_id = new.user_id
           and type = 'post_comment_activity' and target_type = 'comment' and target_id = new.comment_id
       ) then
      insert into notifications (user_id, type, actor_id, target_type, target_id)
      values (v_post_author_id, 'post_comment_activity', new.user_id, 'comment', new.comment_id);
    end if;

  elsif new.target_type = 'project' then
    select owner_id into v_project_owner_id from projects where id = new.project_id;

    if v_project_owner_id is not null and v_project_owner_id <> new.user_id
       and not exists (
         select 1 from notifications
         where user_id = v_project_owner_id and actor_id = new.user_id
           and type = new.type and target_type = 'project' and target_id = new.project_id
       ) then
      insert into notifications (user_id, type, actor_id, target_type, target_id)
      values (v_project_owner_id, new.type, new.user_id, 'project', new.project_id);
    end if;
  end if;

  return new;
end;
$function$;

-- 3) Page notifications: same guard.
create or replace function public.notify_page_on_reaction()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_page_id uuid;
  v_target uuid;
begin
  if NEW.target_type = 'post' and NEW.post_id is not null then
    select posted_as_page_id into v_page_id from public.posts where id = NEW.post_id;
  elsif NEW.target_type = 'comment' and NEW.comment_id is not null then
    select p.posted_as_page_id into v_page_id
    from public.comments c
    join public.posts p on p.id = c.post_id
    where c.id = NEW.comment_id;
  elsif NEW.target_type = 'project' and NEW.project_id is not null then
    select posted_as_page_id into v_page_id from public.projects where id = NEW.project_id;
  end if;

  v_target := coalesce(NEW.post_id, NEW.comment_id, NEW.project_id);

  if v_page_id is not null
     and not exists (
       select 1 from public.page_notifications
       where page_id = v_page_id and actor_id = NEW.user_id
         and type = NEW.type and target_type = NEW.target_type and target_id = v_target
     ) then
    insert into public.page_notifications (page_id, type, actor_id, target_type, target_id)
    values (v_page_id, NEW.type, NEW.user_id, NEW.target_type, v_target);
  end if;

  return NEW;
end;
$function$;
