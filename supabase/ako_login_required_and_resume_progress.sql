-- supabase/ako_login_required_and_resume_progress.sql
--
-- Applied to the "Ako Temp" project as migration `login_required_content_and_resume_progress`.
-- Idempotent: safe to re-run.
--
-- 1. LOGIN REQUIRED FOR CONTENT. Free, published projects used to be readable by anyone — including signed-out
--    visitors holding only the anon key — through three SELECT policies. A project's page may be public (that's
--    what makes shared links work), but its content may not: each policy now also needs a signed-in user.
--      • book_chapters          the text of an authored book
--      • meeting_recordings     recordings of a project's meetings
--      • meeting_shared_items   material shared in a project's meetings
--    (The owner / purchaser / free-and-published branches are otherwise unchanged.)
--
-- 2. READING PROGRESS.
--      • book_reading_progress.page_offset  — optional position inside a page (0..1), alongside current_page.
--        scroll_fraction already existed; both are now range-checked.
--      • course_resume                      — one row per learner per course: the lesson they stopped in, how far
--        down it (scroll_fraction) and, for directly hosted video, the playback second (media_seconds).
--        Separate from course_lesson_progress, which only records COMPLETED lessons.

-- ── 1. Content needs an account ─────────────────────────────────────────────────────────────────────────────────
drop policy if exists book_chapters_select_gated on public.book_chapters;
create policy book_chapters_select_gated on public.book_chapters for select to public using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.projects p
    where p.id = book_chapters.project_id
      and (
        p.owner_id = (select auth.uid())
        or exists (select 1 from public.purchases pu where pu.project_id = p.id and pu.buyer_id = (select auth.uid()))
        or (
          p.status = 'active' and p.published_at is not null
          and coalesce(p.promo_price_usd, p.price_usd) <= 0
          and (p.is_private = false or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = (select auth.uid())))
        )
      )
  )
);

drop policy if exists "meeting participants read recordings" on public.meeting_recordings;
create policy "meeting participants read recordings" on public.meeting_recordings for select to public using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.projects p
    where p.id = meeting_recordings.project_id
      and (
        p.owner_id = (select auth.uid())
        or coalesce(p.promo_price_usd, p.price_usd) <= 0
        or exists (select 1 from public.purchases pu where pu.project_id = p.id and pu.buyer_id = (select auth.uid()))
      )
  )
);

drop policy if exists "meeting participants read shared items" on public.meeting_shared_items;
create policy "meeting participants read shared items" on public.meeting_shared_items for select to public using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.projects p
    where p.id = meeting_shared_items.project_id
      and (
        p.owner_id = (select auth.uid())
        or coalesce(p.promo_price_usd, p.price_usd) <= 0
        or exists (select 1 from public.purchases pu where pu.project_id = p.id and pu.buyer_id = (select auth.uid()))
      )
  )
);

-- ── 2. Reading progress ─────────────────────────────────────────────────────────────────────────────────────────
alter table public.book_reading_progress add column if not exists page_offset numeric;
alter table public.book_reading_progress drop constraint if exists book_reading_progress_fractions_chk;
alter table public.book_reading_progress add constraint book_reading_progress_fractions_chk
  check ((scroll_fraction is null or (scroll_fraction >= 0 and scroll_fraction <= 1))
     and (page_offset is null or (page_offset >= 0 and page_offset <= 1)));

create table if not exists public.course_resume (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  lesson_id uuid references public.course_lessons(id) on delete set null,
  scroll_fraction numeric check (scroll_fraction is null or (scroll_fraction >= 0 and scroll_fraction <= 1)),
  media_seconds numeric check (media_seconds is null or media_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);
alter table public.course_resume enable row level security;
drop policy if exists course_resume_owner_all on public.course_resume;
create policy course_resume_owner_all on public.course_resume for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
