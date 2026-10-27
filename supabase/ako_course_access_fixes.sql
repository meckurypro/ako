-- supabase/ako_course_access_fixes.sql
-- Course access fixes found in the course-builder audit. Applied to "Ako" (nokuwkxosyegaexlzdsl) as migration
-- `course_access_fixes`. Safe to re-run.
--
-- 1. FREE COURSES WERE UNREADABLE. The apps unlock a free (effective price <= 0) course from the client alone, but
--    course_modules / course_lessons only returned rows to the owner, buyers, foreword previewers and lessons flagged as
--    free previews. A learner on a free published course therefore saw empty, locked placeholders. Books already have the
--    right rule (book_chapters_select_gated); courses now follow it.
-- 2. PROGRESS COULD BE WRITTEN FOR ANY LESSON. The insert policy only checked user_id, so anyone could record progress
--    against a course they have no access to (or against a lesson/project pair that doesn't match). It now needs a lesson
--    the caller can actually read, in the project named on the row.
-- 3. RE-COMPLETING A LESSON FAILED. The apps upsert progress, and an upsert that hits an existing row needs an UPDATE
--    policy; there was none, so finishing a video you had already completed (or a double tap, or a second device) raised
--    "new row violates row-level security policy". Own rows can now be updated, under the same checks as the insert.
-- 4. DRAFT COURSE DETAILS WERE PUBLIC. course_details was readable by every signed-in user, drafts and private courses
--    included. It is now readable only by whoever can see the course itself.

-- ── 1. Free published courses are readable ─────────────────────────────────────────────────────────────────────
drop policy if exists "free published courses are readable" on public.course_modules;
create policy "free published courses are readable" on public.course_modules
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = course_modules.project_id
        and p.status = 'active'
        and p.published_at is not null
        and coalesce(p.promo_price_usd, p.price_usd) <= 0
        and (
          coalesce(p.is_private, false) = false
          or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = (select auth.uid()))
        )
    )
  );

drop policy if exists "free published course lessons are readable" on public.course_lessons;
create policy "free published course lessons are readable" on public.course_lessons
  for select to authenticated
  using (
    exists (
      select 1
      from public.course_modules cm
      join public.projects p on p.id = cm.project_id
      where cm.id = course_lessons.module_id
        and p.status = 'active'
        and p.published_at is not null
        and coalesce(p.promo_price_usd, p.price_usd) <= 0
        and (
          coalesce(p.is_private, false) = false
          or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = (select auth.uid()))
        )
    )
  );

-- ── 2 + 3. Progress: insert only for a readable lesson of the named project; own rows can be updated ────────────
drop policy if exists "upsert own course progress" on public.course_lesson_progress;
create policy "upsert own course progress" on public.course_lesson_progress
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.course_lessons l
      join public.course_modules m on m.id = l.module_id
      where l.id = course_lesson_progress.lesson_id
        and m.project_id = course_lesson_progress.project_id
    )
  );

drop policy if exists "update own course progress" on public.course_lesson_progress;
create policy "update own course progress" on public.course_lesson_progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.course_lessons l
      join public.course_modules m on m.id = l.module_id
      where l.id = course_lesson_progress.lesson_id
        and m.project_id = course_lesson_progress.project_id
    )
  );

-- ── 4. Course details: only for people who can see the course ──────────────────────────────────────────────────
drop policy if exists "course details are readable" on public.course_details;
create policy "course details are readable" on public.course_details
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = course_details.project_id
        and (
          p.owner_id = (select auth.uid())
          or (
            p.status = 'active'
            and p.published_at is not null
            and (
              coalesce(p.is_private, false) = false
              or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = (select auth.uid()))
            )
          )
          or exists (select 1 from public.purchases pu where pu.project_id = p.id and pu.buyer_id = (select auth.uid()))
          or public.can_preview_project_for_foreword(p.id)
        )
    )
  );
