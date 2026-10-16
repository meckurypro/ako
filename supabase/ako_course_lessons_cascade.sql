-- Deleting a course project cascades projects -> course_modules, but course_modules -> course_lessons was
-- NO ACTION, so any course that had lessons could never be deleted (FK 23503 on course_lessons_module_id_fkey).
-- Lessons belong to their module; remove them with it. course_lesson_progress already cascades from lessons.
alter table public.course_lessons drop constraint if exists course_lessons_module_id_fkey;
alter table public.course_lessons
  add constraint course_lessons_module_id_fkey
  foreign key (module_id) references public.course_modules(id) on delete cascade;
