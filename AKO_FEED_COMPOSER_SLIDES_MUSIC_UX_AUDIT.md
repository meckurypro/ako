# AKỌ — FEED COMPOSER, SLIDE UX & CATALOGUE MUSIC AUDIT

## Purpose

Audit and upgrade Akọ Feed publishing and audience consumption so the experience is soft, fast, familiar, polished, and unmistakably Akọ.

This specification covers:
- Feed composer and dynamic post modes
- Text posts
- Single-image posts
- Slide posts (1–10 images)
- Slide scrolling mode
- Slide focused viewing mode
- Catalogue music integration
- Music playback behavior
- Instagram/TikTok-inspired interaction conventions
- Performance and loading
- Gestures, accessibility, mobile UX
- Backend/data integrity, security, analytics, and testing

## Core Instruction to Claude

**Read the existing Akọ repository before changing the Feed. Do not rebuild blindly.**

Inspect the existing Feed, composer, post schema, media upload/storage, slide/carousel implementation, Feed ranking, Support/Disagree/Push back, comments, saves, shares, reposts, Prioritize, notifications, music/audio, responsive behavior, loading, caching/pagination, realtime, analytics, RLS, and backend mutations.

Preserve anything already strong. If the current implementation is stronger than a proposal here, preserve it and adapt this specification around it.

---

# 1. AKỌ FEED CONTENT MODEL

Akọ Feed currently has **no video**. Do not introduce video in this work.

## Mode A — Text Post

Contains:
- Heading
- Body
- Optional **ONE image**
- Optional catalogue music

A text post without an image is valid.

## Mode B — Slide Post

Contains:
- Heading
- **1–10 images**
- **No body**
- Optional catalogue music

## Music Is Not a Post Type

Catalogue music is an optional soundtrack layer, not a third post format.

Music is available for:
- Text + one image
- Slide Posts

Do not turn pure text-only posts into audio posts unless the existing product explicitly supports that and there is a compelling reason to preserve it.

---

# 2. DYNAMIC COMPOSER

The composer should infer the user's intent rather than forcing unnecessary format decisions.

If the user enters heading/body, it naturally behaves as a Text Post.

If the user adds one image, it remains a Text Post.

If the user chooses/builds a slide sequence, it becomes a Slide Post:
- Heading remains
- Body becomes unavailable
- 1–10 image sequence controls appear
- Music remains available

## Lock incompatible inputs

Once intent is obvious, incompatible controls should be disabled/hidden.

Examples:
- Body entered → do not simultaneously expose a body-compatible Slide mode.
- Multiple slide images → do not continue presenting single-image Text mode.
- No video control anywhere.

## Switching modes

Never silently destroy user content.

If body text would become invalid in Slide mode:
- preserve it temporarily where practical
- explain the consequence
- allow return to Text mode without losing writing

A confirmation may say:

> “Slide posts don't have a body. Switch to slides?”

Favor the least disruptive interaction.

---

# 3. COMPOSER UX

Audit the existing composer before redesigning it.

The hierarchy should be obvious:
1. What am I saying?
2. What visual am I attaching?
3. Do I want music?
4. Publish.

Avoid showing every possible control at once.

Audit heading:
- limits
- typography
- placeholder
- keyboard behavior
- focus
- validation
- mobile layout
- draft persistence if already supported

Audit body:
- multiline behavior
- expansion
- line breaks
- accidental-loss prevention

For Slide Posts, body is unavailable.

For Text Posts:
- maximum one image

For Slide Posts:
- minimum one image
- maximum ten images
- clearly show current count, e.g. `4 / 10`

---

# 4. SLIDE CREATION UX

Make slide creation feel intentional, not like a generic file picker.

Creator should be able to:
- add images
- remove images
- reorder images
- preview sequence
- replace images
- see upload progress
- retry failures
- cancel where appropriate

Touch reordering must work well on mobile; do not rely on hover.

Persist slide ordering server-side.

Audit:
- file type
- size
- dimensions
- orientation
- EXIF
- malicious files
- duplicate uploads
- partial uploads
- retries
- cleanup

Use existing secure upload architecture where strong.

---

# 5. SLIDE PREVIEW

Creator preview should reflect the real audience experience:
- heading
- image sequence
- transitions
- music attribution
- music behavior
- Feed appearance

Reuse shared rendering primitives where possible.

Do not create a fake preview materially different from the real Feed.

---

# 6. CATALOGUE MUSIC

Catalogue music is an optional soundtrack layer.

Expose it only where it makes sense:
- Text + one image
- Slide Posts

Do not make it mandatory.

Preferred composer control:

> `♫ Add music`

After selection:

> `♫ Song Title · Artist   ×`

The user must immediately understand that music is attached and removable.

## Music selector

Use the existing Akọ catalogue where possible.

Support, where already available:
- search
- artwork
- title
- artist
- featured artists
- preview
- selection
- recent selections if useful

Do not turn the composer into a full streaming application.

If the catalogue already defines a usable one-minute clip, the Feed should use that clip rather than creating another clip-selection system.

---

# 7. MUSIC ATTRIBUTION

Keep metadata minimal:
- small circular cover art
- song title
- creator/artist
- featured artist where applicable

Make attribution tappable where appropriate so music can create discovery:

**Post → song → music creator → creator profile/projects**

Do not imply that the poster owns the music.

---

# 8. SLIDE SCROLLING MODE

Slide Posts must work naturally inside the normal vertical Feed.

The audience should not need to leave Feed merely to move through slides.

Borrow familiar conventions from modern social media, especially Instagram and TikTok, while adapting them to Akọ.

## Gesture hierarchy

The Feed is vertical.

Slides are horizontal.

Audit and implement clear direction handling:
- horizontal intent → slide navigation
- vertical intent → Feed navigation
- tap → contextual action
- viewer back gesture/button → exit viewer

Audit touch thresholds, velocity, direction locking, nested scrolling, edge behavior, Android gestures, iOS gestures, and accessibility alternatives.

The user must never feel that Feed scrolling and slide navigation are fighting each other.

---

# 9. SLIDE NAVIGATION

Provide clear position feedback:
- dots
- segmented indicator
- `3 / 7`
- or another lightweight approach consistent with Akọ

It must work for 1–10 slides without becoming visually noisy.

Where appropriate, support:
- swipe left/right
- tap navigation
- accessible next/previous controls
- keyboard navigation on web

Do not make swipe the only navigation method.

---

# 10. SLIDE VIEWING MODE

Tapping a Slide Post should be able to enter a focused, more immersive viewer.

It should support, as appropriate:
- larger visual presentation
- horizontal navigation
- heading/context
- music
- Support
- Disagree
- Push back
- comments
- save
- share
- repost where supported
- creator/profile access
- close/back

Controls must not unnecessarily cover important image content.

This is an immersive viewer, not a new product.

---

# 11. IMAGE PRESENTATION

Audit:
- contain vs cover
- portrait, landscape, square
- mixed aspect ratios
- cropping
- letterboxing
- focal point
- background treatment
- low/high-resolution images
- decoding and loading

Never distort images.

If mixed aspect ratios are allowed, choose a deliberate, consistent audience experience.

---

# 12. TRANSITIONS AND MOTION

Akọ should feel:
- soft
- responsive
- modern
- alive
- lightweight

Avoid:
- excessive zoom
- unnecessary parallax
- exaggerated bounce
- long transitions
- animation that blocks interaction

Animations must never delay actual state changes.

---

# 13. MUSIC PLAYBACK

Implement a real audio state model:

- loading
- ready
- playing
- paused
- muted
- stopped
- failed

Respect browser/mobile autoplay restrictions.

If autoplay is unavailable:
- show a clear play affordance
- never pretend audio is playing

Only one relevant Feed soundtrack should play at a time.

When a post leaves the viewport, pause/stop according to the final playback policy and release resources appropriately.

Prevent overlapping audio from multiple posts.

---

# 14. SCROLLING VS VIEWING AUDIO

Define behavior deliberately.

### Scrolling mode
Music is associated with the post and follows viewport/audio rules.

### Viewing mode
Music becomes part of the focused visual experience.

Transitioning between modes must:
- avoid unnecessary restarts
- avoid duplicate audio instances
- avoid audible gaps caused by remounts where avoidable
- preserve explicit mute state appropriately

---

# 15. FEED PERFORMANCE

Do not mask performance problems with skeletons or artificial delays.

Audit actual causes:
- database queries
- N+1 queries
- image transformations
- CDN/cache
- pagination
- virtualization
- React re-renders
- subscriptions
- audio initialization
- network waterfalls
- duplicate requests
- ranking latency
- Supabase indexes/query plans
- mobile memory
- image decoding

For slides, intelligently preload the next/previous image where useful. Do not immediately preload all ten full-resolution images if that harms performance.

---

# 16. FEED SCROLL PERFORMANCE

Feed must remain smooth with:
- large images
- slide posts
- music
- interactions
- comments
- avatars

Audit frame drops, layout shifts, expensive effects, unnecessary mounting, off-screen audio, memory leaks, and abandoned requests.

Off-screen slide components should not behave like active viewers.

---

# 17. LOADING AND ERROR STATES

All asynchronous behavior must be real.

Cover:
- Feed loading
- image loading
- slide loading
- music loading/failure
- upload failure
- publishing failure
- interaction failures
- viewer initialization
- weak network
- offline
- retry

Do not use artificial `setTimeout` loading.

---

# 18. FEED ALGORITHM COMPATIBILITY

Do **not** create a second ranking system for Slide Posts.

A Slide Post remains one Feed post.

Existing architecture should continue to handle:
- candidate generation
- eligibility
- relevance
- social signals
- performance
- Prioritize
- diversity
- freshness
- repetition
- negative signals

Slide format must not automatically receive a ranking advantage simply because it has multiple images or music.

Audit whether slide completion, music interaction, saves, shares, and comments already belong in existing meaningful signals. Do not add ranking signals without evidence.

---

# 19. AKỌ INTERACTIONS

Preserve:
- Support
- Disagree
- Push back

Do not replace Akọ's interaction model with generic reactions just because benchmark platforms use different terminology.

Slide Posts should support the same meaningful engagement architecture as other Feed posts.

---

# 20. COMMENTS / SHARE / SAVE / REPOST

Comments remain attached to the post unless the existing product explicitly supports image-specific comments.

Opening/closing comments should preserve:
- Feed position
- slide position
- expected music state

Audit sharing, saving, and reposting:
- share the post, not an arbitrary image
- saved Slide Posts reopen correctly
- reposts preserve original identity
- music attribution is retained where appropriate
- deleted/unpublished content resolves gracefully

Do not duplicate business logic.

---

# 21. PRIORITIZE AND GIFT → PRIORITIZE

Slide Posts participate in the existing post-level Prioritize system.

Do not create a permanent creator boost or a special Slide algorithm.

If Gift → Prioritized Post is implemented, Slide Posts should work with it through the existing architecture.

Do not create a second gift-distribution mechanism.

---

# 22. RIGHTS AND SECURITY

Audit catalogue authorization and post permissions.

Never trust client-provided:
- song ownership
- song IDs without authorization
- royalty data
- artist metadata
- post ownership

Server must validate music attachment and publishing rights.

Audit:
- RLS
- storage policies
- post ownership
- catalogue permissions
- blocked users
- moderation
- signed URLs
- rate limits
- upload validation
- replay/tampering
- duplicate actions

The client is never authoritative.

---

# 23. DATA MODEL

Inspect the existing schema before changing it.

Prefer the existing post/media architecture if it already supports this.

Conceptually:

```text
post
  ├── heading
  ├── mode = text
  ├── body
  ├── optional media[1]
  └── optional music
```

```text
post
  ├── heading
  ├── mode = slide
  ├── media[1..10]
  └── optional music
```

Persist slide ordering server-side.

Enforce important invariants in the backend where practical.

Do not create duplicate post tables without strong architectural justification.

---

# 24. PUBLISHING INTEGRITY

Audit partial states:
- post created but images missing
- uploads succeed but post fails
- music attached but publish fails
- slide order lost
- network disconnect
- repeated publish
- app backgrounded during publishing

Use existing transaction/idempotency architecture where strong.

Never rely only on disabling a button to prevent duplicates.

---

# 25. EDIT / DELETE

Audit current product behavior for editing/deleting:
- text
- images
- slides
- music

If Slide editing exists, preserve ordering and validate 1–10 images.

If a capability does not exist, do not invent it merely because this document mentions it. Document the current product decision.

---

# 26. MODERATION

Moderation must consider the complete post:
- every slide
- heading
- body where applicable
- music metadata

Do not moderate only the first slide.

Respect blocked/deleted/moderated states.

---

# 27. ACCESSIBILITY

Audit:
- screen readers
- image descriptions where available
- next/previous controls
- keyboard navigation on web
- reduced motion
- touch targets
- contrast
- music controls
- viewer close control

Swipe must not be the only route through a slide sequence.

---

# 28. Z-INDEX / STACKING

Perform a systematic stacking-context audit for:
- Feed
- slide controls
- music control
- action bar
- comments
- share sheets
- menus
- modals
- image viewer
- navigation
- notifications
- toasts

Do not solve everything with arbitrary `z-index: 999999`.

Create a coherent layer hierarchy.

Respect mobile safe areas.

---

# 29. ICONS

Audit icon:
- size
- stroke weight
- alignment
- spacing
- touch target
- hierarchy
- consistency

Keep icons readable at mobile sizes.

Do not add decorative controls without purpose.

---

# 30. AKỌ VISUAL IDENTITY

Benchmark Instagram/TikTok for interaction familiarity, not branding.

Akọ should remain:
- soft
- cool
- intimate
- lightweight
- thoughtful
- culturally grounded
- visually restrained

The result should feel like Akọ, not an Instagram/TikTok clone.

---

# 31. SOCIAL MEDIA BENCHMARK

Before major changes, research current conventions in:
- Instagram feed/carousel behavior
- Instagram media viewing
- Instagram music attachment where applicable
- TikTok gesture/viewport conventions
- TikTok playback behavior
- modern mobile carousel accessibility

The goal is to learn:
- what users already understand
- what has become conventional
- what should be adapted
- what Akọ should deliberately do differently

Do not copy proprietary implementation details or branding.

---

# 32. BENCHMARK EVERY MAJOR ROUND

For each meaningful change round, compare Akọ against conventional social-media expectations.

Ask:
- Is it easier?
- Is it faster?
- Is it more familiar?
- Is it more accessible?
- Is it more reliable?
- Is it more Akọ?
- Did we accidentally add complexity?

---

# 33. RESPONSIVE / MOBILE

Audit:
- Android
- iPhone
- small phones
- large phones
- tablets/web where supported

Mobile is priority.

Respect:
- safe areas
- status/navigation areas
- aspect ratios
- gesture navigation
- keyboard behavior

---

# 34. WEAK NETWORK / OFFLINE

Audit:
- slow image loading
- failed slide loading
- music delays
- partial Feed
- retries
- caching
- stale content
- publishing while connection drops

Design graceful failure for inconsistent connectivity.

---

# 35. ANALYTICS

Use existing analytics architecture.

Useful events:
- Text Post creation
- Slide Post creation
- slide count
- composer abandonment
- mode switching
- music attachment/removal
- slide navigation/completion
- viewer opens
- music play/pause/mute
- shares
- saves
- Support
- Disagree
- Push back
- comments

Do not collect unnecessary sensitive content.

---

# 36. TEST MATRIX

Test:

## Text
- heading only
- heading + body
- heading + one image
- heading + body + one image
- eligible visual post + music
- pure text behavior according to final music policy

## Slides
- 1, 2, 5, and 10 slides
- 11 rejected
- 0 rejected
- mixed aspect ratios
- large images
- failed image
- reorder
- remove
- replace
- music attached/removed

## Navigation
- Feed → slide navigation
- slide → Feed
- Feed → viewer
- viewer → Feed
- viewer → comments
- viewer → share
- viewer → profile
- Android back
- iOS back gesture

## Audio
- play
- pause
- mute
- unmute
- leave post
- return
- enter viewer
- exit viewer
- network failure
- rapid post switching

## Composer
- mode switching
- body preservation
- image preservation
- music preservation
- failed publish
- retry
- duplicate tap
- app background
- network loss

---

# 37. PERFORMANCE ACCEPTANCE

Final implementation should demonstrate:
- responsive Feed rendering
- smooth scrolling
- responsive slide navigation
- sensible preloading
- no duplicate audio
- no runaway subscriptions
- no obvious memory leaks
- no major layout shifts
- no repeated requests caused by re-renders

Use real profiling where possible.

---

# 38. IMPLEMENTATION PHASES

## Phase 1 — Audit
Map current Feed, composer, schema, media, music, ranking, interactions, and performance.

## Phase 2 — UX architecture
Define Text mode, Slide mode, music layer, scrolling mode, viewing mode, gesture hierarchy, and state model.

## Phase 3 — Composer
Implement dynamic publishing behavior.

## Phase 4 — Audience Slide UX
Implement Feed scrolling and focused viewing.

## Phase 5 — Music
Integrate catalogue music.

## Phase 6 — Performance
Profile and fix real bottlenecks.

## Phase 7 — Security/Data Integrity
Verify contracts, RLS, validation, authorization, idempotency.

## Phase 8 — Mobile QA
Test real Android devices and iOS where available.

## Phase 9 — Benchmark
Compare with current conventional social-media UX.

## Phase 10 — Final audit
Confirm no regressions.

---

# 39. DO NOT OVERBUILD

Do not introduce:
- video
- livestreaming
- Stories
- Reels
- TikTok-style creator mode
- unnecessary editing suite
- complex transitions
- generic audio posts
- full streaming-service UI
- duplicate social reactions
- algorithm changes without evidence
- duplicate backend systems

The objective is excellent execution of the Feed Akọ already has.

---

# 40. CORE UX PRINCIPLES

A user should immediately understand:

> “I can say something.”

Add one image:

> “I can make this visual.”

Add several images:

> “I am making a slide post.”

Add music:

> “This gives my post a soundtrack.”

The user should never need to understand the database model.

## Slide principle

> **Familiar interaction, Akọ identity.**

The audience should immediately know how to move through slides without learning a new gesture system.

## Music principle

> **Music is atmosphere, attribution, and discovery — not the post itself.**

---

# 41. DEFINITION OF DONE

- [ ] Existing Feed architecture audited
- [ ] Existing strong implementation preserved
- [ ] Text Post works correctly
- [ ] Text + one image works correctly
- [ ] Slide Post works correctly
- [ ] Slide count enforced at 1–10
- [ ] Body unavailable in Slide mode
- [ ] Video not introduced
- [ ] Composer dynamically adapts
- [ ] Incompatible controls locked/hidden
- [ ] Mode switching does not silently destroy content
- [ ] Slide ordering reliable
- [ ] Upload/retry robust
- [ ] Scrolling mode works naturally inside Feed
- [ ] Viewing mode is immersive and usable
- [ ] Horizontal/vertical gestures do not fight
- [ ] Slide indicators clear
- [ ] Image aspect ratios handled intentionally
- [ ] Music available on eligible visual posts
- [ ] Music attribution clear
- [ ] Catalogue permissions server-authoritative
- [ ] Playback has real state handling
- [ ] Multiple audio instances cannot overlap
- [ ] Feed scrolling remains fast
- [ ] Images efficiently loaded
- [ ] Slide preloading is sensible
- [ ] Existing Akọ interactions work
- [ ] Comments work correctly
- [ ] Save/share/repost work
- [ ] Prioritize remains coherent
- [ ] Gift → Prioritize remains coherent where implemented
- [ ] Feed ranking is not duplicated
- [ ] RLS/security intact
- [ ] Publishing is idempotent
- [ ] Errors have recovery paths
- [ ] Weak-network states handled
- [ ] Z-index/stacking clean
- [ ] Touch targets appropriate
- [ ] Accessibility addressed
- [ ] Reduced motion addressed
- [ ] Analytics appropriate
- [ ] Android testing complete
- [ ] iOS testing complete where available
- [ ] Instagram/TikTok conventions benchmarked
- [ ] Akọ identity remains distinct
- [ ] No unnecessary features added
- [ ] No stronger existing implementation replaced blindly

---

# 42. FINAL INSTRUCTION TO CLAUDE

**Read the existing Akọ repository first.**

Do not blindly rebuild the Feed.

Understand what exists, what works, what is incomplete, what is slow, what is duplicated, and what is architecturally stronger than this specification.

Redesign the composer around two clear content modes:

**Text Post**
- heading
- body
- optional one image
- optional catalogue music

**Slide Post**
- heading
- 1–10 images
- no body
- optional catalogue music

Make the composer understand user intent dynamically and lock incompatible inputs without accidental data loss.

Then build two audience experiences for Slide Posts:

**Scrolling mode** — natural inside the Feed.

**Viewing mode** — focused and immersive.

Study current Instagram and TikTok interaction conventions before major UX decisions. Borrow patterns users already understand, especially horizontal visual navigation inside a vertical Feed, but do not copy their branding or turn Akọ into a clone.

Integrate Akọ Catalogue Music as an optional soundtrack layer for eligible visual posts. Keep the music UI lightweight, attribution clear, playback real, and permissions server-authoritative.

**Do not add video.**

**Do not create a second Feed algorithm.**

**Do not fake loading, audio, publishing, or backend state.**

Find actual causes of Feed slowness rather than masking them with animations.

Audit z-index and stacking contexts systematically.

Test on real mobile devices.

For every meaningful round of changes, compare the result against current conventional social-media UX and ask whether it is:
- easier
- faster
- more familiar
- more accessible
- more reliable
- more distinctly Akọ

The final experience should be familiar enough that users immediately know how to use it, but distinctive enough that it feels like **Akọ — not Instagram wearing an Akọ skin.**

**Add life, not noise. Make the Feed feel effortless.**
