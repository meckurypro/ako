# Offers (bundles)

A creator bundles **2+ of their own paid projects** at one price (max **10 offers** each). Buying an offer unlocks
every project in it. When someone taps **Buy** on a project that is part of an offer, the app first shows a quiet
"Better together" sheet: each project's own price, the offer price, the saving, and a small "Just this one" link.

Money is USD like the rest of the platform (`price_usd` / `amount_usd`).

## Deploy

Run `supabase/ako_offers.sql` once in the SQL editor of **each** project (Ako Temp already has it). It is idempotent.
No edge function is involved: the client calls the RPCs directly (they are `SECURITY DEFINER` and check `auth.uid()`).

## How access works

Access to a paid project *is* a row in `purchases (buyer_id, project_id)` — book chapters, course modules/lessons,
meetings and talent reviews all gate on it. `process_offer_purchase()` therefore creates **one `purchases` row per project**
(stamped with the new `purchases.offer_id`), in a single transaction, mirroring `process_project_purchase()` per project:

- the offer price is split across the projects in proportion to their effective (promo-aware) prices; the last project
  absorbs the rounding remainder so the shares add up to exactly the offer price,
- platform fee (`platform_fees.kind = 'project_purchase'`) and affiliate commission are applied per project,
- one wallet debit/credit per project (metadata carries `project_id`, `buyer_id`, `offer_id`, so the existing
  "project purchased" notification and wallet history keep working),
- the buyer is never charged without being unlocked (any failure rolls everything back).

## Rules (enforced in SQL, not just the UI)

- 2+ projects, all the caller's own, `active`, public, **paid**, and (for courses) published.
- Offer price must be **lower than the sum** of the projects' current prices, and greater than 0.
- No two offers with exactly the same set of projects. Max 10 offers per creator (serialised with an advisory lock).
- Eligible types: `book`, `course`, `media`, `file`, `url`, `meeting`. **Not** `event`/`room` (their purchase issues
  tickets / room membership), `gig` (booking flow), `pitch` (no price). Adding these means replicating those side effects
  inside `process_offer_purchase`.
- Clients are read-only on `offers` / `offer_items` (RLS: owners can select; all writes go through the RPCs).

## What buyers see

`get_project_offers(project_id)` returns up to 3 valid offers containing the project, best saving first. It returns
nothing when: the viewer is signed out, is the creator, or **already owns any project in the offer** (an offer they'd
partly pay for twice is never suggested; v1 has no pro-rating). `process_offer_purchase` rejects such a purchase too.

If a creator later archives a project, makes it private/free, or raises a price so the offer no longer undercuts buying
separately, the offer silently stops being suggested and shows a "Not shown to buyers" note in the creator's list
(`get_my_offers()` → `is_valid` / `problem`). Deleting a project that leaves an offer with <2 projects removes the offer.

## Where it lives

| Piece | File |
| --- | --- |
| Schema + RPCs | `supabase/ako_offers.sql` |
| Hooks | `src/hooks/useOffers.ts` |
| Creator screen (`/activity/offers`) | `src/pages/Offers.tsx` |
| Checkout suggestion | `src/components/OfferNudgeSheet.tsx`, wired into `ProjectCard.tsx` and `pages/Book.tsx` |
