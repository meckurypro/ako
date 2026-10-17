-- ako_book_ocr.sql
--
-- OCR for scanned / image-only PDF books, so they can reflow like any other book.
-- The `ocr-book-pdf` edge function reads the PDF page by page through an OCR provider, keeps each batch here (so a
-- long book survives the edge time limit and can resume), then writes the result into book_chapters and clears it.
--
--   book_ocr_jobs   one row per book: progress the owner's app polls. Owner can read; only the function writes.
--   book_ocr_pages  raw OCR text while a job runs. NO client access at all: it is unreviewed text that must never
--                   bypass book_chapters' purchase / allow_read_in_app gate.

begin;

create table if not exists public.book_ocr_jobs (
  project_id     uuid primary key references public.projects(id) on delete cascade,
  owner_id       uuid not null,
  status         text not null check (status in ('running', 'done', 'failed')),
  total_pages    integer not null check (total_pages > 0),
  next_page      integer not null default 0,
  chapters_count integer,
  error_code     text,
  lease_until    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists book_ocr_jobs_owner_running_idx
  on public.book_ocr_jobs (owner_id) where status = 'running';

alter table public.book_ocr_jobs enable row level security;

drop policy if exists "book_ocr_jobs_select_owner" on public.book_ocr_jobs;
create policy "book_ocr_jobs_select_owner"
  on public.book_ocr_jobs for select
  using (owner_id = (select auth.uid()));

revoke insert, update, delete on public.book_ocr_jobs from anon, authenticated;
revoke all on public.book_ocr_jobs from anon;

create table if not exists public.book_ocr_pages (
  project_id uuid not null references public.projects(id) on delete cascade,
  page_index integer not null check (page_index >= 0),
  markdown   text not null default '',
  primary key (project_id, page_index)
);

alter table public.book_ocr_pages enable row level security;
revoke all on public.book_ocr_pages from anon, authenticated;

commit;
