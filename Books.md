# Handoff: "Book" project type for Ako (meckurypro/ako)

You're continuing work started in a previous session. Read this whole
document before touching anything. It contains full context, every
file's current intended content, and an exact task list.

## 0. Critical process note — READ THIS FIRST

**This repo is being actively developed in parallel by the human,
concurrently with this work.** Twice already in this project, dozens
of new commits (70, then 31, then 5) landed on `origin/main` between
turns — including edits to the *exact same files* this feature
touches (`useProjects.ts`, `useProjectTypeDetails.ts`,
`CreateProject.tsx`, `EditProject.tsx`, `ProjectCard.tsx`, `App.tsx`),
because a `pitch` project type and Room/Compose features were being
built at the same time.

**Before writing anything, and before finishing this session:**
1. `git fetch origin && git log --oneline HEAD..origin/main` — check
   if you're behind.
2. If you are, and you have local uncommitted changes:
   `git stash push -u -m "book-feature-wip"` (the `-u` includes new
   untracked files like new hooks/pages, but not `.gitignore`d dirs).
3. `git pull origin main`
4. `git stash pop` — resolve any conflicts by **keeping both sides**
   (this feature and whatever landed upstream are almost always
   additive, not actually contradictory — see "Conflict resolution
   pattern" below).
5. Verify with `git fetch && git log --oneline HEAD..origin/main`
   again before you consider the session done. Assume more commits
   may land while you work — check again before your final answer.

**Never blindly `git checkout` or overwrite a file wholesale** if it
has upstream changes you haven't looked at. Always diff/read first.

**There is no `.gitignore` in this repo.** `node_modules/` is
untracked but NOT ignored — never run `git add -A` or `git add .`;
stage files explicitly, or you'll stage the entire dependency tree.

### Conflict resolution pattern (this repo, this session)
Every conflict so far has had the same shape: upstream added a new
project type or feature (`pitch`, `room`) with a code block in a
list/union/switch; this feature (`book`) added its own adjacent code
block in the same list/union/switch. **The fix is almost always to
keep both blocks, one after the other** — not to pick a side. E.g.:
```
<<<<<<< Updated upstream
  | "pitch";
=======
  | "book";
>>>>>>> Stashed changes
```
becomes:
```
  | "pitch"
  | "book";
```
The two exceptions found so far:
- A genuinely duplicated trailing code fragment from a bad manual
  merge (caught by re-reading the result and checking brace balance
  with a quick `node -e` snippet — see below).
- One real **pre-existing upstream bug**: `useProjects.ts` was
  missing the `export interface UpdateProjectInput {` header line
  entirely (confirmed via `git show HEAD:src/hooks/useProjects.ts` —
  not something this session's merge caused). It may already be
  fixed upstream by the time you read this — check before
  re-applying the fix.

**After every conflict resolution, before moving on:**
```bash
grep -n "^<<<<<<<\|^=======\|^>>>>>>>" <file>   # must be empty
node -e "const fs=require('fs');const s=fs.readFileSync('<file>','utf8');let d=0;for(const c of s){if(c==='{')d++;if(c==='}')d--;}console.log(d);"
# must print 0
```
Then, once ALL files are resolved:
```bash
npx tsc --noEmit -p tsconfig.app.json
```
(Note: `npx tsc --noEmit` alone at the repo root does NOT work — the
root `tsconfig.json` only has `references`, no `files`. You must
point at `tsconfig.app.json` explicitly, or use `npx tsc -b`.)


## 1. What we're building — full feature spec

A new project type, **`book`**, for books and articles, on top of
the existing `projects` table + per-type "details" table pattern
already used by `event`/`media`/`gig`/etc.

A book/article can be delivered three different ways, chosen once at
creation via `content_source` and never changed after (same rigidity
as `project_type` itself):

1. **`link`** — an external URL. "Open link" redirects the reader
   elsewhere, same UX as the existing `url` project type. Nothing
   hosted here.
2. **`upload`** — a PDF uploaded to the existing private `private-content`
   Supabase Storage bucket (same bucket File/Media already use). The
   host independently toggles `allow_download` and `allow_read_in_app`
   — either, both, or (mid-draft) neither. Read-in-app renders the
   actual PDF pages as images via `pdf.js` (`pdfjs-dist`, already
   `npm install`ed — see §5), in an Apple-Books-styled full-screen
   reader: tap zones (left third = prev page, right third = next,
   middle = toggle chrome), swipe support, light/sepia/dark themes
   applied as CSS filters on the canvas (this is the standard "PDF
   night mode" trick — `invert(0.92) hue-rotate(180deg) brightness(0.92)`
   for dark, `sepia(0.35)` for sepia — since a PDF page is a raster
   image, not real text, themes can't recolor it directly), a
   brightness slider, and resumable position (saved server-side,
   debounced ~900ms, not on every page turn).
3. **`authored`** — built entirely inside Ako, chapter by chapter, in
   a Course-builder-style flow. This sidesteps OCR entirely: since
   the host typed the text directly, it's already structured data, so
   the in-app reader can be genuinely reflowable (adjustable font
   size, real text, no raster-image limitations) — arguably a *better*
   reading experience than the PDF path, "for free". A book created
   this way starts as a `draft` (exactly like `course` does) and is
   built via a `/books/:id` builder page before publishing; it can't
   be bought until published.

   The builder supports:
   - A **cover image** — reuses the existing `projects.thumbnail_url`
     column (no new column needed), just uploaded via the existing
     `useUploadProjectThumbnail` hook at a book-cover aspect ratio
     (2:3) instead of File/Event's usual 16:9.
   - A freely-addable, freely-orderable list of **chapters** (like
     Course lessons, but flattened — no "module" nesting layer).
   - Optional **named front/back-matter sections** — Dedication,
     Foreword, Preface, Introduction, Prologue, Epilogue, Afterword,
     Acknowledgments, About the Author, Appendix — offered as
     "add a section" toggles: adding one in is "turning it on",
     deleting it is "turning it off". Each has a short placeholder
     hint text shown while writing it (the human's spec: "the app
     will give them the template to follow").
   - The reader (for non-owners with access) gets a table-of-contents
     view, then a full-screen reflowable text view per
     chapter/section with Previous/Next chapter navigation, a
     settings sheet (theme: light/sepia/dark; font size slider), and
     resumable position saved as `(current_chapter_id, scroll_fraction)`.

**Attribution** (applies to all three content_source values equally):
A host can publish a book/article they didn't write, crediting the
real author via `is_own_work = false` + `author_name` +
optional `source_credit` (e.g. "Originally published by Acme Press,
shared with permission"). **Per explicit product requirement, a book
credited to someone else can never be sold** — this is enforced in
three places, not just one:
- Client-side: the price input is `disabled` and forced to `"0"`
  the moment `is_own_work` becomes `false`, in both CreateProject and
  EditProject.
- Server-side, belt-and-suspenders: a Postgres trigger on
  `project_book_details` (fires on the details row) AND a second
  trigger on `projects` itself (fires if someone tries to raise the
  price *after* the fact) — both raise an exception. See the
  migration SQL in §2.

**Book vs Article**: `book_type` is a cosmetic classification
(`'book' | 'article'`) shown as a badge, no functional difference.


## 2. Database migration — brand new file, apply as-is

Path: `supabase/ako_projects_v9_book_type.sql` (this repo checks
migration SQL into `supabase/`, per the naming convention documented
in `README.md` — e.g. `ako_projects_v8_pitch.sql` for the pitch
feature). **This file has NOT been applied to the live Supabase
project** — the human said "no need to connect Supabase... when you
write edge function, paste it here" — i.e. they will run this SQL
themselves. Create this file verbatim (it's net-new, can't conflict
with anything) and present it, but do not attempt to execute it
against any database.

```sql
-- ako_projects_v9_book_type.sql
--
-- Adds a new project type: 'book' (books and articles), in three
-- flavors — content_source mirrors the existing audio/video
-- link-or-upload split on project_media_details:
--
--   'link'     — external_url only. "Open link" redirects the reader
--                elsewhere. No file hosted here at all.
--   'upload'   — file_path only (existing private-content bucket,
--                same as File/Media uploads). The creator chooses,
--                per project, whether visitors can allow_download,
--                allow_read_in_app (PDF page-image reader), or both.
--   'authored' — built entirely inside Akọ, chapter by chapter, in a
--                Course-builder-style flow (book_chapters below). No
--                PDF at all — read in-app as reflowable text, which
--                sidesteps OCR entirely since the text is already
--                structured data the host typed in.
--
-- Attribution: a host can publish a book/article they didn't write,
-- crediting the real author (author_name, source_credit) via
-- is_own_work = false, regardless of content_source. Per product
-- requirement, a book/article published this way can never carry a
-- nonzero price — enforced below with a trigger, not just client-side.
--
-- Cover image: reuses projects.thumbnail_url/width/height — no new
-- column. The Book builder just uploads to that same field via the
-- existing useUploadProjectThumbnail hook, at a book-cover aspect
-- ratio instead of File/Event's usual 16:9.

begin;

-- 1. Allow 'book' as a project_type ------------------------------------

alter table public.projects
  drop constraint if exists projects_project_type_check;

alter table public.projects
  add constraint projects_project_type_check
  check (project_type = any (array[
    'event'::text, 'media'::text, 'file'::text, 'course'::text,
    'room'::text, 'meeting'::text, 'url'::text, 'gig'::text, 'book'::text
  ]));

-- 2. project_book_details ------------------------------------------------

create table public.project_book_details (
  project_id uuid not null,
  book_type text not null default 'book'::text
    check (book_type = any (array['book'::text, 'article'::text])),

  content_source text not null default 'upload'::text
    check (content_source = any (array['link'::text, 'upload'::text, 'authored'::text])),

  -- Attribution — applies regardless of content_source.
  author_name text check (char_length(author_name) <= 120),
  is_own_work boolean not null default true,
  -- Only meaningful (and only shown) when is_own_work = false — credit
  -- to the real author/original publisher, e.g. "Originally published
  -- by Acme Press, shared with permission."
  source_credit text check (char_length(source_credit) <= 280),

  -- 'link' / 'upload' content. Both null when content_source = 'authored'.
  external_url text,
  file_path text,

  -- Only meaningful when content_source = 'upload'.
  allow_download boolean not null default false,
  allow_read_in_app boolean not null default true,

  -- Filled in client-side after upload (via pdf.js metadata) purely
  -- for display (e.g. "312 pages") before anyone has opened the
  -- reader yet. For 'authored' books this is instead the chapter
  -- count, kept in sync by the builder. Not authoritative for actual
  -- reading progress either way — book_reading_progress is.
  page_count integer check (page_count is null or page_count > 0),

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint project_book_details_pkey primary key (project_id),
  constraint project_book_details_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete cascade,
  constraint project_book_details_content_matches_source check (
    (content_source = 'authored' and external_url is null and file_path is null)
    or (content_source = 'link' and external_url is not null)
    or (content_source = 'upload' and file_path is not null)
  )
);

-- Publicly readable, same as project_event_details / project_gig_details
-- / project_media_details — this is browsing info shown before anyone
-- unlocks the book. file_path is a private-bucket storage path, not a
-- usable URL on its own (same safety property as projects.file_path
-- and project_media_details.*_file_path) — only get-project-file
-- (service role) turns it into a signed, time-limited URL after
-- checking access.
alter table public.project_book_details enable row level security;

create policy "project_book_details_select_all"
  on public.project_book_details for select
  using (true);

create policy "project_book_details_owner_write"
  on public.project_book_details for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_book_details.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_book_details.project_id
        and p.owner_id = auth.uid()
    )
  );

-- Enforce "credited work can't be monetised" server-side, not just in
-- the CreateProject/EditProject/BookBuilder forms. Fires whenever the
-- details row says is_own_work = false, checking the linked project's
-- price.
create or replace function public.enforce_book_no_monetization()
returns trigger as $$
begin
  if new.is_own_work = false then
    if exists (
      select 1 from public.projects p
      where p.id = new.project_id
        and (p.price_usd <> 0 or p.promo_price_usd is not null)
    ) then
      raise exception 'A book/article credited to another author cannot be sold — price must be 0.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_enforce_book_no_monetization on public.project_book_details;
create trigger trg_enforce_book_no_monetization
  before insert or update on public.project_book_details
  for each row execute function public.enforce_book_no_monetization();

-- Mirror check the other direction: if someone later tries to raise
-- the price on a project whose book details are already marked
-- is_own_work = false, block that too.
create or replace function public.enforce_book_price_change()
returns trigger as $$
begin
  if new.project_type = 'book' and (new.price_usd <> 0 or new.promo_price_usd is not null) then
    if exists (
      select 1 from public.project_book_details d
      where d.project_id = new.id and d.is_own_work = false
    ) then
      raise exception 'A book/article credited to another author cannot be sold — price must be 0.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_enforce_book_price_change on public.projects;
create trigger trg_enforce_book_price_change
  before update of price_usd, promo_price_usd on public.projects
  for each row execute function public.enforce_book_price_change();

-- updated_at bookkeeping, same convention as other detail tables that
-- carry it (wallets, pages, etc).
create or replace function public.touch_project_book_details_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_project_book_details on public.project_book_details;
create trigger trg_touch_project_book_details
  before update on public.project_book_details
  for each row execute function public.touch_project_book_details_updated_at();

-- 3. book_chapters ---------------------------------------------------------
--
-- Only populated when content_source = 'authored'. Mirrors
-- course_modules/course_lessons but flattened to one level — a book
-- doesn't need the module/lesson nesting a course does, just an
-- ordered list the host can freely add to (kind = 'chapter'), plus
-- optional named front/back-matter sections the builder offers as
-- toggles (add one in = turn it on, remove it = turn it off).

create table public.book_chapters (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  kind text not null default 'chapter'::text
    check (kind = any (array[
      'dedication'::text, 'foreword'::text, 'preface'::text,
      'introduction'::text, 'prologue'::text, 'chapter'::text,
      'epilogue'::text, 'afterword'::text, 'acknowledgments'::text,
      'about_author'::text, 'appendix'::text
    ])),
  title text not null check (char_length(title) <= 120),
  content text,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint book_chapters_pkey primary key (id),
  constraint book_chapters_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete cascade
);

alter table public.book_chapters enable row level security;

-- Gated the same way README.md documents course_lessons being gated
-- ("only readable by the owner or a buyer, with no public syllabus
-- preview yet") — actual chapter TEXT is paid content, not browsing
-- metadata, so this is NOT a public-read policy like the tables
-- above. Re-derives the same access rule ProjectCard computes
-- client-side (owner OR purchased OR (free AND not privacy-blocked))
-- in SQL so it holds even if the client is bypassed. If your actual
-- course_lessons policy differs from this (e.g. also checks
-- room_members-style access), adjust this one to match — this is a
-- best-effort mirror, not a copy of ground truth I could read.
create policy "book_chapters_select_gated"
  on public.book_chapters for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = book_chapters.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.purchases pu
            where pu.project_id = p.id and pu.buyer_id = auth.uid()
          )
          or (
            coalesce(p.promo_price_usd, p.price_usd) = 0
            and (
              not p.is_private
              or exists (
                select 1 from public.project_members pm
                where pm.project_id = p.id and pm.user_id = auth.uid()
              )
            )
          )
        )
    )
  );

create policy "book_chapters_owner_write"
  on public.book_chapters for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = book_chapters.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = book_chapters.project_id and p.owner_id = auth.uid()
    )
  );

create or replace function public.touch_book_chapters_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_book_chapters on public.book_chapters;
create trigger trg_touch_book_chapters
  before update on public.book_chapters
  for each row execute function public.touch_book_chapters_updated_at();

-- 4. book_reading_progress ------------------------------------------------
--
-- One row per (user, book project), regardless of content_source.
-- PDF-mode books (link/upload, read via the page-image reader) use
-- current_page/total_pages; authored books (reflowable text reader)
-- use current_chapter_id/scroll_fraction instead. Written by the
-- reader itself, debounced client-side — not on every page turn or
-- scroll tick.

create table public.book_reading_progress (
  user_id uuid not null,
  project_id uuid not null,

  -- PDF-mode (content_source in ('link','upload'), file opened in the
  -- in-app reader).
  current_page integer check (current_page is null or current_page >= 1),
  total_pages integer check (total_pages is null or total_pages >= 1),

  -- Authored-mode (content_source = 'authored').
  current_chapter_id uuid,
  scroll_fraction numeric(4,3) check (scroll_fraction is null or (scroll_fraction >= 0 and scroll_fraction <= 1)),

  updated_at timestamp with time zone not null default now(),
  constraint book_reading_progress_pkey primary key (user_id, project_id),
  constraint book_reading_progress_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint book_reading_progress_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete cascade,
  constraint book_reading_progress_chapter_id_fkey
    foreign key (current_chapter_id) references public.book_chapters(id) on delete set null
);

alter table public.book_reading_progress enable row level security;

-- Strictly private to the reader — nobody else, including the book's
-- owner, needs to see someone else's exact reading position.
create policy "book_reading_progress_owner_all"
  on public.book_reading_progress for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

commit;

-- ----------------------------------------------------------------------
-- NOT included in this migration, needs doing separately:
--
-- 1. get-project-file (edge function, service-role — lives outside
--    this frontend repo) needs a new `kind: "book"` branch. See the
--    ready-to-paste function code shared separately in chat.
--
-- 2. project_type_settings — insert a 'book' row (is_active = true)
--    so it shows up in the type picker at all; project_type_access_rules
--    is optional (no row = no eligibility gate, same as most types).
--
-- 3. Double-check book_chapters_select_gated above against whatever
--    course_lessons' real policy actually does — I wrote it to mirror
--    the behavior README.md describes, not the literal policy SQL,
--    since that file isn't in this repo.
-- ----------------------------------------------------------------------
```

Key design points worth knowing when you read/extend this:
- `project_book_details.content_source` mirrors the existing
  `project_media_details` pattern of splitting into
  `audio_source`/`video_source` (`'link' | 'upload'`) — same idea,
  just also allowing `'authored'`.
- `book_chapters` is **purchase-gated at the RLS level**, not just
  publicly-readable-metadata like `project_book_details` is. This
  matters: chapter *content* is the actual paid product, same as
  `course_lessons`. The RLS policy re-derives the standard
  owner-OR-purchased-OR-(free-AND-not-privacy-blocked) access rule in
  SQL. **This was written as a best-effort mirror of what
  `README.md` says `course_lessons`' policy does — the actual
  `course_lessons` SQL wasn't available in this repo to copy
  verbatim. Double check this against the real policy once you can
  see it (e.g. via the Supabase MCP connector, or ask the human), and
  correct `book_chapters_select_gated` if it diverges.**
- `book_reading_progress` is one shared table for both PDF-mode
  (`current_page`/`total_pages`) and authored-mode
  (`current_chapter_id`/`scroll_fraction`) — a single row per
  `(user_id, project_id)`, columns for the unused mode just stay
  null. Strictly private via RLS (`user_id = auth.uid()` only) —
  nobody, including the book's owner, should see another user's exact
  reading position.

## 3. Net-new files — create these verbatim first

These don't touch anything upstream owns, so there's no merge risk —
create them exactly as below before touching any shared file.

### 3.1 `src/hooks/useBookBuilder.ts` (new file)

Chapter CRUD/reorder/publish + authored-mode reading progress. Mirrors
`src/hooks/useCourseBuilder.ts`'s shape (read that file for the
pattern this was modeled on) but flattened to one level — a book has
no "module" nesting the way a course has modules containing lessons.

```tsx
// src/hooks/useBookBuilder.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

// Optional named front/back-matter sections the builder offers as
// toggles — adding one in is "turning it on", removing it is "turning
// it off". 'chapter' is the one kind a host adds freely, as many as
// they want, same as course lessons.
export type BookChapterKind =
  | "dedication"
  | "foreword"
  | "preface"
  | "introduction"
  | "prologue"
  | "chapter"
  | "epilogue"
  | "afterword"
  | "acknowledgments"
  | "about_author"
  | "appendix";

// Short guidance shown as a placeholder/hint in the builder for each
// optional section — "the app gives them the template to follow".
export const BOOK_SECTION_INFO: Record<
  BookChapterKind,
  { label: string; optional: boolean; hint: string }
> = {
  dedication: {
    label: "Dedication",
    optional: true,
    hint: "A short line dedicating the book to someone — often just a sentence.",
  },
  foreword: {
    label: "Foreword",
    optional: true,
    hint: "Usually written by someone other than you, introducing the book and why it matters.",
  },
  preface: {
    label: "Preface",
    optional: true,
    hint: "Your own note on why and how you wrote this book.",
  },
  introduction: {
    label: "Introduction",
    optional: true,
    hint: "Sets up what the reader is about to learn or experience.",
  },
  prologue: {
    label: "Prologue",
    optional: true,
    hint: "An opening scene or moment before Chapter One, common in fiction.",
  },
  chapter: {
    label: "Chapter",
    optional: false,
    hint: "Write your chapter here.",
  },
  epilogue: {
    label: "Epilogue",
    optional: true,
    hint: "A closing scene after the main story ends.",
  },
  afterword: {
    label: "Afterword",
    optional: true,
    hint: "Reflections after the main content — what happened since, or what you'd add today.",
  },
  acknowledgments: {
    label: "Acknowledgments",
    optional: true,
    hint: "Thank the people who helped make this happen.",
  },
  about_author: {
    label: "About the Author",
    optional: true,
    hint: "A short bio for the back of the book.",
  },
  appendix: {
    label: "Appendix",
    optional: true,
    hint: "Reference material, sources, or extra detail that supports the main text.",
  },
};

// Order these are conventionally offered in the builder's "add a
// section" list — chapters aren't in here since they're added
// directly via "+ Add chapter", not from this picker.
export const OPTIONAL_SECTION_ORDER: BookChapterKind[] = [
  "dedication",
  "foreword",
  "preface",
  "introduction",
  "prologue",
  "epilogue",
  "afterword",
  "acknowledgments",
  "about_author",
  "appendix",
];

export interface BookChapter {
  id: string;
  project_id: string;
  kind: BookChapterKind;
  title: string;
  content: string | null;
  sort_order: number;
}

export function useBookChapters(projectId: string | undefined) {
  return useQuery({
    queryKey: ["book-chapters", projectId],
    queryFn: async (): Promise<BookChapter[]> => {
      const { data, error } = await supabase
        .from("book_chapters")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BookChapter[];
    },
    enabled: !!projectId,
  });
}

function invalidateBook(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  queryClient.invalidateQueries({ queryKey: ["book-chapters", projectId] });
}

export function useAddChapter(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { blocking: true },
    mutationFn: async ({
      kind,
      title,
      sortOrder,
    }: {
      kind: BookChapterKind;
      title: string;
      sortOrder: number;
    }) => {
      const { data, error } = await supabase
        .from("book_chapters")
        .insert({ project_id: projectId, kind, title, sort_order: sortOrder })
        .select()
        .single();
      if (error) throw error;
      return data as BookChapter;
    },
    onSuccess: () => invalidateBook(queryClient, projectId),
  });
}

export function useUpdateChapter(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { blocking: true },
    mutationFn: async ({
      chapterId,
      title,
      content,
    }: {
      chapterId: string;
      title: string;
      content: string;
    }) => {
      const { error } = await supabase
        .from("book_chapters")
        .update({ title, content })
        .eq("id", chapterId);
      if (error) throw error;
    },
    onSuccess: () => invalidateBook(queryClient, projectId),
  });
}

// Reordering is a simple adjacent swap (move up/down), same as
// course modules/lessons — plenty of control for a book's chapter
// list without pulling in a drag-and-drop library.
export function useMoveChapter(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { blocking: true },
    mutationFn: async ({
      chapters,
      chapterId,
      direction,
    }: {
      chapters: BookChapter[];
      chapterId: string;
      direction: "up" | "down";
    }) => {
      const idx = chapters.findIndex((c) => c.id === chapterId);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= chapters.length) return;
      const a = chapters[idx];
      const b = chapters[swapIdx];
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from("book_chapters").update({ sort_order: b.sort_order }).eq("id", a.id),
        supabase.from("book_chapters").update({ sort_order: a.sort_order }).eq("id", b.id),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
    },
    onSuccess: () => invalidateBook(queryClient, projectId),
  });
}

export function useDeleteChapter(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { blocking: true },
    mutationFn: async (chapterId: string) => {
      const { error } = await supabase.from("book_chapters").delete().eq("id", chapterId);
      if (error) throw error;
    },
    onSuccess: () => invalidateBook(queryClient, projectId),
  });
}

// Publishing just means setting the project active with published_at
// set, same as Course — the purchase edge function is what actually
// enforces "can't buy before this is set".
export function usePublishBook(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { blocking: true },
    mutationFn: async () => {
      const { error } = await supabase
        .from("projects")
        .update({ status: "active", published_at: new Date().toISOString() })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
    },
  });
}

// ---------------------------------------------------------------
// Reading progress — shared table with PDF-mode books
// (book_reading_progress), but authored books only ever populate
// current_chapter_id/scroll_fraction, never current_page/total_pages.
// ---------------------------------------------------------------

export interface BookProgress {
  current_chapter_id: string | null;
  scroll_fraction: number | null;
}

export function useBookProgress(projectId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["book-progress", projectId, userId],
    queryFn: async (): Promise<BookProgress | null> => {
      const { data, error } = await supabase
        .from("book_reading_progress")
        .select("current_chapter_id, scroll_fraction")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.warn("book_reading_progress unavailable — has the migration run yet?", error);
        return null;
      }
      return data;
    },
    enabled: !!projectId && !!userId,
  });
}

// Debounced by the caller (BookReader/authored view) — not meant to
// fire on every scroll tick, same spirit as the PDF reader's own
// progress save.
export function useSaveBookProgress(projectId: string, userId: string | undefined) {
  return useMutation({
    mutationFn: async ({
      chapterId,
      scrollFraction,
    }: {
      chapterId: string;
      scrollFraction: number;
    }) => {
      if (!userId) return;
      const { error } = await supabase.from("book_reading_progress").upsert(
        {
          project_id: projectId,
          user_id: userId,
          current_chapter_id: chapterId,
          scroll_fraction: scrollFraction,
        },
        { onConflict: "user_id,project_id" }
      );
      if (error) throw error;
    },
  });
}
```

### 3.2 `src/components/project-types/BookFields.tsx` (new file)

Creation-time fields component, same role as `FileFields.tsx`/
`UrlFields.tsx`/`GigFields.tsx` in `src/components/project-types/`.
Used by both `CreateProject.tsx` and `EditProject.tsx` (for the
`link`/`upload` content sources only — `authored` books show a short
"manage this from the builder" note instead once created, since
there's nothing to edit here after creation for that mode).

```tsx
// src/components/project-types/BookFields.tsx
import { useRef, useState } from "react";
import { FileUp, Info } from "lucide-react";
import { FormField } from "../FormField";
import { useUploadProjectFile } from "../../hooks/useUploadProjectFile";

export type BookContentSource = "link" | "upload" | "authored";

export interface BookFieldsValue {
  book_type: "book" | "article";
  content_source: BookContentSource;
  url: string;
  file_path: string | null;
  file_name: string | null; // display-only
  allow_download: boolean;
  allow_read_in_app: boolean;
  is_own_work: boolean;
  author_name: string;
  source_credit: string;
}

export const EMPTY_BOOK_FIELDS: BookFieldsValue = {
  book_type: "book",
  content_source: "upload",
  url: "",
  file_path: null,
  file_name: null,
  allow_download: false,
  allow_read_in_app: true,
  is_own_work: true,
  author_name: "",
  source_credit: "",
};

interface BookFieldsProps {
  value: BookFieldsValue;
  onChange: (value: BookFieldsValue) => void;
  onError: (message: string) => void;
}

const SOURCE_OPTIONS: { value: BookContentSource; label: string; hint: string }[] = [
  { value: "upload", label: "Upload PDF", hint: "Host the file here — allow download, in-app reading, or both." },
  { value: "link", label: "Link", hint: "Redirect readers to it elsewhere — nothing hosted here." },
  { value: "authored", label: "Write in Akọ", hint: "Build it chapter by chapter, right here, like a Course." },
];

export function BookFields({ value, onChange, onError }: BookFieldsProps) {
  const uploadFile = useUploadProjectFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0); // forces disabled/label state to re-render during upload

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      onError("Only PDF files are supported for upload right now.");
      return;
    }
    try {
      setTick((t) => t + 1);
      const path = await uploadFile.mutateAsync(file);
      onChange({ ...value, file_path: path, file_name: file.name });
    } catch (err) {
      onError(err instanceof Error ? err.message : "File upload failed.");
    }
  }

  return (
    <div>
      {/* Book vs Article — mostly cosmetic (shown as a badge on the
          card), but lets a quick essay/blog-style piece look right
          next to a full-length book. */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-muted mb-1.5">Type</label>
        <div className="flex gap-2">
          {(["book", "article"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...value, book_type: t })}
              className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium capitalize ${
                value.book_type === t
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-border bg-canvas text-ink-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content source — link, upload, or build it in-app. Switching
          this doesn't clear the other modes' state, same reasoning as
          switching project_type itself in CreateProject. */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-muted mb-1.5">How are you adding it?</label>
        <div className="flex flex-col gap-2">
          {SOURCE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer ${
                value.content_source === opt.value ? "border-accent bg-accent-soft" : "border-border bg-canvas"
              }`}
            >
              <input
                type="radio"
                name="book_content_source"
                checked={value.content_source === opt.value}
                onChange={() => onChange({ ...value, content_source: opt.value })}
                className="mt-1 accent-current"
              />
              <span>
                <span className="block text-sm font-medium text-ink">{opt.label}</span>
                <span className="block text-xs text-ink-muted">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {value.content_source === "link" && (
        <FormField
          id="book_url"
          label="Link"
          type="url"
          value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          placeholder="https://..."
        />
      )}

      {value.content_source === "upload" && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-ink-muted mb-1.5">PDF</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadFile.isPending}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-surface text-sm text-ink-muted disabled:opacity-50"
          >
            <FileUp size={16} />
            {uploadFile.isPending
              ? "Uploading…"
              : value.file_name
                ? value.file_name
                : value.file_path
                  ? "File uploaded — tap to replace"
                  : "Choose PDF"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col gap-2 mt-3">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={value.allow_read_in_app}
                onChange={(e) => onChange({ ...value, allow_read_in_app: e.target.checked })}
                className="rounded border-border"
              />
              Let readers read it right here in Akọ
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={value.allow_download}
                onChange={(e) => onChange({ ...value, allow_download: e.target.checked })}
                className="rounded border-border"
              />
              Let readers download the PDF
            </label>
          </div>
        </div>
      )}

      {value.content_source === "authored" && (
        <div className="mb-4 flex gap-2.5 p-4 rounded-xl bg-accent-soft/60 text-sm text-ink-muted">
          <Info size={16} className="shrink-0 mt-0.5 text-accent" />
          <p>
            This creates a draft. Build your chapters next, add a cover, then publish when it's
            ready — no one can buy it until you do.
          </p>
        </div>
      )}

      {/* Attribution — independent of content_source. Publishing
          someone else's work with credit forces the price to $0,
          enforced below this component in CreateProject and again on
          the server (a nonzero price silently can't save otherwise). */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-muted mb-1.5">Author</label>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, is_own_work: true })}
            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium ${
              value.is_own_work ? "border-accent bg-accent-soft text-ink" : "border-border bg-canvas text-ink-muted"
            }`}
          >
            I wrote this
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, is_own_work: false })}
            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium ${
              !value.is_own_work ? "border-accent bg-accent-soft text-ink" : "border-border bg-canvas text-ink-muted"
            }`}
          >
            Someone else wrote this
          </button>
        </div>

        {!value.is_own_work && (
          <>
            <FormField
              id="book_author_name"
              label="Author's name"
              value={value.author_name}
              onChange={(e) => onChange({ ...value, author_name: e.target.value })}
              placeholder="Who actually wrote it"
              required
            />
            <FormField
              id="book_source_credit"
              label="Credit / source (optional)"
              value={value.source_credit}
              onChange={(e) => onChange({ ...value, source_credit: e.target.value })}
              placeholder="e.g. Originally published by Acme Press, shared with permission"
            />
            <p className="text-xs text-ink-muted -mt-3 mb-4">
              You're crediting someone else as the author, so this can't be sold — price is
              locked at $0.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

### 3.3 `src/pages/BookReader.tsx` (new file)

The PDF page-image reader, for `content_source` of `link` (only if
somehow read-in-app is requested — not really applicable) or
`upload` books with `allow_read_in_app = true`. Routed at
`/projects/:projectId/read`, behind `RequireAuth`.

Uses `pdfjs-dist` (added to `package.json`, see §5 — **you need to
`npm install` after cloning, it won't be in `node_modules` yet**).
Note the render call intentionally does NOT pass a `canvas` key to
`page.render(...)` — `pdfjs-dist` v4's `RenderParameters` type
doesn't include it; only `canvasContext` and `viewport` are valid.
This was a real bug caught by `tsc` — if you see
`TS2353: Object literal may only specify known properties, and
'canvas' does not exist in type 'RenderParameters'` anywhere, that's
the fix.

```tsx
// src/pages/BookReader.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ArrowLeft, ChevronLeft, ChevronRight, Sun, Settings2, X } from "lucide-react";
import { useProject, useHasPurchased, isProjectFree, useGetProjectFile } from "../hooks/useProjects";
import { useBookDetails, usePdfReadingProgress, useSavePdfReadingProgress } from "../hooks/useProjectTypeDetails";
import { useIsProjectMember } from "../hooks/useProjectMembers";
import { useAuth } from "../hooks/useAuth";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

type ReaderTheme = "light" | "sepia" | "dark";

// Classic PDF "night mode" trick — since pages render as raster
// images (see the header note on why: content is a scanned/exported
// PDF, not structured text), theme/brightness are applied as CSS
// filters on the canvas rather than real color changes. invert+hue-
// rotate flips a white page dark while keeping (most) colors sane;
// sepia warms it without inverting.
const THEME_FILTER: Record<ReaderTheme, string> = {
  light: "none",
  sepia: "sepia(0.35) brightness(0.97) contrast(0.97)",
  dark: "invert(0.92) hue-rotate(180deg) brightness(0.92) contrast(0.88)",
};

const THEME_BG: Record<ReaderTheme, string> = {
  light: "#F7F4EF",
  sepia: "#EFE4CC",
  dark: "#0C0C0B",
};

const THEME_CHROME_BG: Record<ReaderTheme, string> = {
  light: "rgba(247, 244, 239, 0.92)",
  sepia: "rgba(239, 228, 204, 0.92)",
  dark: "rgba(12, 12, 11, 0.92)",
};

const THEME_INK: Record<ReaderTheme, string> = {
  light: "#1F1D1A",
  sepia: "#3A2E1F",
  dark: "#F9F8F5",
};

export function BookReader() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: project } = useProject(projectId);
  const { data: bookDetails } = useBookDetails(projectId);
  const hasPurchasedQuery = useHasPurchased(projectId ?? "");
  const isMemberQuery = useIsProjectMember(projectId ?? "", project?.is_private ?? false);
  const getBookFile = useGetProjectFile();
  const { data: savedProgress } = usePdfReadingProgress(projectId, user?.id);
  const saveProgress = useSavePdfReadingProgress(projectId ?? "", user?.id);

  const isOwner = !!user && project?.owner_id === user.id;
  const isFree = project ? isProjectFree(project) : false;
  const privacyBlocked = !!project?.is_private && !isOwner && !isMemberQuery.data;
  const hasAccess = !privacyBlocked && (isOwner || !!hasPurchasedQuery.data || isFree);

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<ReaderTheme>(
    () => (localStorage.getItem("ako-reader-theme") as ReaderTheme | null) ?? "light"
  );
  const [brightness, setBrightness] = useState<number>(
    () => Number(localStorage.getItem("ako-reader-brightness")) || 100
  );
  const [resumeApplied, setResumeApplied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem("ako-reader-theme", theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("ako-reader-brightness", String(brightness));
  }, [brightness]);

  // Redirect an authored book here by mistake straight to its own
  // reader/builder — this page only knows how to render a PDF.
  useEffect(() => {
    if (bookDetails?.content_source === "authored" && projectId) {
      navigate(`/books/${projectId}`, { replace: true });
    }
  }, [bookDetails, projectId, navigate]);

  // Load the PDF once access is confirmed and a signed URL can be
  // minted. get-project-file additionally checks allow_read_in_app
  // for kind: "book"/action: "stream" — a host who only turned on
  // Download will get a clean rejection here, surfaced as `error`.
  useEffect(() => {
    if (!projectId || !hasAccess || bookDetails?.content_source === "authored") return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = await getBookFile.mutateAsync({ projectId: projectId!, kind: "book", action: "stream" });
        const doc = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't open this book.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, hasAccess, bookDetails?.content_source]);

  // Resume where the reader left off, once (not on every re-render) —
  // clamped in case the file changed and has fewer pages now.
  useEffect(() => {
    if (!resumeApplied && numPages > 0 && savedProgress?.current_page) {
      setPageNum(Math.min(Math.max(1, savedProgress.current_page), numPages));
      setResumeApplied(true);
    } else if (!resumeApplied && numPages > 0) {
      setResumeApplied(true);
    }
  }, [numPages, savedProgress, resumeApplied]);

  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current || !containerRef.current) return;
    const page = await pdf.getPage(pageNum);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const unscaled = page.getViewport({ scale: 1 });
    // Fit to container, capped so a landscape page (or a very wide
    // window) doesn't blow past the available height either.
    const scale =
      Math.min(containerWidth / unscaled.width, containerHeight / unscaled.height) * (window.devicePixelRatio || 1);
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / (window.devicePixelRatio || 1)}px`;
    canvas.style.height = `${viewport.height / (window.devicePixelRatio || 1)}px`;

    await page.render({ canvasContext: ctx, viewport }).promise;
  }, [pdf, pageNum]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Re-render on resize/rotate — the canvas is sized to the
  // container, so a viewport change means a fresh render, not just
  // CSS scaling (which would blur it).
  useEffect(() => {
    function onResize() {
      renderPage();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [renderPage]);

  // Debounced progress save — fires ~900ms after the reader settles
  // on a page, not on every single turn while someone's flipping fast.
  useEffect(() => {
    if (!user || !numPages || !resumeApplied) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveProgress.mutate({ currentPage: pageNum, totalPages: numPages });
    }, 900);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, numPages, user, resumeApplied]);

  function goPrev() {
    setPageNum((p) => Math.max(1, p - 1));
  }
  function goNext() {
    setPageNum((p) => Math.min(numPages, p + 1));
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return; // not a swipe — let the tap-zone handler below decide
    if (dx < 0) goNext();
    else goPrev();
  }

  // Tap zones — left third/right third turn pages, the middle toggles
  // the top/bottom chrome. Matches Apple Books' tap-to-navigate model.
  function handleTapZone(e: React.MouseEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) goPrev();
    else if (x > third * 2) goNext();
    else setChromeVisible((v) => !v);
  }

  const progressPct = numPages > 0 ? Math.round((pageNum / numPages) * 100) : 0;

  if (!project || !bookDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
        <p className="text-ink">You don't have access to this book yet.</p>
        <button onClick={() => navigate(`/projects/${projectId}`)} className="text-accent text-sm font-medium">
          Go to project page
        </button>
      </div>
    );
  }

  if (bookDetails.content_source === "upload" && !bookDetails.allow_read_in_app) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
        <p className="text-ink">The host only made this available for download, not in-app reading.</p>
        <button onClick={() => navigate(`/projects/${projectId}`)} className="text-accent text-sm font-medium">
          Go to project page
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: THEME_BG[theme] }}>
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-3 transition-transform duration-200 ${
          chromeVisible ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ backgroundColor: THEME_CHROME_BG[theme] }}
      >
        <button onClick={() => navigate(-1)} style={{ color: THEME_INK[theme] }}>
          <ArrowLeft size={22} />
        </button>
        <p className="text-sm font-medium truncate max-w-[60%]" style={{ color: THEME_INK[theme] }}>
          {project.title}
        </p>
        <button onClick={() => setSettingsOpen(true)} style={{ color: THEME_INK[theme] }}>
          <Settings2 size={20} />
        </button>
      </div>

      {/* Page surface */}
      <div
        ref={containerRef}
        onClick={handleTapZone}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 flex items-center justify-center overflow-hidden select-none"
      >
        {loading && <p className="text-ink-muted text-sm">Opening book…</p>}
        {error && <p className="text-danger text-sm px-6 text-center">{error}</p>}
        {!loading && !error && (
          <canvas
            ref={canvasRef}
            style={{
              filter: `${THEME_FILTER[theme]} brightness(${brightness}%)`,
              boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
              borderRadius: "2px",
            }}
          />
        )}
      </div>

      {/* Bottom bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 px-4 pt-2 pb-4 transition-transform duration-200 ${
          chromeVisible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ backgroundColor: THEME_CHROME_BG[theme] }}
      >
        <div className="flex items-center gap-3">
          <button onClick={goPrev} disabled={pageNum <= 1} style={{ color: THEME_INK[theme] }} className="disabled:opacity-30">
            <ChevronLeft size={20} />
          </button>
          <input
            type="range"
            min={1}
            max={Math.max(numPages, 1)}
            value={pageNum}
            onChange={(e) => setPageNum(Number(e.target.value))}
            className="flex-1 accent-current"
            style={{ color: THEME_INK[theme] }}
          />
          <button
            onClick={goNext}
            disabled={pageNum >= numPages}
            style={{ color: THEME_INK[theme] }}
            className="disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <p className="text-center text-xs mt-1" style={{ color: THEME_INK[theme], opacity: 0.7 }}>
          Page {pageNum} of {numPages || "…"} · {progressPct}%
        </p>
      </div>

      {/* Settings sheet — theme + brightness */}
      {settingsOpen && (
        <div className="fixed inset-0 z-30 flex items-end" onClick={() => setSettingsOpen(false)}>
          <div className="absolute inset-0 bg-ink/40" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full bg-surface rounded-t-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <p className="font-medium text-ink">Reading settings</p>
              <button onClick={() => setSettingsOpen(false)} className="text-ink-muted">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs font-medium text-ink-muted mb-2">Theme</p>
            <div className="flex gap-2 mb-5">
              {(["light", "sepia", "dark"] as ReaderTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium capitalize ${
                    theme === t ? "border-accent bg-accent-soft text-ink" : "border-border text-ink-muted"
                  }`}
                  style={{ backgroundColor: theme === t ? undefined : THEME_BG[t] }}
                >
                  {t}
                </button>
              ))}
            </div>

            <p className="text-xs font-medium text-ink-muted mb-2 flex items-center gap-1.5">
              <Sun size={13} /> Brightness
            </p>
            <input
              type="range"
              min={40}
              max={150}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3.4 `src/pages/Book.tsx` (new file)

Three states in one component, dispatched by `Book()` at the top:
- **Owner** → `BookBuilder` (cover upload, chapter list with
  add/edit/reorder/delete, optional-section picker, Publish button).
- **No access** (not owner, not free, not purchased) → `BookLockedView`
  (cover + title + Buy button — a shared `/books/:id` link can land a
  logged-out or not-yet-bought visitor directly here, so this page
  needs its own full "buy to unlock" state, not just ProjectCard's).
- **Has access, not owner** → `BookReflowReader` (table of contents →
  full-screen chapter reader with Previous/Next, theme + font-size
  settings sheet, resumable position).

Routed at `/books/:projectId`, **publicly** (not behind
`RequireAuth`) — same reasoning as `/courses/:projectId`: a shared
link should load for a logged-out visitor, who then sees the
buy-to-unlock state this page already handles itself.

```tsx
// src/pages/Book.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Sun,
  Settings2,
  X,
  Lock,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProject, useHasPurchased, isProjectFree, getEffectivePrice, usePurchaseProject } from "../hooks/useProjects";
import { useIsProjectMember } from "../hooks/useProjectMembers";
import { useUploadProjectThumbnail } from "../hooks/useUploadProjectThumbnail";
import { Button } from "../components/Button";
import {
  useBookChapters,
  useAddChapter,
  useUpdateChapter,
  useMoveChapter,
  useDeleteChapter,
  usePublishBook,
  useBookProgress,
  useSaveBookProgress,
  BOOK_SECTION_INFO,
  OPTIONAL_SECTION_ORDER,
  type BookChapter,
  type BookChapterKind,
} from "../hooks/useBookBuilder";

type ReaderTheme = "light" | "sepia" | "dark";

const THEME_BG: Record<ReaderTheme, string> = {
  light: "#F7F4EF",
  sepia: "#EFE4CC",
  dark: "#17140F",
};
const THEME_INK: Record<ReaderTheme, string> = {
  light: "#1F1D1A",
  sepia: "#3A2E1F",
  dark: "#F0EEE8",
};
const THEME_INK_MUTED: Record<ReaderTheme, string> = {
  light: "#6B6558",
  sepia: "#7A6444",
  dark: "#9C978A",
};

export function Book() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: project } = useProject(projectId);
  const isOwner = !!user && project?.owner_id === user.id;
  const isFree = !!project && isProjectFree(project);
  const hasPurchasedQuery = useHasPurchased(projectId ?? "");
  const isMemberQuery = useIsProjectMember(projectId ?? "", project?.is_private ?? false);
  const privacyBlocked = !!project?.is_private && !isOwner && !isMemberQuery.data;
  const hasAccess = !privacyBlocked && (isOwner || isFree || !!hasPurchasedQuery.data);

  const { data: chapters } = useBookChapters(projectId);
  const publishBook = usePublishBook(projectId ?? "");
  const purchaseProject = usePurchaseProject();

  const ordered = useMemo(() => (chapters ?? []).slice().sort((a, b) => a.sort_order - b.sort_order), [chapters]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (isOwner) {
    return <BookBuilder projectId={project.id} project={project} chapters={ordered} publishBook={publishBook} />;
  }

  if (!hasAccess) {
    return (
      <BookLockedView
        title={project.title}
        thumbnailUrl={project.thumbnail_url}
        price={getEffectivePrice(project)}
        onBuy={async () => {
          await purchaseProject.mutateAsync(project.id);
        }}
        buying={purchaseProject.isPending}
        onBack={() => navigate(-1)}
      />
    );
  }

  return <BookReflowReader projectId={project.id} title={project.title} chapters={ordered} userId={user?.id} onBack={() => navigate(-1)} />;
}

// ---------------------------------------------------------------
// Locked state — mirrors ProjectCard's Buy pill, but as a full page
// since a shared /books/:id link can land a logged-out or
// not-yet-purchased visitor directly here.
// ---------------------------------------------------------------

function BookLockedView({
  title,
  thumbnailUrl,
  price,
  onBuy,
  buying,
  onBack,
}: {
  title: string;
  thumbnailUrl: string | null;
  price: number;
  onBuy: () => Promise<void>;
  buying: boolean;
  onBack: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <button onClick={onBack} className="absolute top-4 left-4 text-ink">
        <ArrowLeft size={22} />
      </button>
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" className="w-36 aspect-[2/3] object-cover rounded-lg shadow-lg" />
      ) : (
        <div className="w-36 aspect-[2/3] rounded-lg bg-surface flex items-center justify-center">
          <ImageIcon size={28} className="text-ink-muted" />
        </div>
      )}
      <p className="font-medium text-ink text-lg">{title}</p>
      <p className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Lock size={14} /> Buy to read this book
      </p>
      <button
        onClick={async () => {
          setError(null);
          try {
            await onBuy();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't complete purchase.");
          }
        }}
        disabled={buying}
        className="bg-accent text-canvas px-6 py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
      >
        {buying ? "Processing…" : `Buy for $${price.toFixed(2)}`}
      </button>
      {error && <p className="text-danger text-sm">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------
// Owner builder — cover, optional front/back-matter toggles, a free
// ordered chapter list, publish. Mirrors Course.tsx's module/lesson
// builder shape, flattened to one level (no modules, just chapters).
// ---------------------------------------------------------------

function BookBuilder({
  projectId,
  project,
  chapters,
  publishBook,
}: {
  projectId: string;
  project: { title: string; thumbnail_url: string | null; published_at: string | null };
  chapters: BookChapter[];
  publishBook: ReturnType<typeof usePublishBook>;
}) {
  const navigate = useNavigate();
  const addChapter = useAddChapter(projectId);
  const updateChapter = useUpdateChapter(projectId);
  const moveChapter = useMoveChapter(projectId);
  const deleteChapter = useDeleteChapter(projectId);
  const uploadThumbnail = useUploadProjectThumbnail();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addingSectionPicker, setAddingSectionPicker] = useState(false);

  const usedKinds = new Set(chapters.map((c) => c.kind));
  const availableOptionalSections = OPTIONAL_SECTION_ORDER.filter((k) => !usedKinds.has(k));

  function startEdit(chapter: BookChapter) {
    setEditingId(chapter.id);
    setDraftTitle(chapter.title);
    setDraftContent(chapter.content ?? "");
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      await updateChapter.mutateAsync({ chapterId: editingId, title: draftTitle.trim() || "Untitled", content: draftContent });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  }

  async function handleAddChapter() {
    const sortOrder = chapters.length > 0 ? chapters[chapters.length - 1].sort_order + 1 : 0;
    try {
      const created = await addChapter.mutateAsync({
        kind: "chapter",
        title: `Chapter ${chapters.filter((c) => c.kind === "chapter").length + 1}`,
        sortOrder,
      });
      startEdit(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add chapter.");
    }
  }

  async function handleAddSection(kind: BookChapterKind) {
    const sortOrder = chapters.length > 0 ? chapters[chapters.length - 1].sort_order + 1 : 0;
    try {
      const created = await addChapter.mutateAsync({ kind, title: BOOK_SECTION_INFO[kind].label, sortOrder });
      setAddingSectionPicker(false);
      startEdit(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add section.");
    }
  }

  async function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await uploadThumbnail.mutateAsync(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover upload failed.");
    }
  }

  async function handlePublish() {
    if (chapters.length === 0) {
      setError("Add at least one chapter before publishing.");
      return;
    }
    try {
      await publishBook.mutateAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="sticky top-0 z-10 bg-canvas/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-ink">
          <ArrowLeft size={22} />
        </button>
        <p className="text-sm font-medium text-ink truncate max-w-[50%]">{project.title}</p>
        {!project.published_at ? (
          <Button onClick={handlePublish} loading={publishBook.isPending} className="!w-auto !py-1.5 !px-4 text-sm">
            Publish
          </Button>
        ) : (
          <span className="text-xs text-ink-muted">Published</span>
        )}
      </div>

      <div className="px-4 py-4 max-w-xl mx-auto">
        {/* Cover */}
        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadThumbnail.isPending}
          className="w-28 aspect-[2/3] rounded-lg bg-surface border border-border flex items-center justify-center overflow-hidden mb-6 disabled:opacity-50"
        >
          {project.thumbnail_url ? (
            <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-ink-muted">
              <ImageIcon size={20} />
              <span className="text-[11px]">{uploadThumbnail.isPending ? "Uploading…" : "Add cover"}</span>
            </div>
          )}
        </button>
        <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />

        {error && <p className="text-danger text-sm mb-4">{error}</p>}

        {/* Ordered section/chapter list */}
        <div className="flex flex-col gap-2 mb-4">
          {chapters.map((chapter, i) => (
            <div key={chapter.id} className="border border-border rounded-xl p-3">
              {editingId === chapter.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Title"
                    className="px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm font-medium"
                  />
                  <textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    placeholder={BOOK_SECTION_INFO[chapter.kind].hint}
                    rows={10}
                    className="px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm resize-y"
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={saveEdit} loading={updateChapter.isPending} className="!w-auto !py-1.5 !px-4 text-sm">
                      Save
                    </Button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-ink-muted px-3 py-1.5">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col shrink-0">
                    <button
                      onClick={() => moveChapter.mutate({ chapters, chapterId: chapter.id, direction: "up" })}
                      disabled={i === 0}
                      className="text-ink-muted disabled:opacity-20"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveChapter.mutate({ chapters, chapterId: chapter.id, direction: "down" })}
                      disabled={i === chapters.length - 1}
                      className="text-ink-muted disabled:opacity-20"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink-muted uppercase tracking-wide">
                      {chapter.kind === "chapter" ? `Chapter` : BOOK_SECTION_INFO[chapter.kind].label}
                    </p>
                    <p className="text-sm font-medium text-ink truncate">{chapter.title}</p>
                    {!chapter.content?.trim() && <p className="text-xs text-accent">Empty — tap to write</p>}
                  </div>
                  <button onClick={() => startEdit(chapter)} className="text-ink-muted shrink-0">
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove "${chapter.title}"?`)) deleteChapter.mutate(chapter.id);
                    }}
                    className="text-danger shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleAddChapter}
          disabled={addChapter.isPending}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-border text-sm text-accent font-medium mb-3 disabled:opacity-50"
        >
          <Plus size={16} />
          Add chapter
        </button>

        {/* Optional front/back-matter toggles — "turn on" one by
            adding it here, "turn off" by deleting it above. */}
        {availableOptionalSections.length > 0 && (
          <div>
            <button
              onClick={() => setAddingSectionPicker((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm text-ink-muted font-medium"
            >
              <Plus size={14} />
              Add a section (foreword, epilogue, etc.)
            </button>
            {addingSectionPicker && (
              <div className="flex flex-wrap gap-2 mt-2">
                {availableOptionalSections.map((kind) => (
                  <button
                    key={kind}
                    onClick={() => handleAddSection(kind)}
                    className="px-3 py-1.5 rounded-full border border-border text-xs text-ink-muted"
                  >
                    {BOOK_SECTION_INFO[kind].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Reflowable reader — real text, not a raster page, so unlike
// BookReader.tsx (the PDF renderer) this one can actually reflow:
// theme, font size, and a simple prev/next-chapter model instead of
// PDF-style page numbers. Progress = (chapter, scroll fraction) via
// useBookProgress/useSaveBookProgress.
// ---------------------------------------------------------------

function BookReflowReader({
  projectId,
  title,
  chapters,
  userId,
  onBack,
}: {
  projectId: string;
  title: string;
  chapters: BookChapter[];
  userId: string | undefined;
  onBack: () => void;
}) {
  const { data: progress } = useBookProgress(projectId, userId);
  const saveProgress = useSaveBookProgress(projectId, userId);

  const [view, setView] = useState<"toc" | "chapter">("toc");
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ReaderTheme>(
    () => (localStorage.getItem("ako-reader-theme") as ReaderTheme | null) ?? "light"
  );
  const [fontSize, setFontSize] = useState<number>(() => Number(localStorage.getItem("ako-reader-font-size")) || 17);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resumed, setResumed] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem("ako-reader-theme", theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("ako-reader-font-size", String(fontSize));
  }, [fontSize]);

  // Resume once, straight into the saved chapter.
  useEffect(() => {
    if (!resumed && chapters.length > 0) {
      if (progress?.current_chapter_id && chapters.some((c) => c.id === progress.current_chapter_id)) {
        setChapterId(progress.current_chapter_id);
        setView("chapter");
      }
      setResumed(true);
    }
  }, [resumed, chapters, progress]);

  const currentIndex = chapters.findIndex((c) => c.id === chapterId);
  const current = currentIndex >= 0 ? chapters[currentIndex] : null;
  const prev = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  function openChapter(id: string) {
    setChapterId(id);
    setView("chapter");
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  function handleScroll() {
    if (!scrollRef.current || !current) return;
    const el = scrollRef.current;
    const fraction = el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 0;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveProgress.mutate({ chapterId: current.id, scrollFraction: Math.min(1, Math.max(0, fraction)) });
    }, 900);
  }

  if (view === "toc" || !current) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="sticky top-0 z-10 bg-canvas/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-ink">
            <ArrowLeft size={22} />
          </button>
          <p className="text-sm font-medium text-ink truncate">{title}</p>
        </div>
        <div className="px-4 py-4 max-w-xl mx-auto flex flex-col gap-1">
          {chapters.map((c) => (
            <button
              key={c.id}
              onClick={() => openChapter(c.id)}
              className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-surface text-left"
            >
              <div>
                <p className="text-xs text-ink-muted uppercase tracking-wide">
                  {c.kind === "chapter" ? "Chapter" : BOOK_SECTION_INFO[c.kind].label}
                </p>
                <p className="text-sm font-medium text-ink">{c.title}</p>
              </div>
              <ChevronRight size={16} className="text-ink-muted shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: THEME_BG[theme] }}>
      <div className="flex items-center justify-between px-3 py-3" style={{ color: THEME_INK[theme] }}>
        <button onClick={() => setView("toc")}>
          <ArrowLeft size={22} />
        </button>
        <p className="text-sm font-medium truncate max-w-[55%]">{current.title}</p>
        <button onClick={() => setSettingsOpen(true)}>
          <Settings2 size={20} />
        </button>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-xl mx-auto">
          <h1 className="font-semibold mb-4" style={{ color: THEME_INK[theme], fontSize: fontSize + 8 }}>
            {current.title}
          </h1>
          <div className="whitespace-pre-wrap leading-relaxed" style={{ color: THEME_INK[theme], fontSize }}>
            {current.content || <span style={{ color: THEME_INK_MUTED[theme] }}>Nothing here yet.</span>}
          </div>

          <div className="flex items-center justify-between mt-10 mb-6">
            <button
              onClick={() => prev && openChapter(prev.id)}
              disabled={!prev}
              className="flex items-center gap-1 text-sm font-medium disabled:opacity-30"
              style={{ color: THEME_INK[theme] }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              onClick={() => next && openChapter(next.id)}
              disabled={!next}
              className="flex items-center gap-1 text-sm font-medium disabled:opacity-30"
              style={{ color: THEME_INK[theme] }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-30 flex items-end" onClick={() => setSettingsOpen(false)}>
          <div className="absolute inset-0 bg-ink/40" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full bg-surface rounded-t-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <p className="font-medium text-ink">Reading settings</p>
              <button onClick={() => setSettingsOpen(false)} className="text-ink-muted">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs font-medium text-ink-muted mb-2">Theme</p>
            <div className="flex gap-2 mb-5">
              {(["light", "sepia", "dark"] as ReaderTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium capitalize ${
                    theme === t ? "border-accent bg-accent-soft text-ink" : "border-border text-ink-muted"
                  }`}
                  style={{ backgroundColor: theme === t ? undefined : THEME_BG[t] }}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs font-medium text-ink-muted mb-2 flex items-center gap-1.5">
              <Sun size={13} /> Text size
            </p>
            <input
              type="range"
              min={13}
              max={28}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

## 4. Edits to shared/existing files

**Do not copy these as literal diffs against a specific line number —
the file has moved and will keep moving.** Instead, treat each as "add
this block, in the same additive spot other project types add theirs
(right next to `pitch`'s or `room`'s equivalent block, keeping both)".
The code shown below is the exact, already-typechecked target content
for the Book-specific additions.

### 4.1 `src/hooks/useProjects.ts`

**a) `ProjectType` union, `PROJECT_TYPE_LABELS`, `PROJECT_TYPE_OPTIONS`,
`PROJECT_TYPE_HINTS`, `PROJECT_TYPE_ACCESS`** — add `book` to each,
alongside whatever other new types (`pitch`, etc.) are already there.
Current fully-merged target state of this whole block:

```tsx
export type ProjectType =
  | "event"
  | "media"
  | "file"
  | "url"
  | "course"
  | "room"
  | "meeting"
  | "gig"
  | "pitch"
  | "book";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  event: "Event",
  media: "Media",
  file: "File",
  url: "URL",
  course: "Course",
  room: "Cohort",
  meeting: "Meeting",
  gig: "Gig",
  pitch: "Pitch",
  book: "Book",
};

// Order to show in the type picker.
export const PROJECT_TYPE_OPTIONS: ProjectType[] = [
  "gig",
  "pitch",
  "event",
  "meeting",
  "room",
  "course",
  "book",
  "media",
  "file",
  "url",
];

// (inside PROJECT_TYPE_HINTS, add:)
  book: "A book or article. Link out, upload a PDF for download, or let people read it right here.",

// (inside PROJECT_TYPE_ACCESS, add — book is "either" since both a
// personal author and a publisher/organization page can reasonably
// post one:)
  book: "either",
```
(NOTE: `PROJECT_TYPE_OPTIONS` and the exact wording/ordering above
reflects what upstream's `pitch`/`room` additions looked like at the
time this was written — read the actual current file first and just
splice `book` in alongside whatever's actually there now, same
positions/spirit.)

**b) New `BookDetailsInput` interface**, placed near the other
`*DetailsInput` interfaces (`GigDetailsInput`, `RoomDetailsInput`,
etc.), and added to `CreateProjectInput`:

```tsx
// A 'book' offers a link, an uploaded PDF, or is written entirely
// in-app (content_source picks exactly one, mirroring media's
// link-or-upload split — see project_book_details_content_matches_source
// in the migration). allow_download / allow_read_in_app are only
// meaningful when content_source = 'upload'. is_own_work = false means
// the host is publishing someone else's work with credit — the
// server (trg_enforce_book_no_monetization) rejects any nonzero price
// in that case, not just this form. 'authored' books are created here
// as an empty draft (same as course) and built afterward in the Book
// builder (useBookBuilder.ts) — this input just reserves book_type/
// is_own_work/author fields for them.
interface BookDetailsInput {
  book_type: "book" | "article";
  content_source: "link" | "upload" | "authored";
  author_name?: string;
  is_own_work: boolean;
  source_credit?: string;
  external_url?: string;
  file_path?: string;
  allow_download?: boolean;
  allow_read_in_app?: boolean;
  page_count?: number;
}

// (inside CreateProjectInput, alongside the other *_details? fields:)
  book_details?: BookDetailsInput;
```

**c) `useCreateProject`'s `mutationFn`** — destructure `book_details`
out of the input alongside the other `*_details`, and after whichever
`project_type === "..."` insert blocks already exist for other types,
add:

```tsx
      if (input.project_type === "book" && book_details) {
        const { error: detailsError } = await supabase
          .from("project_book_details")
          .insert({ project_id: data.id, ...book_details });
        if (detailsError) throw detailsError;
      }
```

**d) `useGetProjectFile`** — this hook already existed for File/Media
downloads. Extend its `kind` union to add `"book"`, and add a new
`action` param (`"download" | "stream"`, default `"download"`) so the
edge function can tell a download request from an in-app-read
request and check `allow_download` vs `allow_read_in_app`
independently:

```tsx
/**
 * Fetches a short-lived signed URL for a project's hosted file.
 * The edge function itself is the access gate (owner/free/purchased) —
 * this hook just calls it and surfaces the result or the rejection.
 *
 * `kind` tells the edge function which stored path to sign:
 *  - "file"  → projects.file_path            (File-type projects)
 *  - "audio" → project_media_details.audio_file_path
 *  - "video" → project_media_details.video_file_path
 *  - "image" → project_media_details.image_file_path
 *  - "book"  → project_book_details.file_path (content_source='upload' Book projects)
 * Defaults to "file" for existing call sites. NOTE: the deployed
 * get-project-file function needs to be updated to branch on this —
 * see §6 below for the ready-to-paste function code.
 *
 * `action` only matters for kind: "book" — a book's uploaded PDF can
 * be allowed for download, in-app reading, both, or neither
 * (allow_download / allow_read_in_app), independently. The edge
 * function checks the matching column for whichever action was
 * requested, in addition to the usual owner/free/purchased gate.
 */
export function useGetProjectFile() {
  return useMutation({
    mutationFn: async ({
      projectId,
      kind = "file",
      action = "download",
    }: {
      projectId: string;
      kind?: "file" | "audio" | "video" | "image" | "book";
      action?: "download" | "stream";
    }): Promise<string> => {
      const { data, error } = await supabase.functions.invoke("get-project-file", {
        body: { project_id: projectId, kind, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.url;
    },
  });
}
```

**e) Known pre-existing bug, check before assuming it needs fixing:**
`export interface UpdateProjectInput { ... }` — at one point this
session found the `export interface UpdateProjectInput {` header line
missing entirely from upstream's own file (verified via
`git show HEAD:...`, not caused by any merge). It may already be
fixed by the time you read this (there were signs upstream was
starting to notice/fix it in later commits, but without the `export`
keyword or a doc comment). If you hit `error TS2304: Cannot find name
'UpdateProjectInput'` or similar, restore it as:
```tsx
// Full edit — content fields, price, and optionally status all in
// one save from the Edit page.
export interface UpdateProjectInput {
  id: string;
  title?: string;
  description?: string | null;
  external_url?: string | null;
  file_path?: string | null;
  thumbnail_url?: string | null;
  thumbnail_width?: number | null;
  thumbnail_height?: number | null;
  project_type?: ProjectType;
  price_usd?: number;
  promo_price_usd?: number | null;
  status?: ProjectStatus;
  is_private?: boolean;
  topic_ids?: string[];
}
```

### 4.2 `src/hooks/useProjectTypeDetails.ts`

Add `useMutation` to the existing `useQuery` import if it's not
already there (needed for the two save-progress hooks below). Then
add these two blocks, near the other `use*Details` query hooks
(`useMediaDetails`, `usePitchDetails`, etc.):

```tsx
// A 'book' project's content lives in one of three shapes — see the
// header comment on ako_projects_v9_book_type.sql for the full
// rationale. external_url/file_path are only ever set for their
// matching content_source; page_count is a display estimate, not the
// live source of truth (see BookReader/book_reading_progress for
// that). Publicly readable — browsing info, not the gated content
// itself (book_chapters, unlike this table, IS gated — see below).
export interface BookDetails {
  project_id: string;
  book_type: "book" | "article";
  content_source: "link" | "upload" | "authored";
  author_name: string | null;
  is_own_work: boolean;
  source_credit: string | null;
  external_url: string | null;
  file_path: string | null;
  allow_download: boolean;
  allow_read_in_app: boolean;
  page_count: number | null;
}

export function useBookDetails(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-book-details", projectId],
    queryFn: async (): Promise<BookDetails | null> => {
      const { data, error } = await supabase
        .from("project_book_details")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

// PDF-mode reading position (content_source 'link'/'upload', opened
// via BookReader's page-image renderer) — the current_page/total_pages
// half of book_reading_progress. Authored books use the
// current_chapter_id/scroll_fraction half instead — see
// useBookProgress/useSaveBookProgress in useBookBuilder.ts.
export interface PdfReadingProgress {
  current_page: number;
  total_pages: number | null;
}

export function usePdfReadingProgress(projectId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["pdf-reading-progress", projectId, userId],
    queryFn: async (): Promise<PdfReadingProgress | null> => {
      const { data, error } = await supabase
        .from("book_reading_progress")
        .select("current_page, total_pages")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.warn("book_reading_progress unavailable — has the migration run yet?", error);
        return null;
      }
      return data && data.current_page != null ? (data as PdfReadingProgress) : null;
    },
    enabled: !!projectId && !!userId,
  });
}

// Debounced by BookReader — not meant to write on every single page
// turn while someone's rapidly flipping through.
export function useSavePdfReadingProgress(projectId: string, userId: string | undefined) {
  return useMutation({
    mutationFn: async ({ currentPage, totalPages }: { currentPage: number; totalPages: number }) => {
      if (!userId) return;
      const { error } = await supabase.from("book_reading_progress").upsert(
        {
          project_id: projectId,
          user_id: userId,
          current_page: currentPage,
          total_pages: totalPages,
        },
        { onConflict: "user_id,project_id" }
      );
      if (error) throw error;
    },
  });
}
```

**Watch out for this exact bug** (happened once already in this
session): when merging this file, do NOT end up with a duplicated
trailing `.select("*").eq(...).maybeSingle(); if (error) throw error;`
fragment — it's an easy copy-paste artifact when splicing two
functions that share a common tail. Always re-view the merged result
and check brace balance (see §0).

### 4.3 `src/components/ProjectCard.tsx`

This is the file with the most integration points. Add:

1. **Imports**: `useBookDetails` from `useProjectTypeDetails`;
   `BookOpen` (may already be imported), `BookText`, and `LinkIcon`
   (`Link as LinkIcon`) from `lucide-react` if not already present.
2. **`isBook` const**, next to wherever `isMedia`/`isPitch` are
   declared: `const isBook = project.project_type === "book";`
3. **`bookDetails` query**, next to `mediaDetails`/`pitchDetails`:
   `const { data: bookDetails } = useBookDetails(project.project_type === "book" ? project.id : undefined);`
4. **`isBookDraftUnpublished` const** — **must be declared AFTER
   `bookDetails` is defined** (a real bug hit in this session: it
   referenced `bookDetails` before the query declaration existed
   yet, since it was originally grouped up near `isCourseUnpublished`
   which comes earlier in the file):
   ```tsx
   // Same "built as a draft, can't be bought until published" shape as
   // Course, but only for an authored book — a link/upload Book is
   // complete the moment it's created, same as File/URL.
   const isBookDraftUnpublished =
     project.project_type === "book" && bookDetails?.content_source === "authored" && !project.published_at;
   ```
5. **Three new handler functions**, near `handleOpenFile`/
   `handleOpenUrlLink`:
   ```tsx
   function handleOpenBookLink() {
     logFreeAccessIfNeeded("link_click");
   }

   async function handleDownloadBookFile() {
     if (!user) {
       navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
       return;
     }
     setError(null);
     const tab = window.open("", "_blank");
     try {
       const url = await getBookDownload.mutateAsync({ projectId: project.id, kind: "book", action: "download" });
       if (tab) tab.location.href = url; else window.location.href = url;
       logFreeAccessIfNeeded("download");
     } catch (err) {
       tab?.close();
       setError(err instanceof Error ? err.message : "Couldn't access file.");
     }
   }

   function handleOpenBookReader() {
     if (!user) {
       navigate(`/login?redirect=${encodeURIComponent(`/projects/${project.id}`)}`);
       return;
     }
     logFreeAccessIfNeeded("stream");
     navigate(`/projects/${project.id}/read`);
   }
   ```
   Also add `const getBookDownload = useGetProjectFile();` next to
   `getFileDownload`/`getAudioStream`/etc.
6. **A dedicated action block**, placed the same way `isMedia`'s
   `MediaChannelBlock` is placed — ABOVE the generic action row, not
   inside it — because Book's three `content_source` values need
   completely different actions (this mirrors how Media needed its
   own block instead of fitting the single-line File/URL pattern):
   ```tsx
   {isBook && bookDetails && hasAccess && (
     <div className="flex flex-col gap-3 mt-3">
       {bookDetails.content_source === "link" && (
         <div className="flex items-center gap-3">
           <a href={bookDetails.external_url ?? undefined} target="_blank" rel="noopener noreferrer"
              onClick={handleOpenBookLink} className="flex items-center gap-1.5 text-sm text-accent font-medium">
             <LinkIcon size={15} /> Open link
           </a>
           {/* Copy button — reuse whatever handleCopyLink/linkCopied
               state URL-type projects already use */}
         </div>
       )}
       {bookDetails.content_source === "upload" && (
         <div className="flex items-center gap-3">
           {bookDetails.allow_read_in_app && (
             <button onClick={handleOpenBookReader} className="flex items-center gap-1.5 text-sm text-accent font-medium">
               <BookText size={15} /> Read
             </button>
           )}
           {bookDetails.allow_download && (
             <button onClick={handleDownloadBookFile} disabled={getBookDownload.isPending}
                     className="flex items-center gap-1.5 text-sm text-accent font-medium disabled:opacity-50">
               <Download size={15} /> {getBookDownload.isPending ? "Preparing…" : "Download"}
             </button>
           )}
         </div>
       )}
       {bookDetails.content_source === "authored" && (
         <button onClick={() => navigate(`/books/${project.id}`)} className="flex items-center gap-1.5 text-sm text-accent font-medium">
           <BookOpen size={15} /> {isOwner && !project.published_at ? "Continue building" : "Read"}
         </button>
       )}
     </div>
   )}
   {isBook && bookDetails && !hasAccess && !isOwner && (
     <div className="flex items-center gap-1.5 text-sm text-ink-muted mt-3">
       <Lock size={15} /> Locked
     </div>
   )}
   ```
7. **Exclude `book` from the generic bottom-row logic** — add
   `!isBook` alongside the existing `!isMedia` exclusions in:
   - the generic `TYPE_ROUTE[project.project_type]` unlock button
   - the generic `Lock`/"Locked" span
   
   And add `!isBookDraftUnpublished` alongside `!isCourseUnpublished`
   in the Buy/Book pill condition, plus a matching
   `{isBookDraftUnpublished && isOwner && <span>Not published yet</span>}`
   next to Course's equivalent line.

### 4.4 `src/App.tsx`

Add two routes and two imports, near the `Course`/`/courses/:projectId` ones:

```tsx
import { Book } from "./pages/Book";
import { BookReader } from "./pages/BookReader";

// Public, same reasoning as Course — Book.tsx handles both the
// owner-builder view and the buyer-reader view itself, including its
// own "buy to unlock" state.
<Route path="/books/:projectId" element={<Book />} />
// Auth required — the PDF page-image reader for link/upload Book
// projects; ProjectCard redirects a logged-out visitor to /login
// before they ever reach this route.
<Route
  path="/projects/:projectId/read"
  element={
    <RequireAuth>
      <BookReader />
    </RequireAuth>
  }
/>
```

### 4.5 `src/pages/CreateProject.tsx` and `src/pages/EditProject.tsx`

Both need the same five additions (Edit's are slightly different —
noted inline):

1. Import `BookFields`/`EMPTY_BOOK_FIELDS`/`BookFieldsValue`, and (Edit
   only) `useBookDetails`.
2. `const [bookFields, setBookFields] = useState<BookFieldsValue>(EMPTY_BOOK_FIELDS);`
3. **Price auto-lock effect** (identical in both files except the
   `project?.project_type`/`projectType` variable name):
   ```tsx
   // A book credited to someone else can never be sold — mirrors the
   // server-side trigger (trg_enforce_book_no_monetization), kept in
   // sync here so the price field itself reflects it rather than
   // letting the host set a price that will just fail to save.
   useEffect(() => {
     if (projectType === "book" && !bookFields.is_own_work && priceUsd !== "0") {
       setPriceUsd("0");
       setShowPromo(false);
       setPromoPriceUsd("");
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [projectType, bookFields.is_own_work]);
   ```
4. **Validation branch** (Edit's is guarded by
   `bookFields.content_source !== "authored"` since an authored book
   has nothing to validate here — it's all managed in the builder):
   ```tsx
   if (projectType === "book") {   // EditProject: project.project_type === "book" && bookFields.content_source !== "authore
