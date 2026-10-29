-- ako_pitch_room_membership_fix.sql
-- A pitch has a private "update room" for its supporters. Two functions still wrote the old
-- room_members shape (room_id, added_at), so supporting a pitch (trigger) and creating one both errored.
-- room_members is (project_id, user_id, purchase_id, joined_at). Supporters are admitted by the
-- trigger itself, so it uses the same transaction-local marker the join RPCs use to pass the
-- room_members guard. A blacklisted supporter simply isn't added: the support still goes through.

CREATE OR REPLACE FUNCTION public.add_supporter_to_pitch_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_room_id uuid;
BEGIN
  SELECT d.linked_room_id INTO v_room_id
  FROM public.project_pitch_details d
  WHERE d.project_id = NEW.project_id;

  IF v_room_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.room_blocklist b
              WHERE b.project_id = v_room_id AND b.user_id = NEW.supporter_id) THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('ako.room_join_ok', v_room_id::text || ':' || NEW.supporter_id::text, true);
  INSERT INTO public.room_members (project_id, user_id, purchase_id)
  VALUES (v_room_id, NEW.supporter_id, NULL)
  ON CONFLICT (project_id, user_id) DO NOTHING;
  PERFORM set_config('ako.room_join_ok', '', true);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.add_supporter_to_pitch_room() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_pitch_project(
  p_title text,
  p_description text,
  p_thumbnail_url text,
  p_thumbnail_width integer,
  p_thumbnail_height integer,
  p_is_private boolean,
  p_posted_as_page_id uuid,
  p_goal_amount_usd numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_room_id uuid;
  v_pitch_id uuid;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  INSERT INTO public.projects (
    owner_id, title, description, project_type, price_usd,
    is_private, status, posted_as_page_id
  ) VALUES (
    v_owner, p_title || ' — Updates',
    'Update room for supporters of "' || p_title || '".',
    'room', 0, true, 'active', p_posted_as_page_id
  ) RETURNING id INTO v_room_id;

  -- The update room is a private community: no dates, admitted by supporting (never by request).
  INSERT INTO public.project_room_details (project_id, kind, join_mode)
  VALUES (v_room_id, 'community', 'request');

  INSERT INTO public.projects (
    owner_id, title, description, project_type, price_usd,
    thumbnail_url, thumbnail_width, thumbnail_height,
    is_private, status, posted_as_page_id
  ) VALUES (
    v_owner, p_title, p_description, 'pitch', 0,
    p_thumbnail_url, p_thumbnail_width, p_thumbnail_height,
    p_is_private, 'active', p_posted_as_page_id
  ) RETURNING id INTO v_pitch_id;

  INSERT INTO public.project_pitch_details (project_id, goal_amount_usd, linked_room_id)
  VALUES (v_pitch_id, p_goal_amount_usd, v_room_id);

  -- The creator is a member of their own update room (the owner always passes the room_members guard).
  INSERT INTO public.room_members (project_id, user_id, purchase_id)
  VALUES (v_room_id, v_owner, NULL)
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN v_pitch_id;
END;
$$;
