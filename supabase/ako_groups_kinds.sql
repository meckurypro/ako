-- ako_groups_kinds.sql
-- Groups: one entity (projects.project_type = 'room'), two kinds: cohort | community.
-- Already applied to the Ako project as migration "ako_groups_kinds".
ALTER TABLE public.project_room_details
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'community',
  ADD COLUMN IF NOT EXISTS join_mode text NOT NULL DEFAULT 'request';

ALTER TABLE public.project_room_details DROP CONSTRAINT IF EXISTS project_room_details_kind_check;
ALTER TABLE public.project_room_details ADD CONSTRAINT project_room_details_kind_check CHECK (kind IN ('cohort', 'community'));
ALTER TABLE public.project_room_details DROP CONSTRAINT IF EXISTS project_room_details_join_mode_check;
ALTER TABLE public.project_room_details ADD CONSTRAINT project_room_details_join_mode_check CHECK (join_mode IN ('open', 'request'));
ALTER TABLE public.project_room_details DROP CONSTRAINT IF EXISTS project_room_details_community_no_dates;
ALTER TABLE public.project_room_details ADD CONSTRAINT project_room_details_community_no_dates
  CHECK (kind = 'cohort' OR (start_date IS NULL AND end_date IS NULL));

CREATE OR REPLACE FUNCTION public.room_kind(p_project_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT d.kind FROM public.project_room_details d WHERE d.project_id = p_project_id;
$$;

-- A group's kind is fixed at creation.
CREATE OR REPLACE FUNCTION public.room_kind_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.kind IS DISTINCT FROM OLD.kind THEN
    RAISE EXCEPTION 'A group''s type can''t be changed after it is created';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_room_kind_immutable ON public.project_room_details;
CREATE TRIGGER trg_room_kind_immutable BEFORE UPDATE OF kind ON public.project_room_details
  FOR EACH ROW EXECUTE FUNCTION public.room_kind_immutable();

-- Assignments belong to cohorts only.
CREATE OR REPLACE FUNCTION public.assignments_cohort_only()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF public.room_kind(NEW.project_id) IS DISTINCT FROM 'cohort' THEN
    RAISE EXCEPTION 'Assignments are only available in cohorts';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_assignments_cohort_only ON public.assignments;
CREATE TRIGGER trg_assignments_cohort_only BEFORE INSERT ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.assignments_cohort_only();

-- Open communities: join in one tap (no host review). Paid and private groups never use this.
CREATE OR REPLACE FUNCTION public.join_open_room(p_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_title text;
  v_private boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  SELECT p.title, p.is_private INTO v_title, v_private
  FROM public.projects p
  WHERE p.id = p_project_id AND p.project_type = 'room' AND p.is_active = true AND p.status = 'active';
  IF v_title IS NULL THEN RAISE EXCEPTION 'Group not found'; END IF;
  IF v_private THEN RAISE EXCEPTION 'This group is private. The host adds members.'; END IF;
  IF NOT public.room_is_free(p_project_id) THEN RAISE EXCEPTION 'This group is paid. Join by purchasing access.'; END IF;
  IF coalesce(public.room_kind(p_project_id), 'community') <> 'community'
     OR NOT EXISTS (SELECT 1 FROM public.project_room_details d WHERE d.project_id = p_project_id AND d.join_mode = 'open') THEN
    RAISE EXCEPTION 'A host reviews every request to join this group.';
  END IF;
  IF public.room_is_closed(p_project_id) THEN RAISE EXCEPTION 'This group has ended'; END IF;
  IF EXISTS (SELECT 1 FROM public.room_blocklist WHERE project_id = p_project_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'You can''t join this group' USING ERRCODE = '42501';
  END IF;
  IF public.is_room_member(p_project_id, v_uid) OR public.is_room_host(p_project_id, v_uid) THEN RETURN; END IF;

  PERFORM set_config('ako.room_join_ok', p_project_id::text || ':' || v_uid::text, true);
  INSERT INTO public.room_members (project_id, user_id, purchase_id)
  VALUES (p_project_id, v_uid, NULL)
  ON CONFLICT (project_id, user_id) DO NOTHING;
  PERFORM set_config('ako.room_join_ok', '', true);
END;
$$;
REVOKE ALL ON FUNCTION public.join_open_room(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_open_room(uuid) TO authenticated;

-- What a non-member may see on a group's landing page.
CREATE OR REPLACE FUNCTION public.get_group_public_info(p_project_id uuid)
RETURNS TABLE (kind text, join_mode text, start_date timestamptz, end_date timestamptz, member_count integer, is_closed boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT d.kind, d.join_mode, d.start_date, d.end_date,
         (SELECT count(*)::int FROM (
            SELECT rm.user_id FROM public.room_members rm WHERE rm.project_id = p_project_id
            UNION SELECT p.owner_id FROM public.projects p WHERE p.id = p_project_id AND p.owner_id IS NOT NULL) x),
         (d.end_date IS NOT NULL AND now() > d.end_date)
  FROM public.project_room_details d
  JOIN public.projects p ON p.id = d.project_id
  WHERE d.project_id = p_project_id AND p.project_type = 'room' AND p.is_active = true
    AND (NOT coalesce(p.is_private, false)
         OR public.is_room_host(p_project_id, (SELECT auth.uid()))
         OR public.is_room_member(p_project_id, (SELECT auth.uid())));
$$;
GRANT EXECUTE ON FUNCTION public.get_group_public_info(uuid) TO anon, authenticated;

-- Profile privacy: listing groups on a profile is opt-in; private groups are never listed.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_groups_on_profile boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_profile_groups(p_profile_id uuid)
RETURNS TABLE (project_id uuid, title text, slug text, kind text, role text, thumbnail_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_viewer uuid := auth.uid();
  v_show boolean;
  v_private boolean;
BEGIN
  SELECT pr.show_groups_on_profile, pr.is_private INTO v_show, v_private
  FROM public.profiles pr WHERE pr.id = p_profile_id AND coalesce(pr.is_deleted, false) = false;
  IF NOT coalesce(v_show, false) THEN RETURN; END IF;
  IF v_viewer IS DISTINCT FROM p_profile_id THEN
    IF coalesce(v_private, false) AND NOT EXISTS (
         SELECT 1 FROM public.follows f WHERE f.follower_id = v_viewer AND f.following_id = p_profile_id) THEN
      RETURN;
    END IF;
    IF v_viewer IS NOT NULL AND EXISTS (
         SELECT 1 FROM public.blocked_users b
          WHERE (b.blocker_id = v_viewer AND b.blocked_id = p_profile_id)
             OR (b.blocker_id = p_profile_id AND b.blocked_id = v_viewer)) THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  WITH mine AS (
    SELECT p.id AS pid, 'creator'::text AS r, 1 AS rnk FROM public.projects p
      WHERE p.owner_id = p_profile_id AND p.project_type = 'room' AND p.posted_as_page_id IS NULL
    UNION ALL
    SELECT mo.project_id, 'host', 2 FROM public.room_moderators mo WHERE mo.user_id = p_profile_id
    UNION ALL
    SELECT rm.project_id, 'member', 3 FROM public.room_members rm WHERE rm.user_id = p_profile_id
  ), best AS (
    SELECT DISTINCT ON (m.pid) m.pid, m.r, m.rnk FROM mine m ORDER BY m.pid, m.rnk
  )
  SELECT p.id, p.title, p.slug, d.kind, b.r, p.thumbnail_url
  FROM best b
  JOIN public.projects p ON p.id = b.pid AND p.project_type = 'room' AND p.is_active = true
       AND p.status = 'active' AND NOT coalesce(p.is_private, false)
  JOIN public.project_room_details d ON d.project_id = p.id
  ORDER BY b.rnk, p.title;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_groups(uuid) TO anon, authenticated;
