-- supabase/ako_project_guest_passes.sql
-- Guest Pass: a creator mints a time-boxed link (6 hours) that lets ANYONE open a project's content without being
-- signed in — private projects included. The token IS the credential: 144 bits of randomness, stored only here,
-- never derivable from the project. Everything a guest sees comes out of get_guest_pass_view(); the hosted files
-- (uploads in the private-content bucket) come out of the guest-pass-file edge function, which re-checks the token
-- on every call and caps each signed URL to the pass's remaining life.
-- Applied to the Ako Temp project. Idempotent.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- table
create table if not exists public.project_guest_passes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours'),
  revoked_at timestamptz,
  open_count integer not null default 0,
  last_opened_at timestamptz
);
create index if not exists project_guest_passes_project_idx on public.project_guest_passes (project_id, expires_at desc);

-- No client reads or writes of the table itself. The token must never be selectable by anyone but through the
-- creator's own RPC below; everything goes through SECURITY DEFINER functions.
alter table public.project_guest_passes enable row level security;
revoke all on public.project_guest_passes from anon, authenticated;

-- ---------------------------------------------------------------- creator RPCs
create or replace function public.create_project_guest_pass(p_project_id uuid)
returns table (pass_id uuid, token text, expires_at timestamptz)
language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare
  v_uid uuid := auth.uid();
  v_proj record;
  v_token text;
  v_live integer;
  v_id uuid;
  v_exp timestamptz;
begin
  if v_uid is null then raise exception 'Sign in first.'; end if;
  select id, owner_id, status, is_active into v_proj from projects where id = p_project_id;
  if v_proj.id is null or v_proj.owner_id <> v_uid then raise exception 'Only the creator can make a Guest Pass.'; end if;
  if v_proj.status in ('archived', 'cancelled') or not v_proj.is_active then
    raise exception 'This project is no longer active.';
  end if;

  select count(*) into v_live from project_guest_passes g
    where g.project_id = p_project_id and g.revoked_at is null and g.expires_at > now();
  if v_live >= 10 then
    raise exception 'You have 10 live Guest Passes for this project. Revoke one or wait for one to expire.';
  end if;

  -- 18 random bytes -> 24 url-safe chars.
  v_token := translate(encode(gen_random_bytes(18), 'base64'), '+/=', '-_');
  insert into project_guest_passes as g (project_id, created_by, token)
    values (p_project_id, v_uid, v_token)
    returning g.id, g.expires_at into v_id, v_exp;
  return query select v_id, v_token, v_exp;
end $$;

create or replace function public.list_project_guest_passes(p_project_id uuid)
returns table (pass_id uuid, token text, created_at timestamptz, expires_at timestamptz, open_count integer, last_opened_at timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select g.id, g.token, g.created_at, g.expires_at, g.open_count, g.last_opened_at
  from project_guest_passes g
  join projects p on p.id = g.project_id
  where g.project_id = p_project_id
    and p.owner_id = auth.uid()
    and g.revoked_at is null
    and g.expires_at > now()
  order by g.created_at desc
$$;

create or replace function public.revoke_project_guest_pass(p_pass_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update project_guest_passes g set revoked_at = now()
  from projects p
  where g.id = p_pass_id and p.id = g.project_id and p.owner_id = auth.uid() and g.revoked_at is null;
end $$;

-- ---------------------------------------------------------------- guest-facing read
-- One call, anon-safe. status: 'valid' | 'expired' | 'revoked' | 'not_found' | 'unavailable'.
-- Expired/revoked/unavailable answers carry only who made the pass (so the UI can offer a relevant next step) and,
-- for a PUBLIC project, its title — never any content.
create or replace function public.get_guest_pass_view(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_pass project_guest_passes%rowtype;
  v_proj projects%rowtype;
  v_creator jsonb;
  v_page jsonb;
  v_now timestamptz := now();
  v_detail jsonb := '{}'::jsonb;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 64 then
    return jsonb_build_object('status', 'not_found', 'server_now', v_now);
  end if;

  select * into v_pass from project_guest_passes where token = p_token;
  if v_pass.id is null then
    return jsonb_build_object('status', 'not_found', 'server_now', v_now);
  end if;

  select * into v_proj from projects where id = v_pass.project_id;
  select jsonb_build_object('username', username, 'display_name', display_name, 'avatar_url', avatar_url)
    into v_creator from profiles where id = v_proj.owner_id and is_deleted = false;
  if v_proj.posted_as_page_id is not null then
    select jsonb_build_object('username', username, 'name', name, 'avatar_url', avatar_url)
      into v_page from pages where id = v_proj.posted_as_page_id and is_active = true;
  end if;

  if v_pass.revoked_at is not null or v_pass.expires_at <= v_now
     or v_proj.id is null or not v_proj.is_active or v_proj.status in ('archived', 'cancelled') then
    return jsonb_build_object(
      'status', case
        when v_proj.id is null or not v_proj.is_active or v_proj.status in ('archived', 'cancelled') then 'unavailable'
        when v_pass.revoked_at is not null then 'revoked'
        else 'expired' end,
      'server_now', v_now,
      'expires_at', v_pass.expires_at,
      'creator', v_creator,
      'page', v_page,
      'project_title', case when v_proj.is_private then null else v_proj.title end,
      'project_id', case when v_proj.is_private then null else v_proj.id end,
      'project_slug', case when v_proj.is_private then null else v_proj.slug end
    );
  end if;

  -- Valid: count the open (best-effort — never blocks the read).
  update project_guest_passes set open_count = open_count + 1, last_opened_at = v_now where id = v_pass.id;

  -- Type-specific content. Hosted-file PATHS are never returned — only whether a hosted file exists; the bytes come
  -- from the guest-pass-file edge function.
  if v_proj.project_type = 'media' then
    select jsonb_build_object(
      'has_audio', has_audio, 'has_video', has_video, 'has_image', has_image,
      'audio_source', audio_source, 'audio_url', audio_url, 'audio_hosted', audio_file_path is not null,
      'video_source', video_source, 'video_url', video_url, 'video_hosted', video_file_path is not null,
      'image_source', image_source, 'image_url', image_url, 'image_hosted', image_file_path is not null)
      into v_detail from project_media_details where project_id = v_proj.id;
  elsif v_proj.project_type = 'file' then
    select jsonb_build_object('files', coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'name', coalesce(display_name, download_name), 'size_bytes', size_bytes) order by position), '[]'::jsonb))
      into v_detail from project_files where project_id = v_proj.id;
  elsif v_proj.project_type = 'book' then
    select jsonb_build_object(
      'author_name', b.author_name, 'external_url', b.external_url, 'allow_download', b.allow_download,
      'allow_read_in_app', b.allow_read_in_app, 'hosted', b.file_path is not null, 'content_source', b.content_source,
      'chapters', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'kind', c.kind, 'title', c.title, 'content', c.content)
                                              order by c.sort_order) from book_chapters c where c.project_id = v_proj.id), '[]'::jsonb))
      into v_detail from project_book_details b where b.project_id = v_proj.id;
  elsif v_proj.project_type = 'course' then
    select jsonb_build_object('modules', coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'title', m.title,
        'lessons', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'title', l.title, 'content', l.content, 'media_url', l.media_url)
                                       order by l.sort_order) from course_lessons l where l.module_id = m.id), '[]'::jsonb)
      ) order by m.sort_order), '[]'::jsonb))
      into v_detail from course_modules m where m.project_id = v_proj.id;
  elsif v_proj.project_type = 'event' then
    -- location_value (address / join link) is what a ticket buys — a pass shows when and what kind, not where.
    select jsonb_build_object('event_date', event_date, 'location_type', location_type)
      into v_detail from project_event_details where project_id = v_proj.id;
  elsif v_proj.project_type = 'meeting' then
    select jsonb_build_object('scheduled_at', scheduled_at, 'status', status)
      into v_detail from project_meeting_details where project_id = v_proj.id;
  elsif v_proj.project_type = 'gig' then
    select jsonb_build_object('tagline', tagline, 'delivery_estimate', delivery_estimate,
      'revisions_included', revisions_included, 'deliverables', deliverables, 'faq', faq)
      into v_detail from project_gig_details where project_id = v_proj.id;
  elsif v_proj.project_type = 'pitch' then
    select jsonb_build_object('goal_amount_usd', goal_amount_usd)
      into v_detail from project_pitch_details where project_id = v_proj.id;
  end if;

  return jsonb_build_object(
    'status', 'valid',
    'server_now', v_now,
    'expires_at', v_pass.expires_at,
    'creator', v_creator,
    'page', v_page,
    'project', jsonb_build_object(
      'id', v_proj.id, 'title', v_proj.title, 'description', v_proj.description, 'project_type', v_proj.project_type,
      'thumbnail_url', v_proj.thumbnail_url, 'supporting_image_urls', v_proj.supporting_image_urls,
      'price_usd', v_proj.price_usd, 'promo_price_usd', v_proj.promo_price_usd, 'is_private', v_proj.is_private,
      'external_url', case when v_proj.project_type = 'url' then v_proj.external_url else null end,
      'slug', v_proj.slug),
    'detail', coalesce(v_detail, '{}'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------- grants
revoke all on function public.create_project_guest_pass(uuid) from public, anon;
revoke all on function public.list_project_guest_passes(uuid) from public, anon;
revoke all on function public.revoke_project_guest_pass(uuid) from public, anon;
grant execute on function public.create_project_guest_pass(uuid) to authenticated;
grant execute on function public.list_project_guest_passes(uuid) to authenticated;
grant execute on function public.revoke_project_guest_pass(uuid) to authenticated;
revoke all on function public.get_guest_pass_view(text) from public;
grant execute on function public.get_guest_pass_view(text) to anon, authenticated;

-- ---------------------------------------------------------------- reserved slug
-- /pass/:token lives beside the flat /:slug project route, so "pass" can't be a custom project URL.
create or replace function public.is_reserved_project_slug(p_slug text)
returns boolean language sql immutable set search_path to 'public' as $$
select p_slug = any (array[
'new','edit','delete','settings','admin','login','signup','logout',
'api','app','www','null','undefined','me','support','help','about',
'terms','privacy','followers','following','team','create','projects',
'project','profile','page','pages','wallet','messages','message',
'notifications','feed','search','explore','activity','archive',
'saved','liked','library',
'verify-email','reset-password','auth','onboarding','compose',
'promote','hashtag','topics','post','requests','bookmarks','inbox',
'page-inbox','rooms','courses','books','meetings','gigs',
'saved-projects','settings-advanced','settings-appearance',
'pass'
]);
$$;
