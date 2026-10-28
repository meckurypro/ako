-- supabase/ako_voice_notes_flag.sql
-- Admin feature flag `voice_notes_enabled` (Admin > Feature flags > Messaging).
--
-- The clients hide every mic button, the recorder, and all voice-note bubbles/previews when this is off. This file adds
-- the server-side half: while the flag is off, nothing can INSERT a voice note into chats, page inboxes or rooms, even
-- from an old app build. Existing voice notes are not touched, so turning the flag back on restores them all.
-- A missing row counts as ON, the same convention as every other flag.
-- Run once in the Supabase SQL editor. Safe to re-run.

insert into public.feature_flags (key, enabled, label, description)
values (
  'voice_notes_enabled',
  true,
  'Voice notes',
  'Recording and playing voice notes in chats, rooms and classrooms. Turning this off removes every mic button, the recorder and all existing voice-note bubbles and previews from the app; nothing is deleted, and they all come back when it is turned on again.'
)
on conflict (key) do nothing;

create or replace function public.block_voice_notes_when_disabled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (coalesce(new.content, '') like 'ako-voice-note:%' or (to_jsonb(new) ->> 'type') = 'voice_note')
     and exists (select 1 from public.feature_flags where key = 'voice_notes_enabled' and enabled = false) then
    raise exception 'Voice notes are turned off' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists block_voice_notes_on_messages on public.messages;
create trigger block_voice_notes_on_messages
  before insert on public.messages
  for each row execute function public.block_voice_notes_when_disabled();

drop trigger if exists block_voice_notes_on_page_messages on public.page_messages;
create trigger block_voice_notes_on_page_messages
  before insert on public.page_messages
  for each row execute function public.block_voice_notes_when_disabled();

drop trigger if exists block_voice_notes_on_room_posts on public.room_posts;
create trigger block_voice_notes_on_room_posts
  before insert on public.room_posts
  for each row execute function public.block_voice_notes_when_disabled();
