-- supabase/ako_page_roles_catalogue.sql
-- Admin-managed page roles ("Your role at it") + an approval flow for roles people type themselves.
--
--   • page_role_labels is now the CATALOGUE the role dropdown reads. status = approved | pending | rejected.
--     Admins add / rename / remove approved roles. Only 'approved' rows are public; a pending/rejected row is
--     visible to admins and to whoever requested it.
--   • page_members.role_label stays the title that is DISPLAYED everywhere, so no screen needs to change:
--       - picked/typed an APPROVED role  -> the member gets that exact title.
--       - typed a role that isn't in the list -> a pending request is created, the member shows the generic
--         title "Worker" (page_role_generic_label()) until an admin decides, and every admin is notified.
--     page_members.requested_role_id remembers which request a member is waiting on.
--   • Admin approves (optionally renaming first) -> every waiting member's title is switched to the approved
--     wording silently (no client action needed) and they get a 'page_role_approved' notification. Reject ->
--     they stay "Worker" and get 'page_role_rejected'. Renaming an approved role updates its holders silently.
--   • New notification types: page_role_requested (to admins), page_role_approved, page_role_rejected. The type
--     list is EXTENDED from the live constraint, never rebuilt from a copy, so types added elsewhere are kept.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------------------------
alter table public.page_role_labels
  add column if not exists status       text not null default 'approved',
  add column if not exists requested_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_by  uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at  timestamptz,
  add column if not exists is_system    boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'page_role_labels_status_check') then
    alter table public.page_role_labels
      add constraint page_role_labels_status_check check (status in ('pending', 'approved', 'rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'page_role_labels_label_length_check') then
    alter table public.page_role_labels
      add constraint page_role_labels_label_length_check check (char_length(label) between 1 and 60);
  end if;
end $$;

alter table public.page_members
  add column if not exists requested_role_id uuid references public.page_role_labels (id) on delete set null;

create index if not exists page_members_requested_role_idx
  on public.page_members (requested_role_id) where requested_role_id is not null;

-- ---------------------------------------------------------------------------------------------
-- The generic title shown while a requested role is waiting for approval
-- (src/lib/pageRoles.ts GENERIC_ROLE_LABEL mirrors this for UI hints).
-- ---------------------------------------------------------------------------------------------
create or replace function public.page_role_generic_label()
returns text
language sql
immutable
as $$ select 'Worker'::text $$;

insert into public.page_role_labels (label, usage_count, status, is_system)
values (public.page_role_generic_label(), 0, 'approved', true)
on conflict (label_key) do update set status = 'approved', is_system = true;

-- ---------------------------------------------------------------------------------------------
-- Row level security: approved roles are public, the rest is admin / requester only.
-- Writes are admin-only (the trigger functions below are SECURITY DEFINER and bypass RLS).
-- ---------------------------------------------------------------------------------------------
alter table public.page_role_labels enable row level security;

drop policy if exists "Anyone can view page role labels" on public.page_role_labels;
drop policy if exists "Approved page roles are public" on public.page_role_labels;
create policy "Approved page roles are public"
  on public.page_role_labels for select
  using (
    status = 'approved'
    or requested_by = (select auth.uid())
    or public.is_admin_or_moderator((select auth.uid()))
  );

drop policy if exists "Admins can add page roles" on public.page_role_labels;
create policy "Admins can add page roles"
  on public.page_role_labels for insert to authenticated
  with check (public.is_admin_or_moderator((select auth.uid())));

drop policy if exists "Admins can update page roles" on public.page_role_labels;
create policy "Admins can update page roles"
  on public.page_role_labels for update to authenticated
  using (public.is_admin_or_moderator((select auth.uid())))
  with check (public.is_admin_or_moderator((select auth.uid())));

drop policy if exists "Admins can delete page roles" on public.page_role_labels;
create policy "Admins can delete page roles"
  on public.page_role_labels for delete to authenticated
  using (public.is_admin_or_moderator((select auth.uid())) and not is_system);

-- ---------------------------------------------------------------------------------------------
-- Notification types (extend the LIVE list)
-- ---------------------------------------------------------------------------------------------
do $$
declare
  v_def   text;
  v_types text[];
begin
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid = 'public.notifications'::regclass and conname = 'notifications_type_check';

  if v_def is null then
    raise exception 'notifications_type_check not found';
  end if;

  select array_agg(m[1]) into v_types from regexp_matches(v_def, '''([a-z_]+)''::text', 'g') as m;

  v_types := array(
    select distinct t from unnest(v_types || array['page_role_requested', 'page_role_approved', 'page_role_rejected']) as t
  );

  alter table public.notifications drop constraint notifications_type_check;
  execute format('alter table public.notifications add constraint notifications_type_check check (type = any (%L::text[]))', v_types);
end $$;

-- ---------------------------------------------------------------------------------------------
-- Turn a typed/picked role into (title to display, request to wait on). Internal: called only by
-- create_page / invite_page_member, never by clients.
-- ---------------------------------------------------------------------------------------------
create or replace function public.resolve_page_role_label(p_label text, p_requester uuid, p_page_id uuid)
returns table (out_label text, out_request_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_label   text := regexp_replace(btrim(coalesce(p_label, '')), '\s+', ' ', 'g');
  v_generic text := public.page_role_generic_label();
  v_row     public.page_role_labels;
begin
  if v_label = '' then
    raise exception 'A role is required';
  end if;
  if char_length(v_label) > 60 then
    raise exception 'Role titles can be at most 60 characters';
  end if;

  select * into v_row from public.page_role_labels where label_key = lower(v_label);

  if not found then
    insert into public.page_role_labels (label, usage_count, status, requested_by)
    values (v_label, 0, 'pending', p_requester)
    on conflict (label_key) do nothing
    returning * into v_row;

    if v_row.id is not null then
      -- Brand-new request: tell every admin once.
      insert into public.notifications (user_id, type, actor_id, target_type, target_id, preview_text)
      select a.user_id, 'page_role_requested', p_requester, 'page', p_page_id, v_label
      from (select distinct user_id from public.admin_roles) a
      where a.user_id <> p_requester;
    else
      -- Lost a race with someone requesting the same title.
      select * into v_row from public.page_role_labels where label_key = lower(v_label);
    end if;
  end if;

  if v_row.status = 'approved' then
    return query select v_row.label, null::uuid;
  elsif v_row.status = 'pending' then
    return query select v_generic, v_row.id;
  else
    -- Previously rejected: they can still join, just as the generic title.
    return query select v_generic, null::uuid;
  end if;
end;
$function$;

revoke all on function public.resolve_page_role_label(text, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- create_page / invite_page_member: identical to before except the role now goes through the catalogue.
-- ---------------------------------------------------------------------------------------------
create or replace function public.create_page(p_page_type text, p_name text, p_username text, p_role_label text, p_bio text default null::text, p_tagline text default null::text, p_avatar_url text default null::text, p_category_id uuid default null::uuid, p_parent_organization_id uuid default null::uuid)
returns pages
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_page public.pages;
  v_elig record;
  v_pages_enabled boolean;
  v_subsidiaries_enabled boolean;
  v_role_label text;
  v_role_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  if not public.fn_can_access_app(auth.uid()) then
    raise exception 'Page creation is not available for this account';
  end if;

  if p_page_type not in ('organization', 'brand', 'product') then
    raise exception 'page_type must be organization, brand, or product';
  end if;

  select enabled into v_pages_enabled from public.feature_flags where key = 'pages_creation_enabled';
  if coalesce(v_pages_enabled, true) is false then
    raise exception 'Page creation is temporarily disabled';
  end if;

  if p_parent_organization_id is not null then
    select enabled into v_subsidiaries_enabled from public.feature_flags where key = 'subsidiaries_enabled';
    if coalesce(v_subsidiaries_enabled, true) is false then
      raise exception 'Subsidiary creation is temporarily disabled';
    end if;
  end if;

  select * into v_elig from public.get_page_creation_eligibility();

  if not v_elig.allowed then
    raise exception 'You need at least % posts in the last 30 days (you have %), % distinct engaged posts in the last 30 days (you have %), and an account at least % days old (yours is %) to create a page.',
      v_elig.posts_required, v_elig.posts_30d, v_elig.distinct_engaged_required, v_elig.distinct_engaged_30d, v_elig.account_age_required, v_elig.account_age_days;
  end if;

  insert into public.pages (page_type, name, username, bio, tagline, avatar_url, category_id, parent_organization_id, created_by)
  values (p_page_type, p_name, lower(p_username), p_bio, p_tagline, p_avatar_url, p_category_id, p_parent_organization_id, auth.uid())
  returning * into v_page;

  select r.out_label, r.out_request_id into v_role_label, v_role_request_id
  from public.resolve_page_role_label(p_role_label, auth.uid(), v_page.id) r;

  insert into public.page_members (page_id, user_id, role_label, requested_role_id, is_admin, status, invited_by, responded_at)
  values (v_page.id, auth.uid(), v_role_label, v_role_request_id, true, 'active', auth.uid(), now());

  return v_page;
end;
$function$;

create or replace function public.invite_page_member(p_page_id uuid, p_user_id uuid, p_role_label text, p_is_admin boolean default false, p_permissions jsonb default null::jsonb)
returns page_members
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_member public.page_members;
  v_perms jsonb;
  v_role_label text;
  v_role_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You already manage this page';
  end if;

  if not exists (
    select 1 from public.page_members
    where page_id = p_page_id and user_id = auth.uid() and is_admin and status = 'active'
  ) then
    raise exception 'Only a page admin can invite members';
  end if;

  v_perms := case when coalesce(p_is_admin, false) then null else public.sanitize_page_permissions(p_permissions) end;

  select r.out_label, r.out_request_id into v_role_label, v_role_request_id
  from public.resolve_page_role_label(p_role_label, auth.uid(), p_page_id) r;

  insert into public.page_members (page_id, user_id, role_label, requested_role_id, is_admin, permissions, status, invited_by)
  values (p_page_id, p_user_id, v_role_label, v_role_request_id, coalesce(p_is_admin, false), v_perms, 'invited', auth.uid())
  on conflict (page_id, user_id) do update
  set role_label = excluded.role_label,
      requested_role_id = excluded.requested_role_id,
      is_admin = excluded.is_admin,
      permissions = excluded.permissions,
      status = 'invited',
      invited_by = excluded.invited_by,
      invited_at = now(),
      responded_at = null
  where public.page_members.status in ('declined', 'removed')
  returning * into v_member;

  if v_member.id is null then
    raise exception 'That person already has a pending or active role on this page';
  end if;

  return v_member;
end;
$function$;

-- ---------------------------------------------------------------------------------------------
-- The old trigger auto-added EVERY typed title to the suggestion list. The catalogue is admin-controlled now,
-- so it only counts how often an approved role is used.
-- ---------------------------------------------------------------------------------------------
create or replace function public.upsert_page_role_label()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.page_role_labels
  set usage_count = usage_count + 1, updated_at = now()
  where label_key = lower(new.role_label) and status = 'approved';
  return new;
end;
$function$;

-- ---------------------------------------------------------------------------------------------
-- Guard + review triggers on the catalogue
-- ---------------------------------------------------------------------------------------------
create or replace function public.guard_page_role_label()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if old.is_system and (new.label is distinct from old.label or new.status <> 'approved' or not new.is_system) then
    raise exception 'The generic role cannot be changed';
  end if;

  if new.status is distinct from old.status then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

create or replace function public.on_page_role_label_reviewed()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_type text;
  v_first_page uuid;
  v_first_name text;
  v_requester_told boolean := false;
begin
  -- Approved role renamed: its holders follow along, silently.
  if old.status = 'approved' and new.status = 'approved' and new.label is distinct from old.label then
    update public.page_members
    set role_label = new.label
    where lower(role_label) = old.label_key and requested_role_id is null;
    return null;
  end if;

  if old.status = 'pending' and new.status in ('approved', 'rejected') then
    v_type := case when new.status = 'approved' then 'page_role_approved' else 'page_role_rejected' end;

    for r in
      select pm.user_id, pm.page_id, p.name as page_name
      from public.page_members pm
      join public.pages p on p.id = pm.page_id
      where pm.requested_role_id = new.id and pm.status in ('invited', 'active')
    loop
      insert into public.notifications (user_id, type, actor_id, target_type, target_id, preview_text)
      values (r.user_id, v_type, null, 'page', r.page_id, new.label || ' at ' || coalesce(r.page_name, ''));

      if v_first_page is null then
        v_first_page := r.page_id;
        v_first_name := r.page_name;
      end if;
      if r.user_id = new.requested_by then
        v_requester_told := true;
      end if;
    end loop;

    -- Whoever asked for it (e.g. the admin who invited someone) hears about it too.
    if new.requested_by is not null and not v_requester_told and v_first_page is not null then
      insert into public.notifications (user_id, type, actor_id, target_type, target_id, preview_text)
      values (new.requested_by, v_type, null, 'page', v_first_page, new.label || ' at ' || coalesce(v_first_name, ''));
    end if;

    if new.status = 'approved' then
      -- The silent update: waiting members now carry the approved wording.
      update public.page_members set role_label = new.label, requested_role_id = null where requested_role_id = new.id;
    else
      update public.page_members set requested_role_id = null where requested_role_id = new.id;
    end if;
  end if;

  return null;
end;
$function$;

drop trigger if exists trg_guard_page_role_label on public.page_role_labels;
create trigger trg_guard_page_role_label
  before update on public.page_role_labels
  for each row execute function public.guard_page_role_label();

drop trigger if exists trg_page_role_label_reviewed on public.page_role_labels;
create trigger trg_page_role_label_reviewed
  after update on public.page_role_labels
  for each row
  when (old.status is distinct from new.status or old.label is distinct from new.label)
  execute function public.on_page_role_label_reviewed();

revoke all on function public.guard_page_role_label() from public, anon, authenticated;
revoke all on function public.on_page_role_label_reviewed() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Admin queue: pending requests with who asked and who is waiting on each (page_members' own RLS hides
-- 'invited' members from a platform admin, so this reads them as the function owner). Empty for non-admins.
-- ---------------------------------------------------------------------------------------------
create or replace function public.admin_page_role_requests()
returns table (id uuid, label text, created_at timestamptz, requested_by uuid, requester_username text, requester_name text, holders jsonb)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    l.id,
    l.label,
    l.created_at,
    l.requested_by,
    pr.username,
    pr.display_name,
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'page_name', p.name,
               'page_username', p.username,
               'member_username', mp.username,
               'member_status', pm.status
             ) order by pm.created_at)
      from public.page_members pm
      join public.pages p on p.id = pm.page_id
      join public.profiles mp on mp.id = pm.user_id
      where pm.requested_role_id = l.id
    ), '[]'::jsonb)
  from public.page_role_labels l
  left join public.profiles pr on pr.id = l.requested_by
  where l.status = 'pending'
    and public.is_admin_or_moderator((select auth.uid()))
  order by l.created_at;
$function$;

revoke all on function public.admin_page_role_requests() from public, anon;
grant execute on function public.admin_page_role_requests() to authenticated;
