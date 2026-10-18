-- ako_book_source_flags.sql
--
-- Admin on/off switches for two of the three ways to add a Book:
--   book_pdf_upload_enabled  -> "Upload PDF"  (content_source = 'upload')
--   book_link_enabled        -> "Link"        (content_source = 'link')
-- "Write in Akọ" (content_source = 'authored') is deliberately NOT
-- switchable here.
--
-- Same convention as every other feature_flags row: an OFF switch on a
-- feature that's already live, default ON, and a missing row is treated
-- as ON. Turning one off only blocks NEW use — books that already exist
-- (and edits to them that don't change their source) are unaffected.

insert into public.feature_flags (key, enabled, label, description)
values
  ('book_pdf_upload_enabled', true, 'Book PDF upload',
   'Adding a Book by uploading a PDF. Existing PDF books are unaffected.'),
  ('book_link_enabled', true, 'Book link',
   'Adding a Book by pasting a link to it elsewhere. Existing link books are unaffected.')
on conflict (key) do nothing;

-- Server-side enforcement (the UI hiding the option is a convenience,
-- not the boundary). Fires on INSERT, and on UPDATE only when the
-- content_source is actually being changed to a disabled one — so
-- editing an existing PDF/link book keeps working while its flag is off.
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
  elsif new.content_source = 'link' then
    select enabled into v_enabled from public.feature_flags where key = 'book_link_enabled';
    if coalesce(v_enabled, true) is false then
      raise exception 'Adding a book by link is temporarily disabled';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_enforce_book_source_flags on public.project_book_details;
create trigger trg_enforce_book_source_flags
  before insert or update of content_source on public.project_book_details
  for each row execute function public.enforce_book_source_flags();
