-- Course builder v2: lesson types (video / reading / quiz / assignment), direct video upload, course details.
-- Applied to "Ako" (nokuwkxosyegaexlzdsl) as migration `course_builder_v2`. Safe to re-run.

-- ── Lesson types ───────────────────────────────────────────────────────────────────────────────────────────
alter table public.course_lessons
  add column if not exists lesson_type text not null default 'text',
  add column if not exists video_path text,            -- object path in the private course-videos bucket
  add column if not exists video_width integer,
  add column if not exists video_height integer,
  add column if not exists video_duration integer,     -- seconds
  add column if not exists data jsonb;                 -- quiz: {questions:[...], pass_mark}; assignment: {}

alter table public.course_lessons drop constraint if exists course_lessons_lesson_type_check;
alter table public.course_lessons
  add constraint course_lessons_lesson_type_check check (lesson_type in ('video','text','quiz','assignment'));

-- Existing lessons: a lesson with a video link is a video lesson, everything else is a reading.
update public.course_lessons set lesson_type = 'video' where media_url is not null and lesson_type = 'text';

create index if not exists course_lessons_video_path_idx on public.course_lessons (video_path) where video_path is not null;

-- ── Course details (objectives etc.) ───────────────────────────────────────────────────────────────────────
create table if not exists public.course_details (
  project_id   uuid primary key references public.projects(id) on delete cascade,
  subtitle     text,
  level        text check (level in ('beginner','intermediate','advanced','all')),
  language     text not null default 'English',
  objectives   text[] not null default '{}',
  requirements text[] not null default '{}',
  audience     text[] not null default '{}',
  updated_at   timestamptz not null default now()
);
alter table public.course_details enable row level security;

drop policy if exists "course details are readable" on public.course_details;
create policy "course details are readable" on public.course_details
  for select to authenticated using (true);

drop policy if exists "owner can insert course details" on public.course_details;
create policy "owner can insert course details" on public.course_details
  for insert to authenticated
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));

drop policy if exists "owner can update course details" on public.course_details;
create policy "owner can update course details" on public.course_details
  for update to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));

-- ── Video storage ──────────────────────────────────────────────────────────────────────────────────────────
-- Private bucket, up to 1 GB per video. Objects live at <owner id>/<project id>/<file>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-videos', 'course-videos', false, 1073741824,
        array['video/mp4','video/quicktime','video/webm','video/x-m4v'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;

drop policy if exists "course-videos: owner uploads" on storage.objects;
create policy "course-videos: owner uploads" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'course-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.projects p
                where p.id::text = (storage.foldername(name))[2] and p.owner_id = (select auth.uid()))
  );

drop policy if exists "course-videos: owner updates" on storage.objects;
create policy "course-videos: owner updates" on storage.objects for update to authenticated
  using (bucket_id = 'course-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "course-videos: owner deletes" on storage.objects;
create policy "course-videos: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'course-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Whoever can read the lesson row can play its video: the subquery runs under the caller's own RLS on
-- course_lessons (owner, buyers, foreword previewers, guest passes), so access never drifts from the lesson's.
drop policy if exists "course-videos: readable with the lesson" on storage.objects;
create policy "course-videos: readable with the lesson" on storage.objects for select to authenticated
  using (
    bucket_id = 'course-videos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.course_lessons l where l.video_path = objects.name)
    )
  );
