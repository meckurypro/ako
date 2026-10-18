-- supabase/ako_google_auth_signup_defaults.sql
--
-- Google sign-in support: give OAuth sign-ups a username + display name.
--
-- Email/password sign-up sends `username` and `display_name` as user metadata and
-- the existing handle_new_user() trigger (00_foundation.sql) builds the profile
-- from them. A Google sign-up sends neither — Google supplies `full_name`, `name`,
-- `avatar_url` and `email` — so without this, profile creation has no username
-- and the whole sign-up fails with "Database error saving new user".
--
-- This adds a BEFORE INSERT trigger on auth.users that fills in the two missing
-- fields (only when they're missing) BEFORE handle_new_user() runs. It does not
-- touch handle_new_user() itself, and email/password sign-ups pass straight through.
--
--   username      : the email's local part, lowercased and cleaned to [a-z0-9_],
--                   at most 20 chars, at least 3 — made unique with a numeric suffix
--   display_name  : Google's full name, falling back to the email's local part
--
-- People can change both afterwards like any other account. Safe to re-run.

create or replace function public.fill_oauth_signup_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  email_local text  := split_part(coalesce(new.email, ''), '@', 1);
  display     text;
  base        text;
  candidate   text;
  attempt     int := 0;
begin
  -- Email/password sign-ups always send their own username — leave them alone.
  if nullif(btrim(meta->>'username'), '') is not null then
    return new;
  end if;

  display := coalesce(
    nullif(btrim(meta->>'display_name'), ''),
    nullif(btrim(meta->>'full_name'), ''),
    nullif(btrim(meta->>'name'), ''),
    nullif(email_local, ''),
    'Akọ member'
  );

  base := regexp_replace(lower(coalesce(nullif(email_local, ''), meta->>'name', '')), '[^a-z0-9_]', '', 'g');
  base := left(base, 20);
  if length(base) < 3 then
    base := 'user' || base;
  end if;

  candidate := base;
  while exists (select 1 from public.profiles p where p.username = candidate) loop
    attempt := attempt + 1;
    if attempt > 25 then
      -- Absurdly crowded name: fall back to something effectively unique.
      candidate := left(base, 12) || substr(md5(new.id::text || clock_timestamp()::text), 1, 8);
      exit;
    end if;
    candidate := left(base, 16) || (floor(random() * 9000) + 1000)::int::text;
  end loop;

  new.raw_user_meta_data := meta || jsonb_build_object('username', candidate, 'display_name', display);
  return new;
end;
$$;

-- Only ever invoked as a trigger.
revoke all on function public.fill_oauth_signup_defaults() from public, anon, authenticated;

drop trigger if exists fill_oauth_signup_defaults on auth.users;
create trigger fill_oauth_signup_defaults
  before insert on auth.users
  for each row
  execute function public.fill_oauth_signup_defaults();
