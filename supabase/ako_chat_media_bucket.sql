-- ako_chat_media_bucket.sql
-- Photos, albums and documents sent in chat (see src/lib/chatMedia.ts) live in a PRIVATE
-- storage bucket, exactly like voice notes live in the private "audio" bucket: the message
-- stores an object PATH and every render resolves a short-lived signed URL.
--
-- Object path convention (the policies below depend on it):
--     <uploader uid>/dm/<conversation id>/<file name>
--   • segment 1 must be the uploader's own id  → you can only write into your own folder
--   • segment 3 is the conversation id         → the other participant can read it back
--
-- Run once in the Supabase SQL editor. Safe to re-run.
-- Until it has been run, sending a photo/document fails with "Bucket not found" and the app
-- tells the person that sharing isn't set up yet — nothing else in chat is affected.

insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-media', 'chat-media', false, 26214400) -- 25 MB, matches MAX_MEDIA_BYTES in the app
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "chat-media: upload to own folder" on storage.objects;
create policy "chat-media: upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read: the uploader, or anyone who participates in the conversation the file was sent in.
-- (Forwarding copies the file into the NEW conversation's folder, so this still holds.)
drop policy if exists "chat-media: read as uploader or participant" on storage.objects;
create policy "chat-media: read as uploader or participant"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[2] = 'dm'
        and exists (
          select 1
          from public.conversation_participants cp
          where cp.conversation_id::text = (storage.foldername(name))[3]
            and cp.user_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "chat-media: delete own files" on storage.objects;
create policy "chat-media: delete own files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
