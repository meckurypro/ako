-- Fix: books/courses activated via the project "..." menu (Make active / Restore)
-- only had status flipped, leaving published_at NULL, so owners saw "Not published yet"
-- on content that was already live. Stamp published_at whenever such a project is active.

-- 1. Backfill existing active books/courses that were never stamped.
update public.projects
set published_at = coalesce(updated_at, now())
where status = 'active'
  and published_at is null
  and project_type in ('book', 'course');

-- 2. Keep it consistent from now on, for web and native alike.
create or replace function public.stamp_published_at_on_activate()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'active'
     and new.published_at is null
     and new.project_type in ('book', 'course') then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_published_at_on_activate on public.projects;
create trigger trg_stamp_published_at_on_activate
before update on public.projects
for each row
execute function public.stamp_published_at_on_activate();
