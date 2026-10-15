-- Reader bookmarks for authored (text) books.
-- One row per bookmarked spot: a chapter + how far down it (0..1), plus a
-- short snippet of the text at that spot so the Bookmarks list reads like
-- Apple Books ("chapter title / date / location").
create table if not exists public.book_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  chapter_id uuid not null references public.book_chapters(id) on delete cascade,
  scroll_fraction numeric not null default 0 check (scroll_fraction >= 0 and scroll_fraction <= 1),
  snippet text,
  created_at timestamptz not null default now()
);

create index if not exists book_bookmarks_user_project_idx
  on public.book_bookmarks (user_id, project_id, created_at desc);

alter table public.book_bookmarks enable row level security;

drop policy if exists "book_bookmarks_select_own" on public.book_bookmarks;
create policy "book_bookmarks_select_own" on public.book_bookmarks
  for select using (user_id = auth.uid());

drop policy if exists "book_bookmarks_insert_own" on public.book_bookmarks;
create policy "book_bookmarks_insert_own" on public.book_bookmarks
  for insert with check (user_id = auth.uid());

drop policy if exists "book_bookmarks_delete_own" on public.book_bookmarks;
create policy "book_bookmarks_delete_own" on public.book_bookmarks
  for delete using (user_id = auth.uid());
