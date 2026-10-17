-- ako_book_pdf_chapters.sql
--
-- Uploaded-PDF books now also get reflowable chapters in book_chapters, extracted by the `extract-book-pdf` edge
-- function, so they read in the same in-app reader as books written in Akọ.
--
-- book_chapters holds real text, so it must honour the host's "allow read in app" switch: a host who allowed only
-- Download must not have the text readable through the API. The owner always keeps access; everyone else needs the
-- usual access (purchase, or free + published + not privacy-blocked) AND, for an uploaded-PDF book, read-in-app on.

begin;

drop policy if exists "book_chapters_select_gated" on public.book_chapters;

create policy "book_chapters_select_gated"
  on public.book_chapters for select
  using (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.projects p
      where p.id = book_chapters.project_id
        and (
          p.owner_id = (select auth.uid())
          or (
            (
              exists (
                select 1 from public.purchases pu
                where pu.project_id = p.id and pu.buyer_id = (select auth.uid())
              )
              or (
                p.status = 'active'
                and p.published_at is not null
                and coalesce(p.promo_price_usd, p.price_usd) <= 0
                and (
                  p.is_private = false
                  or exists (
                    select 1 from public.project_members pm
                    where pm.project_id = p.id and pm.user_id = (select auth.uid())
                  )
                )
              )
            )
            and not exists (
              select 1 from public.project_book_details d
              where d.project_id = p.id
                and d.content_source = 'upload'
                and d.allow_read_in_app = false
            )
          )
        )
    )
  );

commit;
