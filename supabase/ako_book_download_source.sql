-- ako_book_download_source.sql
--
-- Books now branch on HOW readers get them:
--   Read on Akọ  -> content_source 'authored' (write in Akọ) or 'upload' (PDF extracted into chapters)
--   Downloadable -> content_source 'download' (NEW: hosted PDF, download only, never read in-app)
--   External link -> content_source 'link'
--
-- 'download' rows: file_path required, allow_download = true, allow_read_in_app = false.
-- Existing 'upload' books (including legacy ones that also allow download) are unaffected.
--
-- Admin switch: book_download_enabled (default ON, missing row = ON), enforced server-side
-- alongside book_pdf_upload_enabled / book_link_enabled.

-- 1) Allow the new source value.
alter table public.project_book_details drop constraint if exists project_book_details_content_source_check;
alter table public.project_book_details
  add constraint project_book_details_content_source_check
  check (content_source = any (array['link'::text, 'upload'::text, 'authored'::text, 'download'::text]));

alter table public.project_book_details drop constraint if exists project_book_details_content_matches_source;
alter table public.project_book_details
  add constraint project_book_details_content_matches_source
  check (
    (content_source = 'authored' and external_url is null and file_path is null)
    or (content_source = 'link' and external_url is not null)
    or (content_source = 'upload' and file_path is not null)
    or (content_source = 'download' and file_path is not null and external_url is null)
  );

-- A download-only book is never readable in-app and is always downloadable.
alter table public.project_book_details drop constraint if exists project_book_details_download_flags;
alter table public.project_book_details
  add constraint project_book_details_download_flags
  check (content_source <> 'download' or (allow_download = true and allow_read_in_app = false));

-- 2) Admin flag.
insert into public.feature_flags (key, enabled, label, description)
values (
  'book_download_enabled', true, 'Book download',
  'Adding a Book as a downloadable PDF (readers download the file; no in-app reading). Existing downloadable books are unaffected.'
)
on conflict (key) do nothing;

-- 3) Server-side enforcement of all three source flags.
create or replace function public.enforce_book_source_flags()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_enabled boolean;
begin
  if tg_op = 'UPDATE' and new.content_source is not distinct from old.content_source then
    return new;
  end if;

  if new.content_source = 'upload' then
    select enabled into v_enabled from public.feature_flags where key = 'book_pdf_upload_enabled';
    if coalesce(v_enabled, true) is false then
      raise exception 'Adding a book by PDF upload is temporarily disabled';
    end if;
  elsif new.content_source = 'download' then
    select enabled into v_enabled from public.feature_flags where key = 'book_download_enabled';
    if coalesce(v_enabled, true) is false then
      raise exception 'Adding a downloadable book is temporarily disabled';
    end if;
  elsif new.content_source = 'link' then
    select enabled into v_enabled from public.feature_flags where key = 'book_link_enabled';
    if coalesce(v_enabled, true) is false then
      raise exception 'Adding a book by link is temporarily disabled';
    end if;
  end if;

  return new;
end;
$function$;

-- 4) Offline bundle: treat 'download' like a hosted-file book that can never be read in-app.
--    Patched from the live definition so grants/attributes are preserved.
do $patch$
declare
  v_def text;
  v_new text;
begin
  select pg_get_functiondef('public.get_project_offline_bundle(uuid, boolean)'::regprocedure) into v_def;

  if position($a$b.content_source in ('upload', 'download')$a$ in v_def) > 0 then
    return; -- already patched
  end if;

  v_new := replace(v_def,
    $a$elsif b.content_source = 'upload' then$a$,
    $a$elsif b.content_source in ('upload', 'download') then$a$);
  v_new := replace(v_new,
    $a$v_can_read := v_is_owner or b.allow_read_in_app;$a$,
    $a$v_can_read := b.content_source = 'upload' and (v_is_owner or b.allow_read_in_app);$a$);

  if v_new = v_def or position($a$b.content_source in ('upload', 'download')$a$ in v_new) = 0 then
    raise exception 'get_project_offline_bundle patch did not apply';
  end if;

  execute v_new;
end
$patch$;
