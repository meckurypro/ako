-- supabase/ako_google_profile_setup.sql
--
-- "Complete your profile" step for Google sign-ups.
--
-- Google gives us a name and email but no username, so ako_google_auth_signup_defaults.sql
-- invents one from the email's local part. That placeholder must not become someone's
-- public handle without them choosing it: after Google sign-in, new accounts are sent to
-- /onboarding/profile to pick a username and confirm their name BEFORE the usual onboarding
-- (Welcome -> Interests -> People -> Building).
--
--   profiles.profile_setup_completed  false = still owes the profile step.
--                                     Defaults to TRUE so every existing profile and every
--                                     email/password sign-up is unaffected.
--
-- Run ako_google_auth_signup_defaults.sql first (it now tags OAuth sign-ups with
-- `needs_profile_setup` in user metadata). Safe to re-run.

alter table public.profiles
  add column if not exists profile_setup_completed boolean not null default true;

-- Flag the profile of a brand-new OAuth sign-up. Runs AFTER handle_new_user() has created
-- the profile row (AFTER triggers on the same table fire alphabetically; "trg_zz_" sorts
-- after "trg_on_auth_user_created").
create or replace function public.mark_oauth_profile_setup_pending()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if coalesce(new.raw_user_meta_data->>'needs_profile_setup', '') = 'true' then
    update public.profiles set profile_setup_completed = false where id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.mark_oauth_profile_setup_pending() from public, anon, authenticated;

drop trigger if exists trg_zz_mark_oauth_profile_setup on auth.users;
create trigger trg_zz_mark_oauth_profile_setup
  after insert on auth.users
  for each row
  execute function public.mark_oauth_profile_setup_pending();

-- Saves the username + display name chosen on the profile step and marks it done.
-- Server-side validation mirrors the sign-up form (lowercase letters, numbers, underscores;
-- at least 3 characters). A taken username raises 'username_taken'.
create or replace function public.complete_profile_setup(p_username text, p_display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_user text := lower(btrim(coalesce(p_username, '')));
  v_name text := btrim(coalesce(p_display_name, ''));
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if v_user !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'invalid_username' using errcode = '22023';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 60 then
    raise exception 'invalid_display_name' using errcode = '22023';
  end if;
  if exists (select 1 from public.profiles where username = v_user and id <> v_uid) then
    raise exception 'username_taken' using errcode = '23505';
  end if;

  update public.profiles
     set username = v_user,
         display_name = v_name,
         profile_setup_completed = true,
         updated_at = now()
   where id = v_uid;
exception
  when unique_violation then
    raise exception 'username_taken' using errcode = '23505';
end;
$$;

revoke all on function public.complete_profile_setup(text, text) from public, anon;
grant execute on function public.complete_profile_setup(text, text) to authenticated;

-- One-off backfill: Google accounts created before this step existed that haven't finished
-- onboarding still carry an auto-generated username — send them through the step too.
update public.profiles p
   set profile_setup_completed = false
  from auth.identities i
 where i.user_id = p.id
   and i.provider = 'google'
   and p.onboarding_completed = false
   and p.profile_setup_completed = true;
