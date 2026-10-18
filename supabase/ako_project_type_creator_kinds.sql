-- supabase/ako_project_type_creator_kinds.sql
--
-- Admin-controlled matrix: which KIND of account may create which project
-- type. Kinds:
--   restricted    personal account still 'pending' while the incubation gate is on
--   unrestricted  any other personal account (approved, or gate off)
--   organization / brand / product  a page of that page_type (project posted_as_page_id)
-- Public-read (the create screen filters its picker from it); admin-write.
-- A missing row means "allowed", so a project type added later is never
-- silently locked out. Admins and accounts in project_type_rule_exemptions
-- bypass the matrix, exactly as they already bypass the achievement rules.
-- The type's own on/off switch (project_type_settings.is_active) still wins.

create table if not exists public.project_type_creator_rules (
  project_type text not null,
  creator_kind text not null
    check (creator_kind in ('restricted','unrestricted','organization','brand','product')),
  allowed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (project_type, creator_kind)
);

alter table public.project_type_creator_rules enable row level security;

drop policy if exists "Anyone can view creator rules" on public.project_type_creator_rules;
create policy "Anyone can view creator rules"
  on public.project_type_creator_rules for select using (true);

drop policy if exists "Admins can insert creator rules" on public.project_type_creator_rules;
create policy "Admins can insert creator rules"
  on public.project_type_creator_rules for insert
  with check (exists (select 1 from public.admin_roles where user_id = (select auth.uid())));

drop policy if exists "Admins can update creator rules" on public.project_type_creator_rules;
create policy "Admins can update creator rules"
  on public.project_type_creator_rules for update
  using (exists (select 1 from public.admin_roles where user_id = (select auth.uid())));

-- Seed: preserves today's behaviour. Restricted accounts could create nothing
-- (probational_create_project_enabled), so restricted starts at that flag's
-- value for every type; everyone else starts allowed.
insert into public.project_type_creator_rules (project_type, creator_kind, allowed)
select t.project_type, k.kind,
       case when k.kind = 'restricted'
            then coalesce((select enabled from public.feature_flags where key = 'probational_create_project_enabled'), false)
            else true end
from (select distinct project_type from public.project_type_settings) t
cross join (values ('restricted'),('unrestricted'),('organization'),('brand'),('product')) as k(kind)
on conflict do nothing;

-- Which kind is this identity acting as?
create or replace function public.get_creator_kind(p_user_id uuid, p_page_id uuid default null)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when p_page_id is not null then
      coalesce((select page_type from public.pages where id = p_page_id), 'unrestricted')
    when exists (select 1 from public.feature_flags where key = 'incubation_review_gate_enabled' and enabled)
         and not exists (select 1 from public.profiles where id = p_user_id and account_status = 'approved')
      then 'restricted'
    else 'unrestricted'
  end;
$$;

-- Server-side enforcement. Pending accounts now pass the projects INSERT policy
-- (instead of the all-or-nothing probational_create_project_enabled flag) and the
-- trigger below decides per type. Declined/suspended accounts stay blocked.
alter policy "projects_insert_page_membership_check" on public.projects
  with check (
    (owner_id = (select auth.uid()))
    and (
      public.fn_can_access_app((select auth.uid()))
      or exists (select 1 from public.profiles where id = (select auth.uid()) and account_status = 'pending')
    )
    and (
      (posted_as_page_id is null)
      or exists (
        select 1 from public.page_members pm
        where pm.page_id = projects.posted_as_page_id
          and pm.user_id = (select auth.uid())
          and pm.status = 'active'
      )
    )
  );

create or replace function public.enforce_project_type_rules()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_projects_enabled boolean;
  type_active boolean;
  rule record;
  owner record;
  engagement integer;
  account_age_days integer;
  is_exempt boolean;
  v_kind text;
  v_kind_allowed boolean;
begin
  select enabled into v_projects_enabled from public.feature_flags where key = 'projects_enabled';
  if coalesce(v_projects_enabled, true) is false then
    raise exception 'Creating new projects is temporarily disabled';
  end if;

  select is_active into type_active
  from project_type_settings
  where project_type = new.project_type;

  if type_active is false then
    raise exception 'This project type is currently unavailable.';
  end if;

  select
    exists (select 1 from admin_roles where user_id = new.owner_id)
    or exists (select 1 from project_type_rule_exemptions where user_id = new.owner_id)
  into is_exempt;

  if is_exempt then
    return new;
  end if;

  -- Account-kind matrix (restricted / unrestricted / page types).
  v_kind := public.get_creator_kind(new.owner_id, new.posted_as_page_id);
  select allowed into v_kind_allowed
  from project_type_creator_rules
  where project_type = new.project_type and creator_kind = v_kind;

  if coalesce(v_kind_allowed, true) is false then
    raise exception 'This kind of account cannot create this project type.' using errcode = '42501';
  end if;

  select min_follower_count, min_account_age_days, min_total_engagement
  into rule
  from project_type_access_rules
  where project_type = new.project_type;

  if rule is null then
    return new;
  end if;

  select follower_count, created_at into owner
  from profiles
  where id = new.owner_id;

  account_age_days := extract(day from now() - owner.created_at);
  engagement := get_user_total_engagement(new.owner_id);

  if owner.follower_count < rule.min_follower_count then
    raise exception 'You need at least % followers to create this project type.', rule.min_follower_count;
  end if;

  if account_age_days < rule.min_account_age_days then
    raise exception 'Your account needs to be at least % days old to create this project type.', rule.min_account_age_days;
  end if;

  if engagement < rule.min_total_engagement then
    raise exception 'You need at least % total engagement across your posts to create this project type.', rule.min_total_engagement;
  end if;

  return new;
end;
$function$;
