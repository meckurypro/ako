-- supabase/audit_guest_exposure.sql
--
-- READ-ONLY audit: what can a signed-out (anon) visitor read about a project?
-- Run in the Supabase SQL editor. Changes nothing.
--
-- Why: the web app loads a project with `select *` (see useProjectDetail), and
-- the slug RPC returns `setof projects`, so any column anon can SELECT —
-- including file_path and external_url — is sent to a guest's browser even
-- though the UI never shows it. Hiding it is a backend change, and this repo
-- does not contain the full RLS / grant definitions, so none is attempted blind.

-- 1) Which tables are readable by anon at all (table-level grants)?
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public'
  and table_name in ('projects', 'media_details', 'book_details', 'course_details', 'event_details', 'meeting_details', 'gig_details')
order by table_name, privilege_type;

-- 2) Column-level grants for anon on projects (empty = table-level grant applies).
select column_name, privilege_type
from information_schema.column_privileges
where grantee = 'anon' and table_schema = 'public' and table_name = 'projects'
order by column_name;

-- 3) RLS policies that apply to anon on the sensitive tables.
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('projects', 'media_details', 'book_details')
  and (roles @> '{anon}' or roles @> '{public}')
order by tablename, policyname;

-- 4) Are the slug / preview functions callable by anon, and do they run as definer?
select p.proname, p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'execute') as anon_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('resolve_project_slug');

-- 5) Do private / draft projects come back to anon? (expect 0 rows for both)
set local role anon;
select count(*) as private_visible_to_anon from public.projects where is_private;
select count(*) as non_active_visible_to_anon from public.projects where status <> 'active';
reset role;
