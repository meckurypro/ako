-- supabase/ako_book_reviews.sql
-- Book reviews: readers rate and review a book from the reader; signed-in users see them on the
-- project page. Already applied to the Ako Temp project (migration "book_reviews"). Safe to re-run
-- for tables and functions; the policy and trigger statements assume a first run.
create table if not exists public.book_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text check (review_text is null or char_length(review_text) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, reviewer_id)
);

create index if not exists book_reviews_project_created_idx on public.book_reviews (project_id, created_at desc);

alter table public.book_reviews enable row level security;

-- Who may review: a reader of a book, never its owner, and only someone who can actually open it
-- (bought it, or it is a free, published book they can see). Mirrors book_chapters_select_gated.
create or replace function public.can_review_book(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from projects p
    where p.id = p_project_id
      and p.project_type = 'book'
      and p.owner_id <> auth.uid()
      and (
        exists (select 1 from purchases pu where pu.project_id = p.id and pu.buyer_id = auth.uid())
        or (
          p.status = 'active' and p.published_at is not null
          and coalesce(p.promo_price_usd, p.price_usd) <= 0
          and (p.is_private = false or exists (select 1 from project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()))
        )
      )
  );
$$;
revoke all on function public.can_review_book(uuid) from public, anon;
grant execute on function public.can_review_book(uuid) to authenticated;

create policy "signed-in users read book reviews" on public.book_reviews
  for select to authenticated using (true);

create policy "readers add their book review" on public.book_reviews
  for insert to authenticated
  with check (reviewer_id = (select auth.uid()) and public.can_review_book(project_id));

create policy "readers edit their book review" on public.book_reviews
  for update to authenticated
  using (reviewer_id = (select auth.uid()))
  with check (reviewer_id = (select auth.uid()) and public.can_review_book(project_id));

create policy "readers delete their book review" on public.book_reviews
  for delete to authenticated using (reviewer_id = (select auth.uid()));

create or replace function public.touch_book_review_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists book_reviews_touch on public.book_reviews;
create trigger book_reviews_touch before update on public.book_reviews
  for each row execute function public.touch_book_review_updated_at();

-- Average and count without shipping every row to the client.
create or replace function public.book_rating_summary(p_project_id uuid)
returns table (average numeric, review_count integer)
language sql
stable
security invoker
set search_path = public
as $$
  select round(avg(rating)::numeric, 2), count(*)::integer from book_reviews where project_id = p_project_id;
$$;
revoke all on function public.book_rating_summary(uuid) from public, anon;
grant execute on function public.book_rating_summary(uuid) to authenticated;

revoke all on public.book_reviews from anon;
