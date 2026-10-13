-- Restricted (pending) accounts are now allowed INTO the app as
-- consumers (browse/buy/wallet) — the client hides Feed + create
-- surfaces silently. Because they are no longer stopped at the
-- Under Review screen, writes must be refused server-side too.
-- fn_can_access_feature(...) returns TRUE for approved users and
-- whenever the incubation gate is off, so nothing changes for them.

-- 1) Posts: direct inserts require probational_post_enabled for pending users.
ALTER POLICY "Users can create their own posts" ON public.posts
  WITH CHECK (
    (( SELECT auth.uid() AS uid) = author_id)
    AND public.fn_can_access_feature('probational_post_enabled', ( SELECT auth.uid() AS uid))
  );

-- 2) Projects: creation requires probational_create_project_enabled for pending users.
ALTER POLICY "projects_insert_page_membership_check" ON public.projects
  WITH CHECK (
    (owner_id = ( SELECT auth.uid() AS uid))
    AND public.fn_can_access_feature('probational_create_project_enabled', ( SELECT auth.uid() AS uid))
    AND (
      (posted_as_page_id IS NULL)
      OR EXISTS (
        SELECT 1 FROM page_members pm
        WHERE pm.page_id = projects.posted_as_page_id
          AND pm.user_id = ( SELECT auth.uid() AS uid)
          AND pm.status = 'active'::text
      )
    )
  );

-- 3) Pages: only fully approved accounts (or gate off) may create a page.
CREATE OR REPLACE FUNCTION public.create_page(p_page_type text, p_name text, p_username text, p_role_label text, p_bio text DEFAULT NULL::text, p_tagline text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_parent_organization_id uuid DEFAULT NULL::uuid)
 RETURNS pages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_page public.pages;
  v_elig record;
  v_pages_enabled boolean;
  v_subsidiaries_enabled boolean;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  if not public.fn_can_access_app(auth.uid()) then
    raise exception 'Page creation is not available for this account';
  end if;

  if p_page_type not in ('organization', 'brand', 'product') then
    raise exception 'page_type must be organization, brand, or product';
  end if;

  select enabled into v_pages_enabled from public.feature_flags where key = 'pages_creation_enabled';
  if coalesce(v_pages_enabled, true) is false then
    raise exception 'Page creation is temporarily disabled';
  end if;

  if p_parent_organization_id is not null then
    select enabled into v_subsidiaries_enabled from public.feature_flags where key = 'subsidiaries_enabled';
    if coalesce(v_subsidiaries_enabled, true) is false then
      raise exception 'Subsidiary creation is temporarily disabled';
    end if;
  end if;

  select * into v_elig from public.get_page_creation_eligibility();

  if not v_elig.allowed then
    raise exception 'You need at least % posts in the last 30 days (you have %), % distinct engaged posts in the last 30 days (you have %), and an account at least % days old (yours is %) to create a page.',
      v_elig.posts_required, v_elig.posts_30d, v_elig.distinct_engaged_required, v_elig.distinct_engaged_30d, v_elig.account_age_required, v_elig.account_age_days;
  end if;

  insert into public.pages (page_type, name, username, bio, tagline, avatar_url, category_id, parent_organization_id, created_by)
  values (p_page_type, p_name, lower(p_username), p_bio, p_tagline, p_avatar_url, p_category_id, p_parent_organization_id, auth.uid())
  returning * into v_page;

  insert into public.page_members (page_id, user_id, role_label, is_admin, status, invited_by, responded_at)
  values (v_page.id, auth.uid(), p_role_label, true, 'active', auth.uid(), now());

  return v_page;
end;
$function$;
