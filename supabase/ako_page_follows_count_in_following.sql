-- File: supabase/ako_page_follows_count_in_following.sql
-- Following a PAGE writes to page_follows, but the follower's own
-- profiles.following_count only ever moved for person-to-person follows,
-- so a profile showed "3 Following" after the user had followed 3 people
-- AND 2 pages. Count page follows too, and backfill existing profiles.

create or replace function public.adjust_page_follower_count()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if TG_OP = 'INSERT' then
    update public.pages set follower_count = follower_count + 1 where id = new.page_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.pages set follower_count = greatest(follower_count - 1, 0) where id = old.page_id;
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    return old;
  end if;
  return null;
end;
$function$;

-- Backfill: following_count = people followed + pages followed.
update public.profiles p
set following_count = (select count(*) from public.follows f where f.follower_id = p.id)
                    + (select count(*) from public.page_follows pf where pf.follower_id = p.id)
where p.following_count is distinct from
      ((select count(*) from public.follows f where f.follower_id = p.id)
     + (select count(*) from public.page_follows pf where pf.follower_id = p.id));
