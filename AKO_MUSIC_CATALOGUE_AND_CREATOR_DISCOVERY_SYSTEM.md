# AKỌ — MUSIC CATALOGUE, POST USAGE & CREATOR DISCOVERY SYSTEM

## Status
**Product specification / audit-and-upgrade specification**

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

## 8. One-minute clip
Creators select the best part of the song for Akọ posts.

Provide:
- real waveform
- draggable selection
- up to 60 seconds
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
If enabled:
- creator sets usage price
- user sees the price before purchase
- user purchases the permitted Akọ usage
- server confirms payment
- contributor distribution uses the agreed split
- all financial events use existing wallet/ledger architecture

The user is purchasing the permitted usage right, not ownership of the song.

Never trust client-supplied:
- price
- creator
- contributor split
- ownership
- payment status

## 15. Financial architecture
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
7. 60-second clip selector
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
- A real 60-second clip can be selected.
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

> **Artist uploads → publishes music → adds contributors → confirms rights → accepts licence → selects the best 60 seconds → publishes.**

Then:

> **Creator discovers → uses song in post → audience hears → taps attribution → discovers artist → discovers Projects.**

Free usage is primarily **free promotion and discovery**. Akọ does not owe the artist money merely because the free song was used.

If paid usage is introduced later, it becomes a real transaction and can use Akọ's existing payment/wallet/ledger systems.

Preserve stronger existing implementations. Fix what is missing or weak. Do not add complexity merely because another platform has it.

The goal is not:
> **“Akọ has music.”**

The goal is:
> **“Music can travel through the things people create on Akọ, and in doing so, lead people back to the people who made the music.”**
