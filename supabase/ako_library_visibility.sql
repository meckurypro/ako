-- ako_library_visibility.sql
-- Library / Connect: every project a person has access to is listed automatically (purchase, ticket, free open);
-- this adds the missing read rule that made free opens invisible, and the per-user "remove from list" opt-out.

-- 1) A user can read their OWN access events. Before this only the project owner could, so the Library's
--    "free projects I opened" query and the once-per-user dedupe check both silently saw zero rows.
drop policy if exists "read own access events" on public.project_access_events;
create policy "read own access events" on public.project_access_events
  for select using (user_id = (select auth.uid()));

-- 2) "Remove from my Library / Connect": a per-user, per-project hide. Access itself (purchase, ticket, free
--    access event) is untouched; this only decides whether the project is listed on those pages.
create table if not exists public.project_library_removals (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  removed_at timestamptz not null default now(),
  primary key (user_id, project_id)
);
alter table public.project_library_removals enable row level security;

drop policy if exists "read own library removals" on public.project_library_removals;
create policy "read own library removals" on public.project_library_removals
  for select using (user_id = (select auth.uid()));
drop policy if exists "insert own library removals" on public.project_library_removals;
create policy "insert own library removals" on public.project_library_removals
  for insert with check (user_id = (select auth.uid()));
drop policy if exists "delete own library removals" on public.project_library_removals;
create policy "delete own library removals" on public.project_library_removals
  for delete using (user_id = (select auth.uid()));

grant select, insert, delete on public.project_library_removals to authenticated;
