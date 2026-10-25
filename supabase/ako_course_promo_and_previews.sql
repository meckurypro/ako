-- Course promo video + working free previews. Applied to "Ako" (nokuwkxosyegaexlzdsl) as migration `course_promo_and_previews`.
-- Safe to re-run.

-- ── Promo video (the course trailer shown to people deciding whether to buy) ───────────────────────────────
alter table public.course_details
  add column if not exists promo_video_path text,      -- object in the private course-videos bucket
  add column if not exists promo_url text,             -- or a pasted YouTube / Vimeo / direct link
  add column if not exists promo_width integer,
  add column if not exists promo_height integer,
  add column if not exists promo_duration integer;     -- seconds

-- Anyone signed in can play a PUBLISHED course's promo; the owner can always play theirs (folder policy).
drop policy if exists "course-videos: promo readable once published" on storage.objects;
create policy "course-videos: promo readable once published" on storage.objects for select to authenticated
  using (
    bucket_id = 'course-videos'
    and exists (
      select 1 from public.course_details cd
      join public.projects p on p.id = cd.project_id
      where cd.promo_video_path = objects.name
        and p.published_at is not null and p.status = 'active' and coalesce(p.is_private, false) = false
    )
  );

-- ── Free-preview lessons readable by non-buyers ────────────────────────────────────────────────────────────
-- Only lessons the creator flagged, only on a published public course, never inside a Foreword section.
-- (Videos of those lessons follow automatically: their storage policy reads the lesson row under the caller's RLS.)
drop policy if exists "free preview lessons are readable" on public.course_lessons;
create policy "free preview lessons are readable" on public.course_lessons
  for select to authenticated
  using (
    is_free_preview
    and exists (
      select 1 from public.course_modules cm
      join public.projects p on p.id = cm.project_id
      where cm.id = course_lessons.module_id
        and coalesce(cm.is_foreword_managed, false) = false
        and p.published_at is not null and p.status = 'active' and coalesce(p.is_private, false) = false
    )
  );

-- ── Outline for prospective buyers: titles and types only, never content, links or video paths ─────────────
create or replace function public.course_outline(p_project_id uuid)
returns table (
  module_id uuid, module_title text, module_sort integer,
  lesson_id uuid, lesson_title text, lesson_sort integer,
  lesson_type text, video_duration integer, is_free_preview boolean
)
language sql stable security definer set search_path = public
as $$
  select m.id, m.title, m.sort_order,
         l.id, l.title, l.sort_order,
         l.lesson_type, l.video_duration, coalesce(l.is_free_preview, false)
  from public.course_modules m
  join public.projects p on p.id = m.project_id
  left join public.course_lessons l on l.module_id = m.id
  where m.project_id = p_project_id
    and coalesce(m.is_foreword_managed, false) = false
    and p.published_at is not null and p.status = 'active' and coalesce(p.is_private, false) = false
  order by m.sort_order, l.sort_order;
$$;
revoke all on function public.course_outline(uuid) from public, anon;
grant execute on function public.course_outline(uuid) to authenticated;
