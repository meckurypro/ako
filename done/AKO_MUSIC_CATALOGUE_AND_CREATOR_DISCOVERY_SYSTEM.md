# AKỌ — MUSIC CATALOGUE, POST USAGE & CREATOR DISCOVERY SYSTEM

## Status
**Product specification / audit-and-upgrade specification**

**Updated by this amendment (§33):** the Music Catalogue's own "future
paid usage" (§14/15) is retired — usage is free/discovery only from
here on. In its place, the *general Media Project type* (not just
Audio Projects headed for the catalogue) gets a parallel model: no
price tag, gifting instead, splitting immediately across accepted
collaborators. See §33 for the full spec; §8/31/32's "60 seconds" is
also now 30 throughout (clip cap tightened after this doc was
written — code and DB now agree, this doc didn't until now).

## 1. Product idea
Akọ is not building a Spotify, Apple Music, or general-purpose music streaming service. Music is an expressive layer for Akọ's image, carousel, and text posts.

The goal is:
> Let creators publish music into Akọ so other people can use that music in their creations, discover the musician, and potentially discover or purchase the musician's other Projects.

## 2. Core model
**Audio Project → Publish Music to Akọ → Catalogue → Use in post → Music attribution → Creator profile → Other Projects**

The catalogue is a publishing/discovery layer over an existing Audio Project, not a second unrelated content system.

## 3. Initial economics
Akọ does **not** promise to pay musicians merely because their free music is used in posts.

Free catalogue music is a discovery/promotion mechanism:
- Artist gets exposure, attribution, profile visits, and potential Project discovery/sales.
- Akọ gets a richer creative ecosystem.
- Users get music for their posts.

Do not create fake royalties or wallet balances for free usage.

### Future paid usage
A creator may eventually set a price for the permitted use of the selected Akọ clip:
> **Use this song — ₦X**

That payment becomes a real transaction and can use Akọ's existing secure payment/wallet/ledger architecture.

Do not make paid usage mandatory for the initial catalogue.

## 4. Publish Music flow
A creator first creates an existing **Audio Project**, then selects:
> **Publish Music to Akọ**

Collect/validate:
- Song title
- Primary artist
- Cover art
- Featured artists
- Contributors
- Usage mode
- Usage price if enabled
- Selected clip
- Rights declaration
- Licence agreement/version

Reuse existing Project, storage, notification, profile, payment, wallet, and admin architecture.

## 5. Contributors
Creators can tag Akọ users as:
- Artist
- Featured Artist
- Songwriter
- Producer
- Beat Maker
- Composer
- Mixing Engineer
- Mastering Engineer
- Other Contributor

Contributor relationships should point to real Akọ accounts where possible.

Adding a contributor should create an auditable relationship and appropriate notification.

If paid usage is enabled, contributor splits must be server-authoritative and total exactly 100%.

Example:
- Artist — 50%
- Producer — 30%
- Songwriter — 20%

Never trust client-supplied percentages or wallet destinations.

## 6. Rights declaration
Before publishing, require a declaration substantially equivalent to:

> I confirm that I own or control the rights necessary to publish this music on Akọ and authorize its use in Akọ posts under the Akọ Music Licence.

The exact legal wording must be reviewed by qualified counsel.

Uploading a file is not proof of ownership.

The flow must account for:
- labels
- co-writers
- producers
- featured artists
- samples
- third-party compositions
- other rightsholders

## 7. Akọ Music Licence
Publishing requires explicit acceptance of the applicable licence.

Record server-side:
- user
- Project
- catalogue entry
- agreement version
- timestamp
- rights declaration
- contributor/split state
- publication state

Do not overwrite historical acceptance records when the agreement changes.

The licence must clearly state that publishing does **not** transfer ownership of the underlying music to Akọ. Akọ receives only the permissions granted by the agreement.

This product specification is not legal advice. Have the final agreement reviewed by qualified Nigerian IP/copyright counsel before launch.

## 8. Thirty-second clip
Creators select the best part of the song for Akọ posts.

Provide:
- real waveform
- draggable selection
- up to 30 seconds
- preview
- play/pause
- confirm

The creator must know exactly which section will be available.

Do not fake the waveform.

## 9. Catalogue representation
Conceptually:
- `music_catalogue_id`
- `project_id`
- `creator_id`
- title
- cover art
- audio asset / derived clip
- clip start
- clip duration
- publication status
- usage mode
- usage price
- rights status
- licence version
- published timestamp

Adapt to existing schema conventions. Do not duplicate Project business logic unnecessarily.

## 10. Add music to post
While creating an eligible image/carousel/text post:
> **Add music**

Search the Akọ catalogue.

Results show the minimum useful information:
- small circular cover
- title
- creator
- featured artist where applicable

Select the song and publish.

## 11. Post music UI
Keep it minimal.

Example:
> ○ **Song Title**  
> Artist · feat. Artist

The post remains the content. Music should not visually compete with the carousel or text.

## 12. Music discovery
Tapping attribution opens a lightweight music surface:
- cover
- title
- artist
- featured artists
- **Use in my post**
- **View creator**
- Audio Project
- other Projects

Core loop:
> Music → Artist → Profile → Projects

A listener may follow the artist or purchase another Project.

## 13. Free music
**Superseded by §33 — this is now the ONLY mode, not one of two.**

Free usage should be treated as catalogue/discovery usage.

Track analytics such as:
- posts using song
- unique creators
- attribution taps
- profile visits
- Project visits
- saves where appropriate

Do **not** display “royalty earned” or create pending financial balances for free usage.

## 14. Paid music usage — future
**Retired — see §33.** The Music Catalogue never shipped this; it will
not ship it. `music_catalogue.usage_mode` is now DB-constrained to
`'free'` and `usage_price_usd` to `NULL` — a stale/bypassed client
cannot resurrect this by itself. Left in place below only as a record
of what was considered and explicitly not built.

~~If enabled:~~
~~- creator sets usage price~~
~~- user sees the price before purchase~~
~~- user purchases the permitted Akọ usage~~
~~- server confirms payment~~
~~- contributor distribution uses the agreed split~~
~~- all financial events use existing wallet/ledger architecture~~

~~The user is purchasing the permitted usage right, not ownership of the song.~~

Never trust client-supplied:
- price
- creator
- contributor split
- ownership
- payment status

## 15. Financial architecture
**Partially superseded by §33** — "For paid usage" below never
applied to the Music Catalogue (see §14) and now doesn't need to: the
same list of properties (immutable ledger, idempotent transactions,
server-side authorization, exact money precision, audit trail) is
instead what `process_media_gift` upholds for Media gifting.

For paid usage:
- immutable ledger
- idempotent transactions
- server-side authorization
- verified webhooks
- concurrency protection
- refund/chargeback handling
- exact money precision
- audit trail

Do not create a separate “music wallet.”

For free usage, keep usage analytics separate from financial ledger events.

## 16. Publication states
Use explicit states such as:
- Draft
- Rights confirmation required
- Licence acceptance required
- Published
- Unpublished
- Suspended
- Rights review
- Takedown
- Reinstated

Adapt to existing architecture.

## 17. Unpublish and takedown
Define separately:
- whether new posts can use the song
- what happens to existing posts
- what happens to drafts
- what happens to paid licences
- what happens during rights disputes

Provide an auditable rights complaint/takedown process.

## 18. Admin
Admin should be able to:
- review catalogue entries
- suspend/remove/reinstate songs
- inspect rights/licence state
- inspect contributor relationships
- view usage analytics
- handle complaints
- disable music publishing if necessary
- disable paid usage if enabled

Admin remains server-authorized and auditable.

## 19. Security
Audit:
- Supabase RLS
- storage policies
- signed URLs
- audio access
- catalogue permissions
- contributor permissions
- licence records
- price validation
- split validation
- idempotency
- race conditions
- duplicate purchases
- unauthorized publication/unpublishing
- wallet writes

The client is never authoritative for rights, ownership, price, splits, or financial state.

## 20. Audio security and delivery
Separate, where appropriate:
- original private Project audio
- public/preview catalogue asset
- selected Akọ clip
- authorized paid-use asset

Do not expose the creator's original private Project merely because a derived catalogue clip is usable.

Audit formats, transcoding, waveform generation, CDN, caching, and signed access.

## 21. Feed performance
Music must not make the image/carousel feed slow.

Audit:
- lazy loading
- audio preloading
- CDN
- catalogue joins
- cover sizes
- audio decoding
- mobile memory
- weak networks
- caching

Prefer metadata first and audio only when relevant/needed.

## 22. Playback UX
Define and test:
- play/pause
- autoplay policy
- mute
- one active soundtrack at a time
- leaving feed
- scrolling
- headphones/Bluetooth
- data-saving behavior
- accessibility

Never allow multiple post soundtracks to overlap.

## 23. Search and profiles
Search by:
- song title
- artist
- featured artist
- relevant contributor fields where useful

A musician remains an Akọ creator. Do not create a separate musician account system unless future evidence requires it.

The shortest discovery path should be:
> **Post → Song → Creator → Projects**

## 24. Future external catalogue
Do not build Spotify/Apple Music integration now merely for architectural purity.

Design the music layer so a future **licensed** external catalogue could coexist with native Akọ music.

A future partnership with a service such as Josplay would require an agreement that specifically permits Akọ's intended use of music alongside visual user-generated posts. A normal streaming API does not automatically grant synchronization/social-post rights.

This is future scope.

## 25. Rights safety
The catalogue must not become a mechanism for uploading popular music without authorization.

Implement:
- rights declaration
- licence acceptance
- reporting/takedown
- appropriate uploader representations
- moderation/review
- repeat-infringer handling where legally appropriate
- audit trail

## 26. Notifications
Examples:
> **You were added as a contributor to “Song Title.”**

If paid usage later exists:
> **Your music was licensed for use in an Akọ post.**

Rights actions should also notify affected creators where appropriate.

## 27. Artist analytics
Potential dashboard:
> **Ogene**
>
> Used in 384 posts  
> 12,430 people encountered your music  
> 820 music-page visits  
> 210 profile visits  
> 34 Project visits

Only display metrics that are actually implemented and accurately defined.

## 28. Future Akọ Music Fund
A future platform-funded music pool could be introduced later, but it is **not part of the initial model**.

Do not create a hidden obligation that Akọ pays artists per free use.

If a future fund is introduced, it requires a separate business, financial, rights, and legal specification.

## 29. V1 priority
Prioritize:
1. Existing Audio Project
2. Publish Music to Akọ
3. Rights declaration
4. Licence acceptance/versioning
5. Contributor tagging
6. Contributor notifications
7. 30-second clip selector
8. Catalogue
9. Add music to post
10. Minimal attribution
11. Song → creator discovery
12. Free usage
13. Usage analytics
14. Unpublish/takedown foundation
15. Security/RLS
16. Performance

Do not overbuild.

## 30. Testing
Test:
- publication
- invalid audio
- missing metadata
- clip boundaries
- rights declaration
- licence acceptance
- contributor tagging
- split totals
- notifications
- free usage
- paid usage if enabled
- suspended/deleted songs
- unpublish
- takedown
- post editing
- network failures/retries
- duplicate actions
- RLS bypass
- storage access
- client price/split manipulation
- wallet integrity
- weak-network mobile performance
- audio overlap
- large catalogue/feed

## 31. Definition of Done
Akọ Music is complete when:
- Audio Projects can be published to the catalogue.
- Rights declaration and licence acceptance are recorded.
- Contributors can be tagged and notified.
- A real 30-second clip can be selected.
- Users can search and attach catalogue music to eligible posts.
- Attribution is minimal, polished, and clickable.
- Attribution leads to creator discovery.
- Free usage creates no false financial obligation.
- Paid usage, if enabled, uses secure existing financial infrastructure.
- Unpublish/takedown behavior is defined.
- Admin can review and moderate catalogue entries.
- RLS/storage/security are audited.
- Feed performance remains strong.
- Audio behavior is coherent on mobile.
- Legal agreements are professionally reviewed.
- Existing stronger architecture is preserved.
- No duplicate Project/payment/wallet business logic is introduced.

## 32. Final instruction to Claude
Read the existing Akọ repository first.

Do not rebuild blindly.

Do not build a Spotify clone.

Do not create a second Project system.

Treat **Publish Music to Akọ** as a publishing/discovery layer on top of the existing Audio Project.

The intended initial loop is:

> **Artist uploads → publishes music → adds contributors → confirms rights → accepts licence → selects the best 30 seconds → publishes.**

Then:

> **Creator discovers → uses song in post → audience hears → taps attribution → discovers artist → discovers Projects.**

Free usage is primarily **free promotion and discovery**. Akọ does not owe the artist money merely because the free song was used.

If paid usage is introduced later, it becomes a real transaction and can use Akọ's existing payment/wallet/ledger systems.

Preserve stronger existing implementations. Fix what is missing or weak. Do not add complexity merely because another platform has it.

The goal is not:
> **“Akọ has music.”**

The goal is:
> **“Music can travel through the things people create on Akọ, and in doing so, lead people back to the people who made the music.”**

## 33. Media: no price tag, gifting, preview & discovery (amendment)
This section supersedes §13-15 above and extends the catalogue's
"discovery, not a storefront" principle to the *general Media Project
type* — audio, video, and photography — not just Audio Projects
headed for the Music Catalogue. It also tightens the in-app preview
itself (length, looping, which channel takes priority) and closes the
collaborator-discovery loop the original spec didn't fully cover.

### 33.1 What Media is, and isn't
A Media project is Akọ's preview/discovery surface for a piece of
audio, video, or photography — not a place to buy the full asset.
Two ways to bring it in, same as the original Audio Project model
(§4's "reuse existing... architecture" principle, generalized):
- **Upload** a file, if the creator wants it playable/viewable right
  here as a preview.
- **Link** to where the full thing actually lives — professional
  streaming (Spotify, YouTube, a portfolio site, Fanlink, etc.).
Both can be present on the same channel at once (upload for preview,
link for the real thing) — see MediaFields/MediaDetails' hybrid model.

### 33.2 No price tag, ever
A Media project can never carry a `price_usd`/`promo_price_usd` — the
full asset streams elsewhere via its link; charging for a preview
would be charging for the wrong thing. Enforced at the DB level
(`projects_media_no_price` CHECK constraint — a bypassed/stale client
cannot set one) and in CreateProject/EditProject's UI (no price field
shown for `project_type = 'media'`, same pattern as Pitch).

### 33.3 Gifting instead
In place of a price tag: anyone can **gift** the creator(s) of a
Media project directly, the same mechanism already used on posts.
A gift on a Media project **splits immediately** across:
- every collaborator with an **accepted** status and a `split_percent`
  on `project_collaborators`, each getting their percentage of the
  net (post-platform-fee) amount, and
- the owner, who gets the remainder (100% minus whatever's been given
  to collaborators) — so a Media project with zero collaborator
  splits behaves exactly like gifting a post: 100% to the owner.

Each recipient's share credits their own wallet in the same
transaction (`apply_wallet_transaction`, `type = 'gift_received'`)
and they each get their own notification — a collaborator finding out
they were gifted doesn't depend on the owner telling them. The
`gifts` row itself keeps a single "primary" recipient (the owner) for
backward-compatible single-recipient displays/analytics; the real
per-recipient breakdown lives in `gift_splits` (one row per credited
party, each pointing at its own wallet transaction).

Implementation: `process_media_gift(p_sender_id, p_project_id,
p_gift_type_id)` — mirrors `process_gift`'s ledger pattern (fee
lookup, duplicate-submission guard, feature-flag check, exact
rounding) but fans the credit side out across multiple recipients
instead of one. Client-side: `useSendMediaGift` / `GiftPicker`'s
`projectId` prop, wired into `ProjectCard`'s engagement tray as a
Gift action for non-owner viewers of a Media project.

Never trust client-supplied: gift amount, split percentages, or
recipient list — all of it is looked up server-side inside the RPC
from `gift_types`, `project_collaborators`, and `platform_fees`.

### 33.4 Preview length and looping
The in-app preview (the uploaded-file path, not the external link) is
capped at **30 seconds** for both audio and video — bumped from an
earlier 20s cap, and now matching the Music Catalogue's own clip cap
(§8) so a published catalogue clip and an in-app Media preview never
disagree on "how much do you get for free." (See MediaPreviewPlayer,
SongCoverPlayer.)

The preview **loops** rather than stopping dead at the cap or at
natural end — a visitor who lets it finish, or who scrubs past 30s,
just hears/sees it again from the top. This applies uniformly to
every preview shape below.

### 33.5 Audio thumbnail is the play button
When a Media project has an audio channel (and isn't also showing a
video preview — see 33.6), its cover art *is* the play/pause control:
tapping it starts/pauses the loop, with a Play/Pause icon overlaid on
the cover (a Music-note placeholder if there's no cover image). This
is the thumbnail treatment everywhere the card renders — feed, grid,
profile, detail — not just the project's own detail page. Only the
detail page eagerly loads and autoplays it the moment the page opens;
everywhere else, the first tap is what loads and starts it (a feed
full of audio cards must not fire a signed-URL request for every one
just for being on screen).

### 33.6 Audio + video together: video wins the preview
When a Media project has **both** an audio and a video channel, the
thumbnail preview shows the **video only** (looping, capped at 30s,
same as any other video preview) — a second audio preview playing
underneath/alongside it would just be noise. In its place, a single
button ("Listen to the full song") sends people to the audio
channel's own link (Spotify, Fanlink, etc.) if one is set, rather
than rendering a second full preview block for the audio channel.

### 33.7 Share, save, gift
All three already exist as first-class actions on the Project card
generally (Save/Share via the existing engagement tray) — Media gets
the same, plus Gift specifically (33.3), which no other Project type
carries since Media is the one type that structurally can't be
purchased.

### 33.8 Discovery: Media on collaborator profiles too
A Media project shows up on **both** the owner's profile and every
accepted collaborator's profile, not just the owner's — the same
principle as its gift split: if a collaborator's cut of a gift lands
in their wallet the moment someone gifts it, that Media should be
findable on their profile too, not just the owner's. A dedicated
"Media" profile tab merges: Media the account owns (active, public)
and Media where the account is an accepted collaborator (via
`get_profile_collaborator_media` — a `SECURITY DEFINER` RPC, needed
because `project_collaborators`' own RLS only lets someone see rows
where *they* are the collaborator/inviter, not an arbitrary visited
profile's rows). A collaborator's own edit/manage affordances never
appear on a Media project they don't own — appearing on their profile
is a discovery/credit surface, not a management one.

### 33.9 Publishing to the Music Catalogue is unchanged
An Audio Project (Media project with an audio channel) still gets the
existing "Publish Music to Akọ" option (§4) once it has an uploaded
audio file — this amendment doesn't touch that flow. The two systems
compose: a song can be both gift-able as a Media project on its own
Akọ page/profile, *and* published to the catalogue for use inside
other people's posts (§9-13) — they're not exclusive.
