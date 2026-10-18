-- ============================================================
-- AKỌ — Offline downloads ("Download to library")
-- ============================================================
-- Lets a signed-in person save a book / course / file / hosted media project
-- inside the native app so it opens with no network. Nothing here puts a file
-- in the device's Downloads folder; the app keeps the copy in its own storage.
--
-- Three server-side pieces:
--
--   1. can_access_project_content(project_id)
--        One definition of "may this person get this project's content?".
--        Mirrors the get-project-file edge function (owner OR purchased OR
--        free) and adds the privacy rule the UI already applies (a private
--        project needs membership). Takes NO user argument: it always answers
--        for auth.uid(), so it cannot be used to ask "did SOMEONE ELSE buy
--        this?".
--
--   2. get_project_offline_bundle(project_id, include_content)
--        The gate a download goes through. Re-checks access, applies the
--        host's switches for uploaded books (allow_read_in_app → the extracted
--        chapters, allow_download → the PDF), and returns what to save: the text
--        itself (authored books, courses, extracted chapters) and/or the list of
--        hosted files (the app then asks get-project-file for each signed URL,
--        exactly as the existing Download button does), plus the book/media
--        details row the reader screens read. Also returns a content `version`
--        so the app can tell when its copy is out of date.
--
--   3. get_project_offline_versions(project_ids[])
--        Cheap batch freshness check for the Library ("update available").
--
-- Plus project_downloads: a per-user record of what has been saved on which
-- device, so a reinstall / second phone can see what it had, and the person
-- can manage it. RLS: a person only ever sees and writes their own rows.
--
-- Safe to re-run. Additive only: no existing table, policy or function changes.
-- ============================================================

-- ---------- 1. access helper ---------------------------------------------
create or replace function public.can_access_project_content(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.is_active
      and auth.uid() is not null
      and (
        p.owner_id = auth.uid()
        or (
          -- Everyone else: a private project needs membership, and then
          -- they must have bought it or it must be free and live.
          (
            not p.is_private
            or exists (
              select 1 from public.project_members pm
              where pm.project_id = p.id and pm.user_id = auth.uid()
            )
          )
          and (
            exists (
              select 1 from public.purchases pu
              where pu.project_id = p.id and pu.buyer_id = auth.uid()
            )
            or (
              p.status = 'active'
              and coalesce(p.promo_price_usd, p.price_usd) <= 0
              -- Books and courses are drafts until published (same rule as
              -- the book_chapters free-read policy).
              and (p.published_at is not null or p.project_type not in ('book', 'course'))
            )
          )
        )
      )
  );
$$;

revoke all on function public.can_access_project_content(uuid) from public, anon;
grant execute on function public.can_access_project_content(uuid) to authenticated;

-- ---------- internal: content version ------------------------------------
-- A hash of exactly what a download contains, so editing a project's title or
-- price does not read as "new content". Internal: not callable by clients.
create or replace function public.project_offline_version(p_project_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  p public.projects%rowtype;
  b public.project_book_details%rowtype;
  m public.project_media_details%rowtype;
  v text;
begin
  select * into p from public.projects where id = p_project_id;
  if not found then
    return null;
  end if;

  if p.project_type = 'book' then
    select * into b from public.project_book_details where project_id = p.id;
    if b.content_source = 'authored' then
      select md5(coalesce(string_agg(
               c.id::text || ':' || c.sort_order::text || ':' || c.kind || ':' || c.title || ':' || coalesce(c.content, ''),
               '|' order by c.sort_order, c.id), ''))
        into v
        from public.book_chapters c
       where c.project_id = p.id;
    else
      -- Uploaded PDF: the file plus any chapters extracted from it (either can be what a download holds).
      select md5(
               coalesce(b.file_path, '') || ':' ||
               coalesce((select coalesce(o.metadata ->> 'eTag', o.updated_at::text)
                           from storage.objects o
                          where o.bucket_id = 'private-content' and o.name = b.file_path), '') || ':' ||
               coalesce((select string_agg(
                                  c.id::text || ':' || c.sort_order::text || ':' || c.kind || ':' || c.title || ':' || coalesce(c.content, ''),
                                  '|' order by c.sort_order, c.id)
                           from public.book_chapters c
                          where c.project_id = p.id), ''))
        into v;
    end if;
  elsif p.project_type = 'course' then
    select md5(coalesce(string_agg(
             m2.id::text || ':' || m2.sort_order::text || ':' || m2.title || ':' ||
             coalesce(l.id::text, '') || ':' || coalesce(l.sort_order::text, '') || ':' ||
             coalesce(l.title, '') || ':' || coalesce(l.content, '') || ':' || coalesce(l.media_url, ''),
             '|' order by m2.sort_order, m2.id, l.sort_order, l.id), ''))
      into v
      from public.course_modules m2
      left join public.course_lessons l on l.module_id = m2.id
     where m2.project_id = p.id;
  elsif p.project_type = 'media' then
    select * into m from public.project_media_details where project_id = p.id;
    select md5(
             coalesce(m.audio_file_path, '') || '|' || coalesce(m.video_file_path, '') || '|' || coalesce(m.image_file_path, '') || '|' ||
             coalesce((select string_agg(coalesce(o.metadata ->> 'eTag', o.updated_at::text), ',' order by o.name)
                         from storage.objects o
                        where o.bucket_id = 'private-content'
                          and o.name in (m.audio_file_path, m.video_file_path, m.image_file_path)), ''))
      into v;
  elsif p.project_type = 'file' then
    select md5(coalesce(p.file_path, '') || ':' || coalesce(
             (select coalesce(o.metadata ->> 'eTag', o.updated_at::text)
                from storage.objects o
               where o.bucket_id = 'private-content' and o.name = p.file_path), ''))
      into v;
  end if;

  return v;
end;
$$;

revoke all on function public.project_offline_version(uuid) from public, anon, authenticated;

-- ---------- 2. the download gate -----------------------------------------
create or replace function public.get_project_offline_bundle(
  p_project_id uuid,
  p_include_content boolean default true
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  p public.projects%rowtype;
  b public.project_book_details%rowtype;
  m public.project_media_details%rowtype;
  v_is_owner boolean;
  v_files jsonb := '[]'::jsonb;
  v_content jsonb := null;
  v_details jsonb := null;
  v_can_read boolean;
  v_can_dl boolean;
  v_paths text[];
  v_kinds text[];
  i int;
begin
  if v_uid is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;

  -- "Not found" and "not yours" answer identically so this can't be used to
  -- discover which project ids exist.
  select * into p from public.projects where id = p_project_id;
  if not found or not public.can_access_project_content(p_project_id) then
    raise exception 'access_denied' using errcode = '42501';
  end if;
  v_is_owner := p.owner_id = v_uid;

  if p.project_type = 'book' then
    select * into b from public.project_book_details where project_id = p.id;
    if not found or b.content_source = 'link' then
      raise exception 'not_downloadable' using errcode = 'P0001';
    end if;
    v_details := to_jsonb(b);

    if b.content_source = 'authored' then
      -- to_jsonb(row): exactly the columns `select *` returns, so the app can
      -- drop this straight into the same cache entry the online query fills.
      select jsonb_build_object('chapters', coalesce(jsonb_agg(to_jsonb(c) order by c.sort_order, c.id), '[]'::jsonb))
        into v_content
        from public.book_chapters c
       where c.project_id = p.id;
      if jsonb_array_length(v_content -> 'chapters') = 0 then
        raise exception 'nothing_to_download' using errcode = 'P0001';
      end if;
    elsif b.content_source = 'upload' then
      -- An uploaded PDF has two independent host switches, enforced the same way
      -- get-project-file and the book_chapters policy enforce them:
      --   allow_read_in_app → the extracted chapters (what the in-app reader shows)
      --   allow_download    → the PDF file itself
      -- Offline we keep the chapters when they may be read (that is all the reader
      -- needs). Only when there is nothing to reflow — a scan, or reading in the app
      -- is off — do we fall back to the PDF, and only if the host allows downloads.
      v_can_read := v_is_owner or b.allow_read_in_app;
      v_can_dl := v_is_owner or b.allow_download;
      if v_can_read then
        select jsonb_build_object('chapters', coalesce(jsonb_agg(to_jsonb(c) order by c.sort_order, c.id), '[]'::jsonb))
          into v_content
          from public.book_chapters c
         where c.project_id = p.id;
        if jsonb_array_length(v_content -> 'chapters') = 0 then
          v_content := null;
        end if;
      end if;
      if v_content is null then
        if not v_can_dl then
          if v_can_read then
            raise exception 'not_downloadable' using errcode = 'P0001';
          end if;
          raise exception 'download_not_allowed' using errcode = '42501';
        end if;
        if b.file_path is null then
          raise exception 'not_downloadable' using errcode = 'P0001';
        end if;
        v_paths := array[b.file_path];
        v_kinds := array['book'];
      end if;
    else
      raise exception 'not_downloadable' using errcode = 'P0001';
    end if;

  elsif p.project_type = 'course' then
    select jsonb_build_object('modules', coalesce(jsonb_agg(
             to_jsonb(cm) || jsonb_build_object('lessons', coalesce((
                select jsonb_agg(to_jsonb(l) order by l.sort_order, l.id)
                  from public.course_lessons l
                 where l.module_id = cm.id), '[]'::jsonb))
             order by cm.sort_order, cm.id), '[]'::jsonb))
      into v_content
      from public.course_modules cm
     where cm.project_id = p.id;
    if jsonb_array_length(v_content -> 'modules') = 0 then
      raise exception 'nothing_to_download' using errcode = 'P0001';
    end if;

  elsif p.project_type = 'media' then
    select * into m from public.project_media_details where project_id = p.id;
    if not found then
      raise exception 'not_downloadable' using errcode = 'P0001';
    end if;
    v_details := to_jsonb(m);
    -- array_append, not `||`: with a bare string literal, `text[] || 'audio'` is parsed as an array literal and errors.
    v_paths := '{}'; v_kinds := '{}';
    if m.has_audio and m.audio_file_path is not null then
      v_paths := array_append(v_paths, m.audio_file_path); v_kinds := array_append(v_kinds, 'audio');
    end if;
    if m.has_video and m.video_file_path is not null then
      v_paths := array_append(v_paths, m.video_file_path); v_kinds := array_append(v_kinds, 'video');
    end if;
    if m.has_image and m.image_file_path is not null then
      v_paths := array_append(v_paths, m.image_file_path); v_kinds := array_append(v_kinds, 'image');
    end if;
    -- Media that only links to another site (YouTube, Spotify…) can't be saved.
    if coalesce(array_length(v_paths, 1), 0) = 0 then
      raise exception 'not_downloadable' using errcode = 'P0001';
    end if;

  elsif p.project_type = 'file' then
    if p.file_path is null then
      raise exception 'not_downloadable' using errcode = 'P0001';
    end if;
    v_paths := array[p.file_path];
    v_kinds := array['file'];

  else
    raise exception 'not_downloadable' using errcode = 'P0001';
  end if;

  -- Hosted files: describe each (size + type) so the app can check free space
  -- and show real progress before it starts. The signed URL itself still comes
  -- from get-project-file, the existing access gate.
  if v_paths is not null then
    for i in 1 .. coalesce(array_length(v_paths, 1), 0) loop
      v_files := v_files || jsonb_build_array(jsonb_build_object(
        'kind', v_kinds[i],
        'name', regexp_replace(v_paths[i], '^.*/', ''),
        'bytes', coalesce((select (o.metadata ->> 'size')::bigint
                             from storage.objects o
                            where o.bucket_id = 'private-content' and o.name = v_paths[i]), 0),
        'mime', (select o.metadata ->> 'mimetype'
                   from storage.objects o
                  where o.bucket_id = 'private-content' and o.name = v_paths[i])
      ));
    end loop;
  end if;

  return jsonb_build_object(
    'project_id', p.id,
    'project_type', p.project_type,
    'version', public.project_offline_version(p.id),
    'is_owner', v_is_owner,
    'content_bytes', coalesce(octet_length(v_content::text), 0),
    'files', v_files,
    'details', v_details,
    'content', case when p_include_content then v_content else null end,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.get_project_offline_bundle(uuid, boolean) from public, anon;
grant execute on function public.get_project_offline_bundle(uuid, boolean) to authenticated;

-- ---------- 3. batch freshness check -------------------------------------
-- Only returns projects the caller may still access; anything else is simply
-- absent (the app keeps its copy and says nothing).
create or replace function public.get_project_offline_versions(p_project_ids uuid[])
returns table (project_id uuid, version text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, public.project_offline_version(p.id)
    from public.projects p
   where p.id = any (coalesce(p_project_ids, '{}'))
     and cardinality(coalesce(p_project_ids, '{}')) <= 100
     and auth.uid() is not null
     and public.can_access_project_content(p.id);
$$;

revoke all on function public.get_project_offline_versions(uuid[]) from public, anon;
grant execute on function public.get_project_offline_versions(uuid[]) to authenticated;

-- ---------- per-user record of saved projects -----------------------------
create table if not exists public.project_downloads (
  user_id         uuid        not null references public.profiles (id) on delete cascade,
  project_id      uuid        not null references public.projects (id) on delete cascade,
  device_id       text        not null check (char_length(device_id) between 8 and 80),
  content_version text        not null,
  bytes           bigint      not null default 0 check (bytes >= 0),
  downloaded_at   timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, project_id, device_id)
);

comment on table public.project_downloads is
  'Which projects a person has saved for offline use, per device (native app). Bookkeeping only: access is decided by get_project_offline_bundle.';

create index if not exists project_downloads_user_recent_idx
  on public.project_downloads (user_id, downloaded_at desc);
-- FK index: keeps a project delete's cascade from scanning the table.
create index if not exists project_downloads_project_idx
  on public.project_downloads (project_id);

alter table public.project_downloads enable row level security;

drop policy if exists "read own downloads" on public.project_downloads;
create policy "read own downloads" on public.project_downloads
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "record own downloads" on public.project_downloads;
create policy "record own downloads" on public.project_downloads
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_access_project_content(project_id)
  );

drop policy if exists "update own downloads" on public.project_downloads;
create policy "update own downloads" on public.project_downloads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and public.can_access_project_content(project_id)
  );

drop policy if exists "delete own downloads" on public.project_downloads;
create policy "delete own downloads" on public.project_downloads
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.project_downloads from anon;
grant select, insert, update, delete on public.project_downloads to authenticated;
