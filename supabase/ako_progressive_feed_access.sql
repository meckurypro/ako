-- ako_progressive_feed_access.sql
--
-- Progressive Access: a pending (restricted) account earns Feed access through its own activity,
-- via admin-editable "pathways" (rules). Manual approval by an admin keeps working (hybrid).
-- Feed access == profiles.account_status = 'approved' (existing model), so every RLS policy,
-- edge-function check and client gate keeps working unchanged.
--
-- Already applied to the Ako project as migration "ako_progressive_feed_access".

-- 1) Per-profile bookkeeping --------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS feed_unlocked_by text,
  ADD COLUMN IF NOT EXISTS feed_unlocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS feed_auto_unlock_blocked boolean NOT NULL DEFAULT false;

UPDATE public.profiles
   SET feed_unlocked_by = 'manual', feed_unlocked_at = COALESCE(reviewed_at, created_at)
 WHERE account_status = 'approved' AND feed_unlocked_by IS NULL;

-- 2) Admin-controlled profile fields: also cover the new columns, and let ONLY evaluate_feed_access
--    (which sets a transaction-local flag) flip account_status without an admin session.
CREATE OR REPLACE FUNCTION public.protect_admin_controlled_profile_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(current_setting('ako.feed_auto_unlock', true), '') = '1' then
    return new;
  end if;
  if not public.is_admin_or_moderator(auth.uid()) then
    new.account_status := old.account_status;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.is_verified := old.is_verified;
    new.feed_unlocked_by := old.feed_unlocked_by;
    new.feed_unlocked_at := old.feed_unlocked_at;
    new.feed_auto_unlock_blocked := old.feed_auto_unlock_blocked;
  end if;
  return new;
end;
$function$;

-- 3) Flag ----------------------------------------------------------------------------------------
INSERT INTO public.feature_flags (key, enabled, label, description)
VALUES ('progressive_feed_access_enabled', true, 'Progressive feed access',
  'When on, pending accounts unlock the Feed automatically by meeting any enabled pathway. Manual approval always still works.')
ON CONFLICT (key) DO NOTHING;

-- 4) Metric catalogue + pathways -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feed_access_metrics (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS public.feed_access_rules (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9_]{2,60}$'),
  name text NOT NULL,
  description text,
  pathway text NOT NULL DEFAULT 'other',
  logic text NOT NULL DEFAULT 'AND' CHECK (logic IN ('AND', 'OR')),
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.feed_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  rule_key text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feed_access_events_user_idx ON public.feed_access_events (user_id, created_at DESC);

ALTER TABLE public.feed_access_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_access_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feed_access_metrics, public.feed_access_rules, public.feed_access_events FROM anon;

DROP POLICY IF EXISTS feed_access_metrics_read ON public.feed_access_metrics;
CREATE POLICY feed_access_metrics_read ON public.feed_access_metrics FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS feed_access_rules_read ON public.feed_access_rules;
CREATE POLICY feed_access_rules_read ON public.feed_access_rules FOR SELECT TO authenticated
  USING (enabled OR public.is_admin_or_moderator((SELECT auth.uid())));
DROP POLICY IF EXISTS feed_access_rules_admin_write ON public.feed_access_rules;
CREATE POLICY feed_access_rules_admin_write ON public.feed_access_rules FOR ALL TO authenticated
  USING (public.is_admin_or_moderator((SELECT auth.uid())))
  WITH CHECK (public.is_admin_or_moderator((SELECT auth.uid())));

DROP POLICY IF EXISTS feed_access_events_admin_read ON public.feed_access_events;
CREATE POLICY feed_access_events_admin_read ON public.feed_access_events FOR SELECT TO authenticated
  USING (public.is_admin_or_moderator((SELECT auth.uid())));

INSERT INTO public.feed_access_metrics (key, label, description, sort_order) VALUES
  ('account_age_days', 'Days on Akọ', 'Whole days since the account was created.', 10),
  ('paid_book_sales', 'Paid book sales', 'Completed purchases of your paid books by other accounts.', 20),
  ('free_book_unique_viewers', 'People who opened a free book', 'Distinct accounts that opened your most-opened free book. Opening it repeatedly counts once.', 30),
  ('paid_file_sales', 'Paid file sales', 'Completed purchases of your paid files by other accounts.', 40),
  ('free_file_unique_downloaders', 'People who downloaded a free file', 'Distinct accounts that downloaded your most-downloaded free file.', 50),
  ('paid_course_sales', 'Paid course enrolments', 'Completed purchases of your paid courses by other accounts.', 60),
  ('free_course_unique_learners', 'Learners on a free course', 'Distinct accounts that accessed your most-accessed free course.', 70),
  ('event_tickets_sold', 'Event tickets sold', 'Distinct buyers of tickets to your events (refunds excluded).', 80),
  ('meeting_unique_attendees', 'Meeting attendees', 'Distinct accounts that joined or booked your most-attended meeting.', 90),
  ('media_unique_listeners', 'People who played your media', 'Distinct accounts that played or downloaded your most-played audio or video.', 100),
  ('cohorts_completed', 'Cohorts completed', 'Ended cohorts you took part in (and, where the cohort set assignments, submitted at least one).', 110),
  ('largest_group_members', 'Members in your biggest group', 'Member count of the largest group you belong to or host.', 120)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Rules must reference known metrics, use a known operator and a numeric value.
CREATE OR REPLACE FUNCTION public.feed_access_rules_validate()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE c jsonb;
BEGIN
  IF jsonb_typeof(NEW.conditions) <> 'array' OR jsonb_array_length(NEW.conditions) = 0 THEN
    RAISE EXCEPTION 'A pathway needs at least one condition';
  END IF;
  FOR c IN SELECT * FROM jsonb_array_elements(NEW.conditions) LOOP
    IF NOT EXISTS (SELECT 1 FROM public.feed_access_metrics m WHERE m.key = c->>'metric') THEN
      RAISE EXCEPTION 'Unknown metric: %', c->>'metric';
    END IF;
    IF (c->>'op') NOT IN ('>=', '>', '=', '<=', '<') THEN
      RAISE EXCEPTION 'Unknown operator: %', c->>'op';
    END IF;
    IF jsonb_typeof(c->'value') <> 'number' THEN
      RAISE EXCEPTION 'Condition value must be a number';
    END IF;
  END LOOP;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_feed_access_rules_validate ON public.feed_access_rules;
CREATE TRIGGER trg_feed_access_rules_validate BEFORE INSERT OR UPDATE ON public.feed_access_rules
  FOR EACH ROW EXECUTE FUNCTION public.feed_access_rules_validate();

-- Defaults. Numbers the founder specified: 5 paid book sales, 50 distinct free-book viewers,
-- 50-member group + 60 days on the app. Everything else is an editable starting point.
INSERT INTO public.feed_access_rules (key, name, description, pathway, logic, conditions, sort_order) VALUES
  ('writer_paid_book', 'Sell your book', 'Sell 5 copies of a paid book.', 'writer', 'AND',
    '[{"metric":"paid_book_sales","op":">=","value":5}]', 10),
  ('writer_free_book', 'Get your book read', 'A free book opened by 50 different people.', 'writer', 'AND',
    '[{"metric":"free_book_unique_viewers","op":">=","value":50}]', 20),
  ('resource_paid_file', 'Sell a file', 'Sell 3 copies of a paid file.', 'resource', 'AND',
    '[{"metric":"paid_file_sales","op":">=","value":3}]', 30),
  ('resource_free_file', 'Share a useful file', 'A free file downloaded by 25 different people.', 'resource', 'AND',
    '[{"metric":"free_file_unique_downloaders","op":">=","value":25}]', 40),
  ('course_paid', 'Teach a paid course', '3 people enrol in a paid course.', 'course', 'AND',
    '[{"metric":"paid_course_sales","op":">=","value":3}]', 50),
  ('course_free', 'Teach a free course', '25 different learners access a free course.', 'course', 'AND',
    '[{"metric":"free_course_unique_learners","op":">=","value":25}]', 60),
  ('organiser_event', 'Host an event', 'Sell 10 tickets to an event.', 'organiser', 'AND',
    '[{"metric":"event_tickets_sold","op":">=","value":10}]', 70),
  ('organiser_meeting', 'Host a meeting', 'Have 5 people join or book a meeting.', 'organiser', 'AND',
    '[{"metric":"meeting_unique_attendees","op":">=","value":5}]', 80),
  ('artist_media', 'Share your craft', 'Audio or video played by 50 different people.', 'artist', 'AND',
    '[{"metric":"media_unique_listeners","op":">=","value":50}]', 90),
  ('learner_cohort', 'Complete a cohort', 'Take part in a cohort through to its end.', 'community', 'AND',
    '[{"metric":"cohorts_completed","op":">=","value":1}]', 100),
  ('community_group_50', 'Be part of a thriving group', 'Be in a group that reaches 50 members, after 2 months on Akọ.', 'community', 'AND',
    '[{"metric":"largest_group_members","op":">=","value":50},{"metric":"account_age_days","op":">=","value":60}]', 110)
ON CONFLICT (key) DO NOTHING;

-- 5) Metric computation (internal) ---------------------------------------------------------------
-- A "valid" counted account is a live, non-declined, non-suspended, non-automated account.
CREATE OR REPLACE FUNCTION public._feed_valid_account(p_uid uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_uid AND p.is_deleted = false
                   AND p.account_status NOT IN ('declined', 'suspended'))
     AND NOT EXISTS (SELECT 1 FROM public.automated_accounts a WHERE a.user_id = p_uid);
$$;

CREATE OR REPLACE FUNCTION public.feed_metric_value(p_uid uuid, p_metric text)
 RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v numeric := 0;
BEGIN
  CASE p_metric
    WHEN 'account_age_days' THEN
      SELECT COALESCE(floor(extract(epoch FROM (now() - created_at)) / 86400), 0) INTO v
        FROM public.profiles WHERE id = p_uid;

    WHEN 'paid_book_sales', 'paid_file_sales', 'paid_course_sales' THEN
      SELECT count(*) INTO v
        FROM public.purchases pu JOIN public.projects p ON p.id = pu.project_id
       WHERE p.owner_id = p_uid
         AND p.project_type = CASE p_metric WHEN 'paid_book_sales' THEN 'book'
                                            WHEN 'paid_file_sales' THEN 'file' ELSE 'course' END
         AND pu.amount_usd > 0 AND pu.buyer_id <> p_uid AND public._feed_valid_account(pu.buyer_id);

    WHEN 'free_book_unique_viewers', 'free_course_unique_learners' THEN
      -- Distinct ACCOUNTS (never raw opens), best single project, owner and bots excluded.
      SELECT COALESCE(max(c), 0) INTO v FROM (
        SELECT count(DISTINCT e.user_id) AS c
          FROM public.project_access_events e JOIN public.projects p ON p.id = e.project_id
         WHERE p.owner_id = p_uid
           AND p.project_type = CASE p_metric WHEN 'free_book_unique_viewers' THEN 'book' ELSE 'course' END
           AND COALESCE(p.price_usd, 0) = 0
           AND e.user_id IS NOT NULL AND e.user_id <> p_uid AND public._feed_valid_account(e.user_id)
         GROUP BY e.project_id) s;

    WHEN 'free_file_unique_downloaders' THEN
      SELECT COALESCE(max(c), 0) INTO v FROM (
        SELECT project_id, count(DISTINCT uid) AS c FROM (
          SELECT e.project_id, e.user_id AS uid
            FROM public.project_access_events e
           WHERE e.access_type = 'download' AND e.user_id IS NOT NULL
          UNION
          SELECT d.project_id, d.user_id
            FROM public.project_file_downloads d WHERE d.completed_at IS NOT NULL
        ) x JOIN public.projects p ON p.id = x.project_id
         WHERE p.owner_id = p_uid AND p.project_type = 'file' AND COALESCE(p.price_usd, 0) = 0
           AND x.uid <> p_uid AND public._feed_valid_account(x.uid)
         GROUP BY project_id) s;

    WHEN 'media_unique_listeners' THEN
      SELECT COALESCE(max(c), 0) INTO v FROM (
        SELECT count(DISTINCT e.user_id) AS c
          FROM public.project_access_events e JOIN public.projects p ON p.id = e.project_id
         WHERE p.owner_id = p_uid AND p.project_type = 'media'
           AND e.user_id IS NOT NULL AND e.user_id <> p_uid AND public._feed_valid_account(e.user_id)
         GROUP BY e.project_id) s;

    WHEN 'meeting_unique_attendees' THEN
      SELECT COALESCE(max(c), 0) INTO v FROM (
        SELECT count(DISTINCT e.user_id) AS c
          FROM public.project_access_events e JOIN public.projects p ON p.id = e.project_id
         WHERE p.owner_id = p_uid AND p.project_type = 'meeting' AND e.access_type IN ('join', 'booking')
           AND e.user_id IS NOT NULL AND e.user_id <> p_uid AND public._feed_valid_account(e.user_id)
         GROUP BY e.project_id) s;

    WHEN 'event_tickets_sold' THEN
      SELECT count(DISTINCT t.buyer_id) INTO v
        FROM public.event_tickets t JOIN public.projects p ON p.id = t.project_id
       WHERE p.owner_id = p_uid AND t.refunded_at IS NULL
         AND t.buyer_id <> p_uid AND public._feed_valid_account(t.buyer_id);

    WHEN 'cohorts_completed' THEN
      SELECT count(*) INTO v
        FROM public.room_members rm
        JOIN public.projects p ON p.id = rm.project_id AND p.project_type = 'room'
        JOIN public.project_room_details d ON d.project_id = p.id
       WHERE rm.user_id = p_uid AND p.owner_id <> p_uid AND p.cancelled_at IS NULL
         AND d.kind = 'cohort' AND d.end_date IS NOT NULL AND d.end_date < now()
         AND (NOT EXISTS (SELECT 1 FROM public.assignments a WHERE a.project_id = p.id)
              OR EXISTS (SELECT 1 FROM public.assignment_submissions s
                           JOIN public.assignments a ON a.id = s.assignment_id
                          WHERE a.project_id = p.id AND s.user_id = p_uid));

    WHEN 'largest_group_members' THEN
      SELECT COALESCE(max(c), 0) INTO v FROM (
        SELECT (SELECT count(*) FROM public.room_members m2
                  JOIN public.profiles pr ON pr.id = m2.user_id AND pr.is_deleted = false
                 WHERE m2.project_id = p.id
                   AND NOT EXISTS (SELECT 1 FROM public.automated_accounts a WHERE a.user_id = m2.user_id)) AS c
          FROM public.projects p
         WHERE p.project_type = 'room' AND p.is_active = true AND p.cancelled_at IS NULL
           AND (p.owner_id = p_uid
                OR EXISTS (SELECT 1 FROM public.room_members m WHERE m.project_id = p.id AND m.user_id = p_uid))) s;

    ELSE
      v := 0;
  END CASE;
  RETURN COALESCE(v, 0);
END;
$$;

-- Evaluate one rule for one user -> jsonb with per-condition progress.
CREATE OR REPLACE FUNCTION public._feed_rule_state(p_uid uuid, r public.feed_access_rules)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  c jsonb; cur numeric; req numeric; ok boolean; ratio numeric;
  out_conds jsonb := '[]'::jsonb; all_ok boolean := true; any_ok boolean := false;
  min_ratio numeric := 1; max_ratio numeric := 0; n integer := 0; lbl text;
BEGIN
  FOR c IN SELECT * FROM jsonb_array_elements(r.conditions) LOOP
    cur := public.feed_metric_value(p_uid, c->>'metric');
    req := (c->>'value')::numeric;
    ok := CASE c->>'op' WHEN '>=' THEN cur >= req WHEN '>' THEN cur > req WHEN '=' THEN cur = req
                        WHEN '<=' THEN cur <= req WHEN '<' THEN cur < req ELSE false END;
    ratio := CASE WHEN ok THEN 1
                  WHEN c->>'op' IN ('>=', '>') AND req > 0 THEN least(cur / req, 1)
                  ELSE 0 END;
    SELECT label INTO lbl FROM public.feed_access_metrics WHERE key = c->>'metric';
    out_conds := out_conds || jsonb_build_array(jsonb_build_object(
      'metric', c->>'metric', 'label', COALESCE(lbl, c->>'metric'), 'op', c->>'op',
      'current', cur, 'required', req, 'met', ok));
    all_ok := all_ok AND ok; any_ok := any_ok OR ok;
    min_ratio := least(min_ratio, ratio); max_ratio := greatest(max_ratio, ratio); n := n + 1;
  END LOOP;
  -- AND = weakest link (no credit for the easy half), OR = best route.
  RETURN jsonb_build_object(
    'key', r.key, 'name', r.name, 'description', r.description, 'pathway', r.pathway, 'logic', r.logic,
    'met', CASE WHEN r.logic = 'OR' THEN any_ok ELSE all_ok END,
    'progress', round(CASE WHEN n = 0 THEN 0 WHEN r.logic = 'OR' THEN max_ratio ELSE min_ratio END, 3),
    'conditions', out_conds);
END;
$$;

-- Full status payload (eligibility vs. access are separate: `eligible_rule` vs `has_feed_access`).
CREATE OR REPLACE FUNCTION public._feed_access_payload(p_uid uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_gate boolean; v_prog boolean; p record; r public.feed_access_rules;
  v_rules jsonb := '[]'::jsonb; v_state jsonb; v_eligible text;
BEGIN
  SELECT COALESCE((SELECT enabled FROM public.feature_flags WHERE key = 'incubation_review_gate_enabled'), false) INTO v_gate;
  SELECT COALESCE((SELECT enabled FROM public.feature_flags WHERE key = 'progressive_feed_access_enabled'), false) INTO v_prog;
  SELECT account_status, feed_unlocked_by, feed_unlocked_at, feed_auto_unlock_blocked INTO p
    FROM public.profiles WHERE id = p_uid;
  FOR r IN SELECT * FROM public.feed_access_rules WHERE enabled ORDER BY sort_order, key LOOP
    v_state := public._feed_rule_state(p_uid, r);
    IF v_eligible IS NULL AND (v_state->>'met')::boolean THEN v_eligible := r.key; END IF;
    v_rules := v_rules || jsonb_build_array(v_state);
  END LOOP;
  RETURN jsonb_build_object(
    'gate_enabled', v_gate,
    'progressive_enabled', v_prog,
    'account_status', p.account_status,
    'has_feed_access', (NOT v_gate) OR p.account_status = 'approved',
    'unlocked_by', p.feed_unlocked_by,
    'unlocked_at', p.feed_unlocked_at,
    'auto_unlock_blocked', COALESCE(p.feed_auto_unlock_blocked, false),
    'eligible_rule', v_eligible,
    'rules', v_rules);
END;
$$;

-- Auto-unlock: flips a PENDING, non-blocked account to approved when any enabled pathway is met.
-- Never touches declined/suspended accounts and never overrides an admin's manual hold.
CREATE OR REPLACE FUNCTION public.evaluate_feed_access(p_uid uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_prof record; r public.feed_access_rules; v_state jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.feature_flags WHERE key = 'incubation_review_gate_enabled' AND enabled) THEN
    RETURN NULL;
  END IF;
  IF NOT COALESCE((SELECT enabled FROM public.feature_flags WHERE key = 'progressive_feed_access_enabled'), false) THEN
    RETURN NULL;
  END IF;

  SELECT id, account_status, feed_auto_unlock_blocked, is_deleted INTO v_prof
    FROM public.profiles WHERE id = p_uid FOR UPDATE;
  IF NOT FOUND OR v_prof.is_deleted OR v_prof.account_status <> 'pending' OR v_prof.feed_auto_unlock_blocked THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM public.automated_accounts a WHERE a.user_id = p_uid) THEN RETURN NULL; END IF;

  FOR r IN SELECT * FROM public.feed_access_rules WHERE enabled ORDER BY sort_order, key LOOP
    v_state := public._feed_rule_state(p_uid, r);
    IF (v_state->>'met')::boolean THEN
      PERFORM set_config('ako.feed_auto_unlock', '1', true);
      UPDATE public.profiles
         SET account_status = 'approved', reviewed_at = now(),
             feed_unlocked_by = 'rule:' || r.key, feed_unlocked_at = now()
       WHERE id = p_uid;
      PERFORM set_config('ako.feed_auto_unlock', '', true);
      INSERT INTO public.feed_access_events (user_id, action, rule_key, details)
      VALUES (p_uid, 'auto_unlocked', r.key, v_state);
      RETURN r.key;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

-- Client-facing: read-only status, and a refresh that also evaluates (called on app load / focus).
CREATE OR REPLACE FUNCTION public.get_my_feed_access()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  RETURN public._feed_access_payload(auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_my_feed_access()
 RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  PERFORM public.evaluate_feed_access(auth.uid());
  RETURN public._feed_access_payload(auth.uid());
END;
$$;

-- Batch sweep (cron): creators earn from other people's activity while offline.
CREATE OR REPLACE FUNCTION public.sweep_feed_access()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE u uuid; n integer := 0;
BEGIN
  FOR u IN SELECT id FROM public.profiles
            WHERE account_status = 'pending' AND is_deleted = false AND feed_auto_unlock_blocked = false LOOP
    IF public.evaluate_feed_access(u) IS NOT NULL THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END;
$$;

-- Admin: inspect any user's progress, and lift/set the manual hold.
CREATE OR REPLACE FUNCTION public.admin_get_user_feed_access(p_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_admin_or_moderator(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN public._feed_access_payload(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_feed_auto_unlock_blocked(p_user_id uuid, p_blocked boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_admin_or_moderator(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.profiles SET feed_auto_unlock_blocked = p_blocked WHERE id = p_user_id;
  INSERT INTO public.admin_audit_log (admin_id, action, target_user_id, details)
  VALUES (auth.uid(), CASE WHEN p_blocked THEN 'feed_auto_unlock_blocked' ELSE 'feed_auto_unlock_allowed' END,
          p_user_id, jsonb_build_object('blocked', p_blocked));
END;
$$;

-- 6) Manual approval stays (hybrid) and now records its source; setting an account back to pending
--    is a deliberate admin hold, so auto-unlock must not immediately undo it.
CREATE OR REPLACE FUNCTION public.admin_approve_account(p_user_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare v_prev text;
begin
  if not public.is_admin_or_moderator(auth.uid()) then raise exception 'Not authorized'; end if;
  select account_status into v_prev from public.profiles where id = p_user_id for update;
  if v_prev is null then raise exception 'User not found'; end if;
  if v_prev = 'approved' then return; end if;
  update public.profiles
     set account_status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(),
         feed_unlocked_by = 'manual', feed_unlocked_at = now(), feed_auto_unlock_blocked = false
   where id = p_user_id;
  insert into public.admin_audit_log (admin_id, action, target_user_id, details)
  values (auth.uid(), 'account_approved', p_user_id,
          jsonb_build_object('previous_status', v_prev, 'new_status', 'approved'));
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_account_pending(p_user_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare v_prev text;
begin
  if not public.is_admin_or_moderator(auth.uid()) then raise exception 'Not authorized'; end if;
  select account_status into v_prev from public.profiles where id = p_user_id for update;
  if v_prev is null then raise exception 'User not found'; end if;
  if v_prev = 'pending' then return; end if;
  update public.profiles
     set account_status = 'pending', reviewed_at = now(), reviewed_by = auth.uid(),
         feed_unlocked_by = null, feed_unlocked_at = null, feed_auto_unlock_blocked = true
   where id = p_user_id;
  insert into public.admin_audit_log (admin_id, action, target_user_id, details)
  values (auth.uid(), 'account_set_pending', p_user_id,
          jsonb_build_object('previous_status', v_prev, 'new_status', 'pending', 'auto_unlock_blocked', true));
end;
$$;

-- 7) Privileges ----------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public._feed_valid_account(uuid), public.feed_metric_value(uuid, text),
  public._feed_rule_state(uuid, public.feed_access_rules), public._feed_access_payload(uuid),
  public.evaluate_feed_access(uuid), public.sweep_feed_access() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_feed_access(), public.refresh_my_feed_access(),
  public.admin_get_user_feed_access(uuid), public.admin_set_feed_auto_unlock_blocked(uuid, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_feed_access(), public.refresh_my_feed_access(),
  public.admin_get_user_feed_access(uuid), public.admin_set_feed_auto_unlock_blocked(uuid, boolean) TO authenticated;

-- 8) Sweep every 10 minutes ----------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'feed-access-sweep') THEN
    PERFORM cron.unschedule('feed-access-sweep');
  END IF;
  PERFORM cron.schedule('feed-access-sweep', '*/10 * * * *', 'select public.sweep_feed_access()');
END $$;

-- 9) AUDIT FIX: "views" counted every open. project_access_counts is now DISTINCT ACCOUNTS
--    (owner excluded): opening a book 10 or 100 times is one view.
CREATE OR REPLACE VIEW public.project_access_counts AS
  SELECT e.project_id, count(DISTINCT e.user_id) AS access_count
    FROM public.project_access_events e
    JOIN public.projects p ON p.id = e.project_id
   WHERE e.user_id IS NOT NULL AND e.user_id <> p.owner_id
   GROUP BY e.project_id;
