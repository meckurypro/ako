-- supabase/ako_multi_file_projects.sql
--
-- File projects can hold several files, like tracks on an album:
--   * Each file is a "slot": the uploaded file, plus an optional title for the downloaded copy.
--   * A downloaded file is named after the UPLOADED FILE by default (e.g. "final-mix.wav"). If the creator typed a
--     title for the slot, that title is used instead (the extension always comes from the uploaded file).
--     Before this, every download was named after the project title.
--   * Unverified accounts: 1 file. Verified, unrestricted accounts (profiles.is_verified, and not "pending" while
--     the incubation review gate is on — the same rule as profile websites and useIsRestricted): up to 6.
--   * Price and privacy stay on the PROJECT (projects.price_usd / is_private). Nothing here is per file.
--
-- Shape:
--   project_files           one row per file. download_name is the final, sanitised name incl. extension, computed
--                           at write time so every reader (edge function, offline bundle, apps) agrees.
--   set_project_files()     the ONLY writer (SECURITY DEFINER, owner only): replaces a project's whole file list,
--                           returns storage paths that are no longer used so the app can delete them.
--   projects.file_path      stays, mirroring the FIRST file, and projects.file_count is new. Older app builds that
--                           still read/write file_path keep working: triggers keep the two in step.
--   get-project-file        (edge function) now takes an optional file_id and returns the download name.
--   get_project_offline_bundle / project_offline_version are patched in place (below) so saving a project for
--                           offline use includes every file under its proper name.
--
-- Safe to re-run. Additive; nothing existing is dropped.

-- ── 1. Naming ───────────────────────────────────────────────────────────────

create or replace function public.project_file_download_name(p_display text, p_original text)
returns text
language plpgsql
immutable
as $$
declare
  v_ext text;
  v_orig_base text;
  v_base text;
begin
  v_ext := substring(coalesce(p_original, '') from '\.([A-Za-z0-9]{1,10})$');
  v_orig_base := case
    when v_ext is null then coalesce(p_original, '')
    else left(p_original, length(p_original) - length(v_ext) - 1)
  end;

  v_base := coalesce(nullif(btrim(coalesce(p_display, '')), ''), v_orig_base);

  -- They may have typed the extension themselves ("Track 1.wav") — don't double it.
  if v_ext is not null and (lower(v_base) like ('%.' || lower(v_ext))) then
    v_base := left(v_base, length(v_base) - length(v_ext) - 1);
  end if;

  v_base := regexp_replace(v_base, '[\\/:*?"<>|[:cntrl:]]+', '', 'g');
  v_base := regexp_replace(btrim(v_base), '\s+', ' ', 'g');
  v_base := regexp_replace(v_base, '^\.+', '');
  v_base := left(btrim(v_base), 100);
  if v_base = '' then v_base := 'download'; end if;

  return case when v_ext is null then v_base else v_base || '.' || v_ext end;
end;
$$;

-- ── 2. Who may add how many ─────────────────────────────────────────────────

-- 1 for everyone; 6 for verified, unrestricted accounts. The single source of truth for the limit.
create or replace function public.project_file_limit(p_owner uuid)
returns integer
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_verified boolean;
  v_status text;
  v_gate boolean;
begin
  select is_verified, account_status into v_verified, v_status from public.profiles where id = p_owner;
  select coalesce((select enabled from public.feature_flags where key = 'incubation_review_gate_enabled'), false)
    into v_gate;
  if coalesce(v_verified, false) and not (v_gate and v_status = 'pending') then
    return 6;
  end if;
  return 1;
end;
$$;
revoke all on function public.project_file_limit(uuid) from public, anon;
grant execute on function public.project_file_limit(uuid) to authenticated;

-- ── 3. The table ────────────────────────────────────────────────────────────

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  position integer not null check (position >= 1),
  file_path text not null,
  original_name text not null check (char_length(original_name) between 1 and 255),
  display_name text check (display_name is null or char_length(display_name) between 1 and 100),
  download_name text not null,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now(),
  -- Deferred so a reorder inside one transaction can pass through duplicate positions.
  constraint project_files_position_unique unique (project_id, position) deferrable initially deferred,
  constraint project_files_path_unique unique (project_id, file_path)
);

alter table public.project_files enable row level security;

-- Anyone who can see the project can see its file list (names and sizes — the files themselves are only ever
-- reachable through get-project-file, which checks purchase/ownership; the bucket has no read policy).
drop policy if exists "File lists follow project visibility" on public.project_files;
create policy "File lists follow project visibility" on public.project_files
  for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_files.project_id));

-- No client write policies at all: only set_project_files() (and the compatibility triggers) write.
revoke insert, update, delete on public.project_files from anon, authenticated;

alter table public.projects add column if not exists file_count integer not null default 0;
alter table public.project_file_downloads
  add column if not exists file_id uuid references public.project_files (id) on delete set null;

-- Backstop for the limit, whoever writes (the RPC checks first and gives friendlier messages).
create or replace function public.enforce_project_file_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_owner uuid;
  v_limit int;
  v_count int;
begin
  select owner_id into v_owner from public.projects where id = new.project_id;
  v_limit := public.project_file_limit(v_owner);
  select count(*) into v_count from public.project_files where project_id = new.project_id;
  if v_count >= v_limit then
    if v_limit = 1 then
      raise exception 'Only verified accounts can add more than one file.';
    end if;
    raise exception 'You can add up to % files.', v_limit;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_project_file_limit on public.project_files;
create trigger trg_enforce_project_file_limit
  before insert on public.project_files
  for each row execute function public.enforce_project_file_limit();

-- ── 4. The only writer ──────────────────────────────────────────────────────

-- p_files: ordered array of
--   { "id": uuid|null,            -- existing file's id to keep it; omit for a newly uploaded file
--     "file_path": text,          -- private-content path, must live under the caller's own folder
--     "original_name": text,      -- the uploaded file's name, with extension
--     "display_name": text|null,  -- optional title for the downloaded copy
--     "size_bytes": bigint|null }
-- Files not listed are removed. Returns { "removed_paths": [...] } — storage objects nobody references any more.
create or replace function public.set_project_files(p_project_id uuid, p_files jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_type text;
  v_limit int;
  v_len int;
  v_existing int;
  v_item jsonb;
  v_pos int;
  v_id uuid;
  v_path text;
  v_orig text;
  v_disp text;
  v_size bigint;
  v_keep uuid[] := '{}';
  v_paths text[] := '{}';
  v_removed text[];
begin
  if v_uid is null then
    raise exception 'Sign in to continue.' using errcode = '28000';
  end if;

  select owner_id, project_type into v_owner, v_type from public.projects where id = p_project_id;
  if not found or v_owner is distinct from v_uid then
    raise exception 'Project not found.' using errcode = '42501';
  end if;
  if v_type <> 'file' then
    raise exception 'Only file projects have files.';
  end if;
  if p_files is null or jsonb_typeof(p_files) <> 'array' then
    raise exception 'Files must be a list.';
  end if;

  v_len := jsonb_array_length(p_files);
  if v_len < 1 then
    raise exception 'Add at least one file.';
  end if;

  v_limit := public.project_file_limit(v_uid);
  select count(*) into v_existing from public.project_files where project_id = p_project_id;
  -- Never grow past the limit; a list that merely keeps what's already there is always fine (no trimming if an
  -- account stops being verified).
  if v_len > greatest(v_limit, v_existing) then
    if v_limit = 1 then
      raise exception 'Only verified accounts can add more than one file.';
    end if;
    raise exception 'You can add up to % files.', v_limit;
  end if;

  -- Pass 1: validate everything before touching anything.
  for v_item in select * from jsonb_array_elements(p_files) loop
    v_path := nullif(btrim(coalesce(v_item ->> 'file_path', '')), '');
    if v_path is null or split_part(v_path, '/', 1) <> v_uid::text then
      raise exception 'One of the files is not valid. Please upload it again.';
    end if;
    if nullif(btrim(coalesce(v_item ->> 'original_name', '')), '') is null then
      raise exception 'One of the files has no name.';
    end if;
    if v_path = any (v_paths) then
      raise exception 'The same file was added twice.';
    end if;
    v_paths := array_append(v_paths, v_path);

    v_id := nullif(v_item ->> 'id', '')::uuid;
    if v_id is not null and exists (
      select 1 from public.project_files where id = v_id and project_id = p_project_id and file_path = v_path
    ) then
      v_keep := array_append(v_keep, v_id);
    end if;
  end loop;

  -- Drop files that are no longer listed (a replaced file shows up here too: new path, so not kept).
  with gone as (
    delete from public.project_files
     where project_id = p_project_id and not (id = any (v_keep))
    returning file_path
  )
  select array_agg(file_path) into v_removed from gone;

  -- Pass 2: write in order.
  v_pos := 0;
  for v_item in select * from jsonb_array_elements(p_files) loop
    v_pos := v_pos + 1;
    v_path := btrim(v_item ->> 'file_path');
    v_orig := left(btrim(v_item ->> 'original_name'), 255);
    v_disp := left(nullif(btrim(coalesce(v_item ->> 'display_name', '')), ''), 100);
    v_size := nullif(v_item ->> 'size_bytes', '')::bigint;
    v_id := nullif(v_item ->> 'id', '')::uuid;

    if v_id is not null and v_id = any (v_keep) then
      update public.project_files
         set position = v_pos,
             original_name = v_orig,
             display_name = v_disp,
             download_name = public.project_file_download_name(v_disp, v_orig),
             size_bytes = coalesce(v_size, size_bytes)
       where id = v_id;
    else
      insert into public.project_files (project_id, position, file_path, original_name, display_name, download_name, size_bytes)
      values (p_project_id, v_pos, v_path, v_orig, v_disp, public.project_file_download_name(v_disp, v_orig), v_size);
    end if;
  end loop;

  -- Keep the legacy column (older app builds) and the count in step with the list.
  update public.projects
     set file_path = (select file_path from public.project_files where project_id = p_project_id order by position limit 1),
         file_count = v_len
   where id = p_project_id;

  return jsonb_build_object(
    'removed_paths',
    coalesce((select jsonb_agg(x) from unnest(coalesce(v_removed, '{}')) x where x <> all (v_paths)), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.set_project_files(uuid, jsonb) from public, anon;
grant execute on function public.set_project_files(uuid, jsonb) to authenticated;

-- ── 5. Older app builds ─────────────────────────────────────────────────────
-- They create/replace a file by writing projects.file_path alone. Mirror that into project_files so the project
-- still has exactly the file they uploaded. They name downloads after the project title (their old behaviour), so
-- display_name = title here.

create or replace function public.sync_project_files_from_legacy_path()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_first public.project_files%rowtype;
  v_orig text;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  if new.project_type is distinct from 'file' or new.file_path is null then return null; end if;

  v_orig := regexp_replace(new.file_path, '^.*/', '');
  select * into v_first from public.project_files where project_id = new.id order by position limit 1;

  if not found then
    insert into public.project_files (project_id, position, file_path, original_name, display_name, download_name)
    values (new.id, 1, new.file_path, v_orig, left(new.title, 100), public.project_file_download_name(new.title, v_orig));
  elsif v_first.file_path is distinct from new.file_path
        and not exists (select 1 from public.project_files where project_id = new.id and file_path = new.file_path) then
    update public.project_files
       set file_path = new.file_path,
           original_name = v_orig,
           display_name = left(new.title, 100),
           download_name = public.project_file_download_name(new.title, v_orig),
           size_bytes = null
     where id = v_first.id;
  else
    return null;
  end if;

  update public.projects
     set file_count = (select count(*) from public.project_files where project_id = new.id)
   where id = new.id;
  return null;
end;
$$;

drop trigger if exists trg_sync_project_files_from_legacy_path on public.projects;
create trigger trg_sync_project_files_from_legacy_path
  after insert or update of file_path on public.projects
  for each row
  when (new.project_type = 'file')
  execute function public.sync_project_files_from_legacy_path();

-- ── 6. Backfill: every existing file project gets its one file row ──────────
-- Existing downloads were named after the project title, so keep that name for them (display_name = title). New
-- uploads name themselves after the uploaded file.

insert into public.project_files (project_id, position, file_path, original_name, display_name, download_name, size_bytes)
select p.id, 1, p.file_path,
       regexp_replace(p.file_path, '^.*/', ''),
       left(p.title, 100),
       public.project_file_download_name(p.title, regexp_replace(p.file_path, '^.*/', '')),
       (select (o.metadata ->> 'size')::bigint from storage.objects o
         where o.bucket_id = 'private-content' and o.name = p.file_path)
  from public.projects p
 where p.project_type = 'file' and p.file_path is not null
   and not exists (select 1 from public.project_files f where f.project_id = p.id);

update public.projects p
   set file_count = (select count(*) from public.project_files f where f.project_id = p.id)
 where p.project_type = 'file'
   and p.file_count is distinct from (select count(*) from public.project_files f where f.project_id = p.id);

-- ── 7. Offline downloads ────────────────────────────────────────────────────
-- Patch the two live functions in place (rather than re-declare them from a possibly stale copy): only their
-- "file" branches change. Fails loudly if the text we expect isn't there, and does nothing if already patched.

create or replace function pg_temp.swap(d text, a text, b text)
returns text
language plpgsql
as $$
begin
  if position(a in d) = 0 then
    raise exception 'multi-file patch: expected text not found: %', left(a, 80);
  end if;
  return replace(d, a, b);
end;
$$;

do $mig$
declare
  d text;
begin
  -- A saved project's version: every file's path + etag. For a one-file project this string is identical to the
  -- old one, so existing offline copies are not flagged as outdated.
  d := pg_get_functiondef('public.project_offline_version(uuid)'::regprocedure);
  if position('project_files' in d) = 0 then
    d := pg_temp.swap(d,
$a$    select md5(coalesce(p.file_path, '') || ':' || coalesce(
             (select coalesce(o.metadata ->> 'eTag', o.updated_at::text)
                from storage.objects o
               where o.bucket_id = 'private-content' and o.name = p.file_path), ''))
      into v;$a$,
$b$    select md5(coalesce(string_agg(f.file_path || ':' || coalesce(
             (select coalesce(o.metadata ->> 'eTag', o.updated_at::text)
                from storage.objects o
               where o.bucket_id = 'private-content' and o.name = f.file_path), ''), '|' order by f.position),
             coalesce(p.file_path, '') || ':'))
      into v
      from public.project_files f
     where f.project_id = p.id;$b$);
    execute d;
  end if;

  -- The offline bundle: list every file, with its id (so the app asks for the right one) and download name.
  d := pg_get_functiondef('public.get_project_offline_bundle(uuid,boolean)'::regprocedure);
  if position('project_files' in d) = 0 then
    d := pg_temp.swap(d,
$a$  v_kinds text[];
  i int;$a$,
$b$  v_kinds text[];
  v_names text[];
  v_ids uuid[];
  i int;$b$);
    d := pg_temp.swap(d,
$a$    if p.file_path is null then
      raise exception 'not_downloadable' using errcode = 'P0001';
    end if;
    v_paths := array[p.file_path];
    v_kinds := array['file'];

  else$a$,
$b$    select coalesce(array_agg(f.file_path order by f.position), '{}'),
           coalesce(array_agg('file'::text order by f.position), '{}'),
           coalesce(array_agg(f.download_name order by f.position), '{}'),
           coalesce(array_agg(f.id order by f.position), '{}')
      into v_paths, v_kinds, v_names, v_ids
      from public.project_files f
     where f.project_id = p.id;
    if coalesce(array_length(v_paths, 1), 0) = 0 then
      if p.file_path is null then
        raise exception 'not_downloadable' using errcode = 'P0001';
      end if;
      v_paths := array[p.file_path];
      v_kinds := array['file'];
    end if;

  else$b$);
    d := pg_temp.swap(d,
$a$        'name', regexp_replace(v_paths[i], '^.*/', ''),$a$,
$b$        'name', coalesce(v_names[i], regexp_replace(v_paths[i], '^.*/', '')),
        'file_id', v_ids[i],$b$);
    execute d;
  end if;
end
$mig$;

notify pgrst, 'reload schema';
