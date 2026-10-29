-- ako_rooms_hardening.sql
-- Follow-up to the Supabase security + performance advisors for the groups/rooms work.
--
-- 1. Trigger functions are never meant to be called as RPCs. Postgres checks EXECUTE only when a
--    trigger is created, not when it fires, so revoking from API roles is safe.
-- 2. room_kind_immutable had a mutable search_path.
-- 3. room_meeting_reminders is written only by send_room_meeting_reminders() (cron, security definer):
--    state "no client access" explicitly instead of leaving RLS on with no policy.
-- 4. Index the two foreign keys added for anchors and meetings.

DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.messages_anchor_rules()',
    'public.notify_room_meeting_scheduled()',
    'public.notify_room_meeting_changed()',
    'public.assignments_cohort_only()',
    'public.room_kind_immutable()'
  ] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    END IF;
  END LOOP;
END $$;

ALTER FUNCTION public.room_kind_immutable() SET search_path TO 'public';

REVOKE ALL ON public.room_meeting_reminders FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "no client access" ON public.room_meeting_reminders;
CREATE POLICY "no client access" ON public.room_meeting_reminders
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS messages_anchored_by_idx ON public.messages (anchored_by);
CREATE INDEX IF NOT EXISTS room_meetings_created_by_idx ON public.room_meetings (created_by);
