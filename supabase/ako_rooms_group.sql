-- ako_rooms_group.sql
-- Rooms as groups: anchored messages, "what new members see" history rule,
-- host-only meeting writes, meeting notifications + reminders.
-- Already applied to the Ako project as migration 20261028083404 (ako_rooms_group).

ALTER TABLE public.project_room_details
  ADD COLUMN IF NOT EXISTS history_mode text NOT NULL DEFAULT 'anchored';

ALTER TABLE public.project_room_details DROP CONSTRAINT IF EXISTS project_room_details_history_mode_check;
ALTER TABLE public.project_room_details
  ADD CONSTRAINT project_room_details_history_mode_check
  CHECK (history_mode IN ('all', 'admins_and_anchored', 'anchored'));

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS anchored_at timestamptz,
  ADD COLUMN IF NOT EXISTS anchored_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS messages_conversation_anchored_idx
  ON public.messages (conversation_id, anchored_at DESC)
  WHERE anchored_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.room_message_visible(
  p_conversation_id uuid,
  p_sender_id uuid,
  p_created_at timestamptz,
  p_anchored_at timestamptz,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(
    (
      SELECT coalesce(
        d.history_mode = 'all'
        OR p_anchored_at IS NOT NULL
        OR p_sender_id = p_user_id
        OR p_created_at >= coalesce(
             (SELECT cp.joined_at FROM public.conversation_participants cp
               WHERE cp.conversation_id = p_conversation_id AND cp.user_id = p_user_id),
             'infinity'::timestamptz
           )
        OR public.is_room_host(d.project_id, p_user_id)
        OR (d.history_mode = 'admins_and_anchored' AND public.is_room_host(d.project_id, p_sender_id)),
        false
      )
      FROM public.project_room_details d
      WHERE d.conversation_id = p_conversation_id
    ),
    true
  );
$$;

DROP POLICY IF EXISTS "room chat history visibility" ON public.messages;
CREATE POLICY "room chat history visibility" ON public.messages
  AS RESTRICTIVE
  FOR SELECT
  TO public
  USING (public.room_message_visible(conversation_id, sender_id, created_at, anchored_at, (SELECT auth.uid())));

CREATE OR REPLACE FUNCTION public.messages_anchor_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.anchored_at := NULL;
      NEW.anchored_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF coalesce(NEW.is_deleted, false) AND NOT coalesce(OLD.is_deleted, false) THEN
    NEW.anchored_at := NULL;
    NEW.anchored_by := NULL;
    RETURN NEW;
  END IF;

  IF NEW.anchored_at IS NOT DISTINCT FROM OLD.anchored_at
     AND NEW.anchored_by IS NOT DISTINCT FROM OLD.anchored_by THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT d.project_id INTO v_project
  FROM public.project_room_details d
  WHERE d.conversation_id = NEW.conversation_id;

  IF v_project IS NULL OR NOT public.is_room_host(v_project, auth.uid()) THEN
    RAISE EXCEPTION 'Only room hosts can anchor messages' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_anchor_rules ON public.messages;
CREATE TRIGGER trg_messages_anchor_rules
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_anchor_rules();

CREATE OR REPLACE FUNCTION public.set_message_anchor(p_message_id uuid, p_anchored boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conversation uuid;
  v_deleted boolean;
  v_project uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  SELECT m.conversation_id, coalesce(m.is_deleted, false)
    INTO v_conversation, v_deleted
  FROM public.messages m
  WHERE m.id = p_message_id;

  IF v_conversation IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  SELECT d.project_id INTO v_project
  FROM public.project_room_details d
  WHERE d.conversation_id = v_conversation;

  IF v_project IS NULL THEN
    RAISE EXCEPTION 'Only room messages can be anchored';
  END IF;

  IF NOT public.is_room_host(v_project, auth.uid()) THEN
    RAISE EXCEPTION 'Only room hosts can anchor messages' USING ERRCODE = '42501';
  END IF;

  IF p_anchored THEN
    IF v_deleted THEN
      RAISE EXCEPTION 'A deleted message can''t be anchored';
    END IF;
    IF (SELECT count(*) FROM public.messages
         WHERE conversation_id = v_conversation AND anchored_at IS NOT NULL) >= 100 THEN
      RAISE EXCEPTION 'A room can have at most 100 anchored messages';
    END IF;
  END IF;

  UPDATE public.messages
  SET anchored_at = CASE WHEN p_anchored THEN now() ELSE NULL END,
      anchored_by = CASE WHEN p_anchored THEN auth.uid() ELSE NULL END
  WHERE id = p_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_message_anchor(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_message_anchor(uuid, boolean) TO authenticated;

ALTER TABLE public.room_meetings
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "host can insert room meetings" ON public.room_meetings;
CREATE POLICY "host can insert room meetings" ON public.room_meetings
  FOR INSERT
  WITH CHECK (public.is_room_host(project_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "host can update room meetings" ON public.room_meetings;
CREATE POLICY "host can update room meetings" ON public.room_meetings
  FOR UPDATE
  USING (public.is_room_host(project_id, (SELECT auth.uid())))
  WITH CHECK (public.is_room_host(project_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "host can delete room meetings" ON public.room_meetings;
CREATE POLICY "host can delete room meetings" ON public.room_meetings
  FOR DELETE
  USING (public.is_room_host(project_id, (SELECT auth.uid())));

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'support','pushback','question','disagree','comment','comment_reply','comment_like','comment_dislike',
    'like','dislike','share','reshare','quote','follow','follow_request','follow_request_accepted','mention',
    'post_tagged','post_published','post_comment_activity','message','system','gift_received','project_tagged',
    'project_purchased','project_access_granted','file_downloaded','give_back_received',
    'affiliate_commission_earned','withdrawal_status','promotion_approved','promotion_declined',
    'room_meeting_scheduled','moderation_notice','admin_message','collaboration_invite','collaboration_accepted',
    'collaboration_declined','gig_created_from_collaboration','music_credit_request','foreword_invite',
    'foreword_submitted','foreword_approved','foreword_declined','page_role_invite','page_role_accepted',
    'page_role_declined','page_role_rejected','page_role_requested','page_role_approved','project_forked',
    'forked_project_tagged','custom_page_inquiry',
    'room_meeting_reminder','room_meeting_soon','room_meeting_starting','room_meeting_rescheduled',
    'room_meeting_cancelled'
  ]::text[]));

CREATE OR REPLACE FUNCTION public.room_audience(p_project_id uuid)
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT rm.user_id FROM public.room_members rm WHERE rm.project_id = p_project_id
  UNION
  SELECT p.owner_id FROM public.projects p WHERE p.id = p_project_id AND p.owner_id IS NOT NULL
  UNION
  SELECT mo.user_id FROM public.room_moderators mo WHERE mo.project_id = p_project_id;
$$;

REVOKE ALL ON FUNCTION public.room_audience(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_room_meeting_scheduled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid;
BEGIN
  IF NEW.status IN ('ended', 'cancelled') THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(NEW.created_by, p.owner_id) INTO v_actor
  FROM public.projects p WHERE p.id = NEW.project_id;

  INSERT INTO public.notifications (user_id, type, actor_id, target_type, target_id, preview_text)
  SELECT a.user_id, 'room_meeting_scheduled', v_actor, 'project', NEW.project_id,
         coalesce(NEW.title, p.title)
  FROM public.room_audience(NEW.project_id) a
  JOIN public.projects p ON p.id = NEW.project_id
  WHERE a.user_id IS DISTINCT FROM v_actor;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_room_meeting_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid;
  v_type text;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    v_type := 'room_meeting_cancelled';
  ELSIF NEW.status = 'scheduled' AND NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
    v_type := 'room_meeting_rescheduled';
    DELETE FROM public.room_meeting_reminders WHERE meeting_id = NEW.id;
  ELSE
    RETURN NEW;
  END IF;

  SELECT coalesce(auth.uid(), NEW.created_by, p.owner_id) INTO v_actor
  FROM public.projects p WHERE p.id = NEW.project_id;

  INSERT INTO public.notifications (user_id, type, actor_id, target_type, target_id, preview_text)
  SELECT a.user_id, v_type, v_actor, 'project', NEW.project_id, coalesce(NEW.title, p.title)
  FROM public.room_audience(NEW.project_id) a
  JOIN public.projects p ON p.id = NEW.project_id
  WHERE a.user_id IS DISTINCT FROM v_actor;

  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.room_meeting_reminders (
  meeting_id uuid NOT NULL REFERENCES public.room_meetings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('day', 'soon', 'start')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, kind)
);
ALTER TABLE public.room_meeting_reminders ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS room_meeting_changed_notify ON public.room_meetings;
CREATE TRIGGER room_meeting_changed_notify
  AFTER UPDATE OF status, scheduled_at ON public.room_meetings
  FOR EACH ROW EXECUTE FUNCTION public.notify_room_meeting_changed();

CREATE OR REPLACE FUNCTION public.send_room_meeting_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_sent integer := 0;
BEGIN
  FOR r IN
    SELECT m.id, m.project_id, k.kind, k.ntype, coalesce(m.title, p.title) AS title
    FROM public.room_meetings m
    JOIN public.projects p ON p.id = m.project_id
    CROSS JOIN LATERAL (
      SELECT 'day'::text AS kind, 'room_meeting_reminder'::text AS ntype
        WHERE m.scheduled_at >  now() + interval '1 hour'
          AND m.scheduled_at <= now() + interval '24 hours'
          AND m.created_at   <= m.scheduled_at - interval '24 hours'
      UNION ALL
      SELECT 'soon', 'room_meeting_soon'
        WHERE m.scheduled_at >  now()
          AND m.scheduled_at <= now() + interval '15 minutes'
          AND m.created_at   <= m.scheduled_at - interval '15 minutes'
      UNION ALL
      SELECT 'start', 'room_meeting_starting'
        WHERE m.scheduled_at <= now()
          AND m.scheduled_at >  now() - interval '15 minutes'
    ) k
    WHERE m.status IN ('scheduled', 'live')
      AND NOT public.room_is_closed(m.project_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.room_meeting_reminders x WHERE x.meeting_id = m.id AND x.kind = k.kind
      )
  LOOP
    INSERT INTO public.room_meeting_reminders (meeting_id, kind)
    VALUES (r.id, r.kind)
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
      INSERT INTO public.notifications (user_id, type, actor_id, target_type, target_id, preview_text)
      SELECT a.user_id, r.ntype, NULL, 'project', r.project_id, r.title
      FROM public.room_audience(r.project_id) a;
      v_sent := v_sent + 1;
    END IF;
  END LOOP;

  RETURN v_sent;
END;
$$;

REVOKE ALL ON FUNCTION public.send_room_meeting_reminders() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('room-meeting-reminders', '* * * * *', $$SELECT public.send_room_meeting_reminders();$$);
