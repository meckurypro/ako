-- ako_rooms_membership.sql
-- Public/private rooms: request-to-join with host review, host-added members,
-- leave / remove, and a per-room blacklist for non-members.
-- Discover and search already hide projects with is_private = true.

-- Free joins (approved requests, host adds) have no purchase row.
ALTER TABLE public.room_members ALTER COLUMN purchase_id DROP NOT NULL;

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_join_requests (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  message text CHECK (message IS NULL OR char_length(message) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS room_join_requests_pending_idx
  ON public.room_join_requests (project_id, created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS room_join_requests_user_idx ON public.room_join_requests (user_id);
CREATE INDEX IF NOT EXISTS room_join_requests_decided_by_idx ON public.room_join_requests (decided_by);

CREATE TABLE IF NOT EXISTS public.room_blocklist (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS room_blocklist_user_idx ON public.room_blocklist (user_id);
CREATE INDEX IF NOT EXISTS room_blocklist_blocked_by_idx ON public.room_blocklist (blocked_by);

ALTER TABLE public.room_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_blocklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requester or host reads join requests" ON public.room_join_requests;
CREATE POLICY "requester or host reads join requests" ON public.room_join_requests
  FOR SELECT
  USING (user_id = (SELECT auth.uid()) OR public.is_room_host(project_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "host reads room blocklist" ON public.room_blocklist;
CREATE POLICY "host reads room blocklist" ON public.room_blocklist
  FOR SELECT
  USING (public.is_room_host(project_id, (SELECT auth.uid())));

-- Writes happen only through the RPCs below.
REVOKE ALL ON public.room_join_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.room_blocklist FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.room_join_requests TO authenticated;
GRANT SELECT ON public.room_blocklist TO authenticated;

-- ---------------------------------------------------------------
-- Notification types
-- ---------------------------------------------------------------
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
    'room_meeting_cancelled',
    'room_join_request','room_join_approved','room_join_declined','room_member_added','room_member_removed'
  ]::text[]));

-- ---------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.room_host_ids(p_project_id uuid)
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.owner_id FROM public.projects p WHERE p.id = p_project_id
  UNION
  SELECT pm.user_id FROM public.projects p
    JOIN public.page_members pm ON pm.page_id = p.posted_as_page_id
   WHERE p.id = p_project_id AND p.posted_as_page_id IS NOT NULL AND pm.status = 'active'
  UNION
  SELECT mo.user_id FROM public.room_moderators mo WHERE mo.project_id = p_project_id;
$$;
REVOKE ALL ON FUNCTION public.room_host_ids(uuid) FROM PUBLIC, anon, authenticated;

-- Free = nothing to pay. Paid rooms are gated by payment, not review.
CREATE OR REPLACE FUNCTION public.room_is_free(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce((SELECT coalesce(p.promo_price_usd, p.price_usd) <= 0
                     FROM public.projects p WHERE p.id = p_project_id), false);
$$;
REVOKE ALL ON FUNCTION public.room_is_free(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------
-- Join guard: blacklist always blocks; free rooms only admit people the
-- host approved/added (RPCs set a transaction-local marker); paid rooms
-- admit on purchase.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.room_members_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.room_blocklist b
              WHERE b.project_id = NEW.project_id AND b.user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'You can''t join this room' USING ERRCODE = '42501';
  END IF;

  SELECT p.owner_id INTO v_owner FROM public.projects p WHERE p.id = NEW.project_id;
  IF NEW.user_id = v_owner THEN
    RETURN NEW;
  END IF;

  IF current_setting('ako.room_join_ok', true) = NEW.project_id::text || ':' || NEW.user_id::text THEN
    RETURN NEW;
  END IF;

  IF NOT public.room_is_free(NEW.project_id) AND NEW.purchase_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'This room needs the host''s approval to join' USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.room_members_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS room_members_guard_trg ON public.room_members;
CREATE TRIGGER room_members_guard_trg
  BEFORE INSERT ON public.room_members
  FOR EACH ROW EXECUTE FUNCTION public.room_members_guard();

-- ---------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_room_join(p_project_id uuid, p_message text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_title text;
  v_private boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;

  SELECT p.title, p.is_private INTO v_title, v_private
  FROM public.projects p
  WHERE p.id = p_project_id AND p.project_type = 'room' AND p.is_active = true AND p.status = 'active';
  IF v_title IS NULL THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF public.room_is_closed(p_project_id) THEN RAISE EXCEPTION 'This room has ended'; END IF;
  IF v_private THEN RAISE EXCEPTION 'This room is private. The host adds members.'; END IF;
  IF NOT public.room_is_free(p_project_id) THEN
    RAISE EXCEPTION 'This room is paid. Join by purchasing access.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.room_blocklist WHERE project_id = p_project_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'You can''t join this room' USING ERRCODE = '42501';
  END IF;
  IF public.is_room_member(p_project_id, v_uid) OR public.is_room_host(p_project_id, v_uid) THEN
    RAISE EXCEPTION 'You''re already in this room';
  END IF;

  INSERT INTO public.room_join_requests (project_id, user_id, status, message, created_at, decided_by, decided_at)
  VALUES (p_project_id, v_uid, 'pending', nullif(btrim(p_message), ''), now(), NULL, NULL)
  ON CONFLICT (project_id, user_id) DO UPDATE
    SET status = 'pending', message = EXCLUDED.message, created_at = now(), decided_by = NULL, decided_at = NULL
    WHERE public.room_join_requests.status <> 'pending';

  IF FOUND THEN
    INSERT INTO public.notifications (user_id, type, actor_id, target_type, target_id, preview_text)
    SELECT h.user_id, 'room_join_request', v_uid, 'project', p_project_id, v_title
    FROM public.room_host_ids(p_project_id) h
    WHERE h.user_id <> v_uid;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_room_join_request(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.room_join_requests
   WHERE project_id = p_project_id AND user_id = auth.uid() AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.review_room_join_request(p_project_id uuid, p_user_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_title text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_room_host(p_project_id, v_uid) THEN
    RAISE EXCEPTION 'Only room hosts can review requests' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.room_join_requests
                  WHERE project_id = p_project_id AND user_id = p_user_id AND status = 'pending') THEN
    RAISE EXCEPTION 'No pending request from this person';
  END IF;

  SELECT p.title INTO v_title FROM public.projects p WHERE p.id = p_project_id;

  IF p_approve THEN
    IF EXISTS (SELECT 1 FROM public.room_blocklist WHERE project_id = p_project_id AND user_id = p_user_id) THEN
      RAISE EXCEPTION 'This person is blacklisted';
    END IF;
    IF public.room_is_closed(p_project_id) THEN RAISE EXCEPTION 'This room has ended'; END IF;
    PERFORM set_config('ako.room_join_ok', p_project_id::text || ':' || p_user_id::text, true);
    INSERT INTO public.room_members (project_id, user_id, purchase_id)
    VALUES (p_project_id, p_user_id, NULL)
    ON CONFLICT (project_id, user_id) DO NOTHING;
    PERFORM set_config('ako.room_join_ok', '', true);
  END IF;

  UPDATE public.room_join_requests
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'declined' END,
         decided_by = v_uid, decided_at = now()
   WHERE project_id = p_project_id AND user_id = p_user_id;

  INSERT INTO public.notifications (user_id, type, actor_id, target_type, target_id, preview_text)
  VALUES (p_user_id, CASE WHEN p_approve THEN 'room_join_approved' ELSE 'room_join_declined' END,
          v_uid, 'project', p_project_id, v_title);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_room_member(p_project_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_title text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_room_host(p_project_id, v_uid) THEN
    RAISE EXCEPTION 'Only room hosts can add members' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND project_type = 'room') THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  IF public.room_is_closed(p_project_id) THEN RAISE EXCEPTION 'This room has ended'; END IF;
  IF EXISTS (SELECT 1 FROM public.room_blocklist WHERE project_id = p_project_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'This person is blacklisted. Remove them from the blacklist first.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_users
              WHERE (blocker_id = p_user_id AND blocked_id = v_uid)
                 OR (blocker_id = v_uid AND blocked_id = p_user_id)) THEN
    RAISE EXCEPTION 'You can''t add this person';
  END IF;
  IF public.is_room_member(p_project_id, p_user_id) THEN RETURN; END IF;

  SELECT p.title INTO v_title FROM public.projects p WHERE p.id = p_project_id;

  PERFORM set_config('ako.room_join_ok', p_project_id::text || ':' || p_user_id::text, true);
  INSERT INTO public.room_members (project_id, user_id, purchase_id)
  VALUES (p_project_id, p_user_id, NULL)
  ON CONFLICT (project_id, user_id) DO NOTHING;
  PERFORM set_config('ako.room_join_ok', '', true);

  UPDATE public.room_join_requests
     SET status = 'approved', decided_by = v_uid, decided_at = now()
   WHERE project_id = p_project_id AND user_id = p_user_id AND status = 'pending';

  INSERT INTO public.notifications (user_id, type, actor_id, target_type, target_id, preview_text)
  VALUES (p_user_id, 'room_member_added', v_uid, 'project', p_project_id, v_title);
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_room(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_conversation uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND owner_id = v_uid) THEN
    RAISE EXCEPTION 'The room''s owner can''t leave it';
  END IF;

  DELETE FROM public.room_members WHERE project_id = p_project_id AND user_id = v_uid;
  DELETE FROM public.room_moderators WHERE project_id = p_project_id AND user_id = v_uid;
  DELETE FROM public.room_join_requests WHERE project_id = p_project_id AND user_id = v_uid;

  SELECT d.conversation_id INTO v_conversation
  FROM public.project_room_details d WHERE d.project_id = p_project_id;
  IF v_conversation IS NOT NULL THEN
    DELETE FROM public.conversation_participants
     WHERE conversation_id = v_conversation AND user_id = v_uid;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_room_member(
  p_project_id uuid, p_user_id uuid, p_blacklist boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_title text;
  v_conversation uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_room_host(p_project_id, v_uid) THEN
    RAISE EXCEPTION 'Only room hosts can remove members' USING ERRCODE = '42501';
  END IF;
  IF public.is_room_host(p_project_id, p_user_id) THEN
    RAISE EXCEPTION 'Hosts can''t be removed. Remove their host role first.';
  END IF;
  IF NOT public.is_room_member(p_project_id, p_user_id) THEN
    RAISE EXCEPTION 'This person isn''t a member';
  END IF;

  SELECT p.title INTO v_title FROM public.projects p WHERE p.id = p_project_id;

  DELETE FROM public.room_members WHERE project_id = p_project_id AND user_id = p_user_id;
  DELETE FROM public.room_join_requests WHERE project_id = p_project_id AND user_id = p_user_id;

  SELECT d.conversation_id INTO v_conversation
  FROM public.project_room_details d WHERE d.project_id = p_project_id;
  IF v_conversation IS NOT NULL THEN
    DELETE FROM public.conversation_participants
     WHERE conversation_id = v_conversation AND user_id = p_user_id;
  END IF;

  IF p_blacklist THEN
    INSERT INTO public.room_blocklist (project_id, user_id, blocked_by)
    VALUES (p_project_id, p_user_id, v_uid)
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO public.notifications (user_id, type, actor_id, target_type, target_id, preview_text)
  VALUES (p_user_id, 'room_member_removed', v_uid, 'project', p_project_id, v_title);
END;
$$;

-- Blacklist is for people who are not members (to remove-and-blacklist an
-- existing member, use remove_room_member(..., true)).
CREATE OR REPLACE FUNCTION public.blacklist_room_user(p_project_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_room_host(p_project_id, v_uid) THEN
    RAISE EXCEPTION 'Only room hosts can blacklist people' USING ERRCODE = '42501';
  END IF;
  IF public.is_room_host(p_project_id, p_user_id) THEN
    RAISE EXCEPTION 'You can''t blacklist a host';
  END IF;
  IF public.is_room_member(p_project_id, p_user_id) THEN
    RAISE EXCEPTION 'This person is a member. Remove them and blacklist in one step instead.';
  END IF;

  INSERT INTO public.room_blocklist (project_id, user_id, blocked_by)
  VALUES (p_project_id, p_user_id, v_uid)
  ON CONFLICT (project_id, user_id) DO NOTHING;

  DELETE FROM public.room_join_requests WHERE project_id = p_project_id AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unblacklist_room_user(p_project_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_room_host(p_project_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only room hosts can change the blacklist' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.room_blocklist WHERE project_id = p_project_id AND user_id = p_user_id;
END;
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'request_room_join(uuid, text)', 'cancel_room_join_request(uuid)',
    'review_room_join_request(uuid, uuid, boolean)', 'add_room_member(uuid, uuid)',
    'leave_room(uuid)', 'remove_room_member(uuid, uuid, boolean)',
    'blacklist_room_user(uuid, uuid)', 'unblacklist_room_user(uuid, uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;
