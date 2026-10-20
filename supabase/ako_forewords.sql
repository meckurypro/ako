-- supabase/ako_forewords.sql
-- Forewords: a creator invites an existing user to preview a book or course (before or after publishing) and write a
-- short endorsement. The invitee can decline (final) or write 20-1,500 characters (no links), plus an optional credit
-- line and a "connection to disclose". The creator approves, declines or removes - never edits. Approved forewords are
-- built into the product itself: a locked "Foreword" chapter (book) or module with one lesson (course), signed with the
-- writer's name. Invitees can read the work while their invite is open (and after they've written).
-- Applied to the Ako Temp project. Idempotent where practical.
-- NOTE: re-exported from the live database after the fact (the original migration file was never committed), so the
-- live schema is the source of truth. Keep the notifications_type_check list below in sync with the live constraint.

-- ---------------------------------------------------------------- table
create table if not exists public.project_forewords (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'invited'
    check (status in ('invited','submitted','approved','declined','rejected','withdrawn','revoked')),
  invite_note text check (invite_note is null or char_length(invite_note) <= 300),
  body text check (body is null or (char_length(body) >= 20 and char_length(body) <= 1500)),
  credit_line text check (credit_line is null or char_length(credit_line) <= 80),
  disclosure text check (disclosure is null or char_length(disclosure) <= 160),
  published_body text,
  published_credit_line text,
  published_disclosure text,
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  responded_at timestamptz,
  submitted_at timestamptz,
  decided_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (project_id, invitee_id)
);
create index if not exists project_forewords_invitee_idx on public.project_forewords (invitee_id, status);
create index if not exists project_forewords_project_idx on public.project_forewords (project_id, status);

alter table public.book_chapters add column if not exists is_foreword_managed boolean not null default false;
alter table public.course_modules add column if not exists is_foreword_managed boolean not null default false;

-- Writes only happen through the SECURITY DEFINER functions below.
alter table public.project_forewords enable row level security;
revoke insert, update, delete, truncate, references, trigger on public.project_forewords from anon, authenticated;
revoke all on public.project_forewords from anon;

-- ---------------------------------------------------------------- notifications
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type = any (array[
  'like','dislike','support','disagree','pushback','reshare','quote','comment_reply','follow','mention',
  'gift_received','moderation_notice','system','message','follow_request','follow_request_accepted',
  'page_role_invite','page_role_accepted','page_role_declined','comment_like','comment_dislike',
  'post_comment_activity','admin_message','post_tagged','project_tagged','collaboration_invite',
  'collaboration_accepted','collaboration_declined','promotion_approved','promotion_declined','post_published',
  'room_meeting_scheduled','comment','share','give_back_received','gig_created_from_collaboration',
  'music_credit_request','project_purchased','affiliate_commission_earned','withdrawal_status',
  'foreword_invite','foreword_submitted','foreword_approved','foreword_declined','project_access_granted']));

-- ---------------------------------------------------------------- helpers
create or replace function public.foreword_supported_type(p_type text)
returns boolean language sql immutable as $$ select p_type in ('book', 'course') $$;

-- Markdown-safe text for the book chapter: every markup character is escaped so a foreword can't inject formatting.
create or replace function public.foreword_escape_md(p_text text)
returns text language sql immutable as $$
  select coalesce(string_agg(
    regexp_replace(
      regexp_replace(line, '([\\`*_{}\[\]<>()#+!|~])', '\\\1', 'g'),
      '^(\s*)(-|\d+[.)])', '\1\\\2'),
    E'\n' order by n), '')
  from regexp_split_to_table(replace(coalesce(p_text, ''), E'\r', ''), E'\n') with ordinality as t(line, n)
$$;

-- Plain text for the course lesson.
create or replace function public.foreword_plain_text(p_text text)
returns text language sql immutable as $$
  select coalesce(string_agg(
    regexp_replace(replace(replace(line, '`', ''), '*', ''), '^\s*([#>\-]+|\d+[.)])\s+', ''),
    E'\n' order by n), '')
  from regexp_split_to_table(replace(coalesce(p_text, ''), E'\r', ''), E'\n') with ordinality as t(line, n)
$$;

create or replace function public.touch_project_foreword_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists project_forewords_touch on public.project_forewords;
create trigger project_forewords_touch before update on public.project_forewords
  for each row execute function public.touch_project_foreword_updated_at();

-- ---------------------------------------------------------------- preview access
create or replace function public.can_preview_project_for_foreword(p_project_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null and exists (
    select 1 from project_forewords f
    where f.project_id = p_project_id
      and f.invitee_id = auth.uid()
      and (f.status in ('submitted', 'approved') or (f.status = 'invited' and f.expires_at > now()))
  );
$$;

-- ---------------------------------------------------------------- RPCs
create or replace function public.invite_project_foreword(p_project_id uuid, p_invitee_id uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_proj record;
  v_row record;
  v_id uuid;
  v_live integer;
begin
  if v_uid is null then raise exception 'Sign in first.'; end if;
  select id, owner_id, title, project_type, status into v_proj from projects where id = p_project_id;
  if v_proj.id is null or v_proj.owner_id <> v_uid then raise exception 'Only the creator can invite a foreword.'; end if;
  if not foreword_supported_type(v_proj.project_type) then raise exception 'Forewords are available for books and courses.'; end if;
  if v_proj.status in ('archived', 'cancelled') then raise exception 'This project is no longer active.'; end if;
  if p_invitee_id = v_uid then raise exception 'You can''t invite yourself.'; end if;
  if not exists (select 1 from profiles where id = p_invitee_id and is_deleted = false) then
    raise exception 'That person isn''t available.';
  end if;
  if exists (select 1 from blocked_users b where (b.blocker_id = v_uid and b.blocked_id = p_invitee_id) or (b.blocker_id = p_invitee_id and b.blocked_id = v_uid)) then
    raise exception 'That person isn''t available.';
  end if;

  select count(*) into v_live from project_forewords
    where project_id = p_project_id
      and (status in ('submitted', 'approved') or (status = 'invited' and expires_at > now()));
  if v_live >= 5 then raise exception 'You can have up to 5 forewords in progress. Remove or wait for one before inviting another.'; end if;

  select * into v_row from project_forewords where project_id = p_project_id and invitee_id = p_invitee_id;
  if v_row.id is not null then
    if v_row.status in ('submitted', 'approved') or (v_row.status = 'invited' and v_row.expires_at > now()) then
      raise exception 'Already invited.';
    elsif v_row.status in ('declined', 'rejected') then
      raise exception 'This person has already responded to your foreword invite.';
    end if;
    update project_forewords set status = 'invited', invited_by = v_uid, invite_note = nullif(trim(p_note), ''),
      body = null, credit_line = null, disclosure = null, published_body = null, published_credit_line = null,
      published_disclosure = null, invited_at = now(), expires_at = now() + interval '30 days',
      responded_at = null, submitted_at = null, decided_at = null
      where id = v_row.id returning id into v_id;
  else
    insert into project_forewords (project_id, invitee_id, invited_by, invite_note)
      values (p_project_id, p_invitee_id, v_uid, nullif(trim(p_note), '')) returning id into v_id;
  end if;

  insert into notifications (user_id, type, actor_id, target_type, target_id, preview_text)
    values (p_invitee_id, 'foreword_invite', v_uid, 'project', p_project_id, left(v_proj.title, 120));
  return v_id;
end $$;

create or replace function public.decline_project_foreword(p_project_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_f project_forewords%rowtype; v_title text;
begin
  select * into v_f from project_forewords where project_id = p_project_id and invitee_id = auth.uid();
  if v_f.id is null or v_f.status <> 'invited' then raise exception 'This invite isn''t pending anymore.'; end if;
  update project_forewords set status = 'declined', responded_at = now() where id = v_f.id;
  select title into v_title from projects where id = p_project_id;
  insert into notifications (user_id, type, actor_id, target_type, target_id, preview_text)
    values (v_f.invited_by, 'foreword_declined', v_f.invitee_id, 'project', p_project_id, left(v_title, 120));
end $$;

create or replace function public.submit_project_foreword(p_project_id uuid, p_body text, p_credit_line text default null, p_disclosure text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_f project_forewords%rowtype;
  v_body text := trim(coalesce(p_body, ''));
  v_title text;
begin
  select * into v_f from project_forewords where project_id = p_project_id and invitee_id = auth.uid();
  if v_f.id is null then raise exception 'You haven''t been invited to write this foreword.'; end if;
  if v_f.status = 'invited' and v_f.expires_at <= now() then raise exception 'This invite has expired.'; end if;
  if v_f.status not in ('invited', 'submitted', 'approved') then raise exception 'This invite isn''t open anymore.'; end if;
  if char_length(v_body) < 20 then raise exception 'Write at least a couple of sentences.'; end if;
  if char_length(v_body) > 1500 then raise exception 'Keep it under 1,500 characters.'; end if;
  if v_body ~* '(https?://|www\.|\]\()' then raise exception 'Links aren''t allowed in a foreword.'; end if;

  update project_forewords set status = 'submitted', body = v_body, credit_line = nullif(trim(p_credit_line), ''),
    disclosure = nullif(trim(p_disclosure), ''), submitted_at = now(), responded_at = coalesce(responded_at, now())
    where id = v_f.id;
  select title into v_title from projects where id = p_project_id;
  insert into notifications (user_id, type, actor_id, target_type, target_id, preview_text)
    values (v_f.invited_by, 'foreword_submitted', v_f.invitee_id, 'project', p_project_id, left(v_title, 120));
end $$;

create or replace function public.withdraw_project_foreword(p_project_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_f project_forewords%rowtype;
begin
  select * into v_f from project_forewords where project_id = p_project_id and invitee_id = auth.uid();
  if v_f.id is null or v_f.status not in ('submitted', 'approved') then raise exception 'There is nothing to withdraw.'; end if;
  update project_forewords set status = 'withdrawn', body = null, credit_line = null, disclosure = null,
    published_body = null, published_credit_line = null, published_disclosure = null where id = v_f.id;
  perform sync_project_foreword_content(v_f.project_id);
end $$;

create or replace function public.revoke_project_foreword(p_foreword_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_f project_forewords%rowtype;
begin
  select * into v_f from project_forewords where id = p_foreword_id;
  if v_f.id is null or not exists (select 1 from projects p where p.id = v_f.project_id and p.owner_id = auth.uid()) then
    raise exception 'Only the creator can cancel an invite.';
  end if;
  if v_f.status <> 'invited' then raise exception 'Only a pending invite can be cancelled.'; end if;
  update project_forewords set status = 'revoked' where id = v_f.id;
end $$;

create or replace function public.review_project_foreword(p_foreword_id uuid, p_action text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_f project_forewords%rowtype;
  v_title text;
begin
  select * into v_f from project_forewords where id = p_foreword_id;
  if v_f.id is null or not exists (select 1 from projects p where p.id = v_f.project_id and p.owner_id = v_uid) then
    raise exception 'Only the creator can review forewords.';
  end if;
  select title into v_title from projects where id = v_f.project_id;

  if p_action = 'approve' then
    if v_f.status <> 'submitted' then raise exception 'There is nothing to approve.'; end if;
    update project_forewords set status = 'approved', published_body = body, published_credit_line = credit_line,
      published_disclosure = disclosure, decided_at = now() where id = v_f.id;
    perform sync_project_foreword_content(v_f.project_id);
    insert into notifications (user_id, type, actor_id, target_type, target_id, preview_text)
      values (v_f.invitee_id, 'foreword_approved', v_uid, 'project', v_f.project_id, left(v_title, 120));
  elsif p_action = 'reject' then
    if v_f.status <> 'submitted' then raise exception 'There is nothing to decline.'; end if;
    if v_f.published_body is not null then
      update project_forewords set status = 'approved', body = published_body, credit_line = published_credit_line,
        disclosure = published_disclosure where id = v_f.id;
    else
      update project_forewords set status = 'rejected', decided_at = now() where id = v_f.id;
    end if;
  elsif p_action = 'remove' then
    if v_f.status not in ('approved', 'submitted') then raise exception 'There is nothing to remove.'; end if;
    update project_forewords set status = 'rejected', published_body = null, published_credit_line = null,
      published_disclosure = null, decided_at = now() where id = v_f.id;
    perform sync_project_foreword_content(v_f.project_id);
  else
    raise exception 'Unknown action.';
  end if;
end $$;

-- Rebuilds the locked Foreword chapter (book) / module + lesson (course) from every published foreword.
create or replace function public.sync_project_foreword_content(p_project_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_type text;
  v_count integer;
  v_title text;
  v_md text;
  v_plain text;
  v_ch uuid;
  v_mod uuid;
  v_target integer;
begin
  perform set_config('ako.foreword_sync', 'on', true);

  select project_type into v_type from projects where id = p_project_id;
  if v_type is null then perform set_config('ako.foreword_sync', 'off', true); return; end if;

  select count(*) into v_count from project_forewords
    where project_id = p_project_id and published_body is not null and status in ('approved', 'submitted');
  v_title := case when v_count > 1 then 'Forewords' else 'Foreword' end;

  select
    string_agg(
      public.foreword_escape_md(f.published_body) || E'\n\n— **' || public.foreword_escape_md(p.display_name) || '**'
        || coalesce(E'\n\n*' || nullif(public.foreword_escape_md(trim(f.published_credit_line)), '') || '*', '')
        || coalesce(E'\n\n*' || nullif(public.foreword_escape_md(trim(f.published_disclosure)), '') || '*', ''),
      E'\n\n---\n\n' order by f.decided_at, f.id),
    string_agg(
      public.foreword_plain_text(f.published_body) || E'\n\n— ' || p.display_name
        || coalesce(E'\n' || nullif(trim(f.published_credit_line), ''), '')
        || coalesce(E'\n' || nullif(trim(f.published_disclosure), ''), ''),
      E'\n\n' order by f.decided_at, f.id)
  into v_md, v_plain
  from project_forewords f join profiles p on p.id = f.invitee_id
  where f.project_id = p_project_id and f.published_body is not null and f.status in ('approved', 'submitted');

  if v_type = 'book' then
    select id into v_ch from book_chapters where project_id = p_project_id and is_foreword_managed limit 1;
    if v_count = 0 then
      delete from book_chapters where id = v_ch;
    elsif v_ch is null then
      select coalesce(max(sort_order) + 1, 0) into v_target from book_chapters where project_id = p_project_id and kind = 'dedication';
      update book_chapters set sort_order = sort_order + 1 where project_id = p_project_id and sort_order >= v_target;
      insert into book_chapters (project_id, kind, title, content, sort_order, is_foreword_managed)
        values (p_project_id, 'foreword', v_title, v_md, v_target, true);
    else
      update book_chapters set title = v_title, content = v_md where id = v_ch;
    end if;
  elsif v_type = 'course' then
    select id into v_mod from course_modules where project_id = p_project_id and is_foreword_managed limit 1;
    if v_count = 0 then
      delete from course_lessons where module_id = v_mod;
      delete from course_modules where id = v_mod;
    elsif v_mod is null then
      select coalesce(min(sort_order), 1) - 1 into v_target from course_modules where project_id = p_project_id;
      insert into course_modules (project_id, title, sort_order, is_foreword_managed)
        values (p_project_id, v_title, v_target, true) returning id into v_mod;
      insert into course_lessons (module_id, title, content, sort_order, is_free_preview)
        values (v_mod, v_title, v_plain, 0, true);
    else
      update course_modules set title = v_title where id = v_mod;
      update course_lessons set title = v_title, content = v_plain where module_id = v_mod;
    end if;
  end if;

  perform set_config('ako.foreword_sync', 'off', true);
end $$;

-- ---------------------------------------------------------------- guard: managed rows are locked for everyone
create or replace function public.guard_foreword_managed_rows()
returns trigger language plpgsql as $$
declare v_sync boolean := coalesce(current_setting('ako.foreword_sync', true), '') = 'on';
        v_managed boolean;
begin
  if v_sync then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_table_name = 'course_lessons' then
    select m.is_foreword_managed into v_managed from public.course_modules m
      where m.id = case when tg_op = 'DELETE' then old.module_id else new.module_id end;
    if coalesce(v_managed, false) then
      raise exception 'The foreword lesson is written by the people who endorse your course, so it can''t be edited here.';
    end if;
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'INSERT' then
    if new.is_foreword_managed then
      raise exception 'Foreword content is created automatically when you approve a foreword.';
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.is_foreword_managed then
      raise exception 'The foreword is written by the people who endorse your work. Remove a foreword from the Forewords panel instead.';
    end if;
    return old;
  else
    if old.is_foreword_managed or new.is_foreword_managed then
      if new.is_foreword_managed is distinct from old.is_foreword_managed
         or new.title is distinct from old.title
         or new.project_id is distinct from old.project_id
         or (to_jsonb(new) ->> 'content') is distinct from (to_jsonb(old) ->> 'content')
         or (to_jsonb(new) ->> 'kind') is distinct from (to_jsonb(old) ->> 'kind') then
        raise exception 'The foreword is written by the people who endorse your work, so it can''t be edited here.';
      end if;
    end if;
    return new;
  end if;
end $$;

drop trigger if exists trg_guard_foreword_book_chapters on public.book_chapters;
create trigger trg_guard_foreword_book_chapters before insert or delete or update on public.book_chapters
  for each row execute function public.guard_foreword_managed_rows();
drop trigger if exists trg_guard_foreword_course_modules on public.course_modules;
create trigger trg_guard_foreword_course_modules before insert or delete or update on public.course_modules
  for each row execute function public.guard_foreword_managed_rows();
drop trigger if exists trg_guard_foreword_course_lessons on public.course_lessons;
create trigger trg_guard_foreword_course_lessons before insert or delete or update on public.course_lessons
  for each row execute function public.guard_foreword_managed_rows();

-- ---------------------------------------------------------------- RLS
drop policy if exists "owner and invitee read forewords" on public.project_forewords;
create policy "owner and invitee read forewords" on public.project_forewords for select using (
  invitee_id = (select auth.uid())
  or exists (select 1 from projects p where p.id = project_forewords.project_id and p.owner_id = (select auth.uid()))
);

-- Invitees can read the project and its content while their invite is open (and after they've written).
drop policy if exists "foreword invitees preview the project" on public.projects;
create policy "foreword invitees preview the project" on public.projects for select
  using (can_preview_project_for_foreword(id));

drop policy if exists "foreword invitees preview book chapters" on public.book_chapters;
create policy "foreword invitees preview book chapters" on public.book_chapters for select using (
  can_preview_project_for_foreword(project_id)
  and not exists (
    select 1 from project_book_details d
    where d.project_id = book_chapters.project_id and d.content_source = 'upload' and d.allow_read_in_app = false)
);

drop policy if exists "foreword invitees preview course modules" on public.course_modules;
create policy "foreword invitees preview course modules" on public.course_modules for select
  using (can_preview_project_for_foreword(project_id));

drop policy if exists "foreword invitees preview course lessons" on public.course_lessons;
create policy "foreword invitees preview course lessons" on public.course_lessons for select using (
  exists (select 1 from course_modules cm where cm.id = course_lessons.module_id and can_preview_project_for_foreword(cm.project_id))
);

-- ---------------------------------------------------------------- function privileges
-- The preview helper is called from the projects / book / course SELECT policies, which apply to guests too. A role
-- without EXECUTE gets 'permission denied' the moment a row reaches this policy, so anon needs it (it returns false
-- when nobody is signed in).
grant execute on function public.can_preview_project_for_foreword(uuid) to anon, authenticated;
revoke execute on function public.invite_project_foreword(uuid, uuid, text) from public, anon;
revoke execute on function public.decline_project_foreword(uuid) from public, anon;
revoke execute on function public.submit_project_foreword(uuid, text, text, text) from public, anon;
revoke execute on function public.withdraw_project_foreword(uuid) from public, anon;
revoke execute on function public.revoke_project_foreword(uuid) from public, anon;
revoke execute on function public.review_project_foreword(uuid, text) from public, anon;
revoke execute on function public.sync_project_foreword_content(uuid) from public, anon, authenticated;
grant execute on function public.invite_project_foreword(uuid, uuid, text) to authenticated;
grant execute on function public.decline_project_foreword(uuid) to authenticated;
grant execute on function public.submit_project_foreword(uuid, text, text, text) to authenticated;
grant execute on function public.withdraw_project_foreword(uuid) to authenticated;
grant execute on function public.revoke_project_foreword(uuid) to authenticated;
grant execute on function public.review_project_foreword(uuid, text) to authenticated;
