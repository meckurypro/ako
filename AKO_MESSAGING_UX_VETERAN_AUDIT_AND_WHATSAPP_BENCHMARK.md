# AKỌ — Veteran Messaging UX Audit, WhatsApp Benchmark & End-to-End Chat Revamp
This specification upgrades the EXISTING Akọ Message/Chat UI. It is not a blind rebuild.

Goal:
> Make Akọ messaging as immediately understandable and effortless as WhatsApp, while giving it Akọ personality, performance, motion, sound, and privacy.

Claude must act as a veteran UX/product designer, interaction designer, mobile UI specialist, frontend/realtime engineer, audio/media UX specialist, performance engineer, accessibility specialist, and security-minded messaging architect.

FIRST RULE: inspect the existing repository and preserve anything already strong. Map the current chat routes, components, database, Supabase queries/RLS, realtime, storage, media, audio, message states, notifications, navigation, animations, sounds and performance before changing anything.


# 1. WhatsApp research benchmark
Claude MUST research current WhatsApp messaging UX before major changes and re-check official sources during implementation.

Research at minimum:
- chat list and conversation navigation
- message bubbles, timestamps and delivery/read states
- reply
- reactions
- selection/context actions
- edit
- delete for me / delete for everyone
- forwarding/sharing
- media
- view-once photo
- view-once video
- view-once voice message
- voice recording
- pause/resume
- draft review
- waveform
- playback
- playback speed
- playback position
- attachment UX
- privacy/security messaging
- loading/performance conventions
- keyboard behavior
- notifications/deep links

Official baseline sources:
- https://faq.whatsapp.com/1077018839582332
- https://faq.whatsapp.com/578442220724722/
- https://faq.whatsapp.com/1370476507114859/
- https://faq.whatsapp.com/673193694148537
- https://about.fb.com/news/2022/03/new-voice-message-features-on-whatsapp/
- https://faq.whatsapp.com/236979282604093
- https://faq.whatsapp.com/990878486361178/

Important documented WhatsApp voice behaviors include pause/resume recording, waveform visualization, draft preview, remembered playback position, faster playback such as 1.5x/2x, and out-of-chat playback in supported experiences. WhatsApp also documents view-once photos, videos and voice messages.

Do not copy WhatsApp branding. Study why the interactions work.


# 2. Benchmark after every meaningful change
For EVERY meaningful round of chat UI/UX changes, Claude must compare the result with current WhatsApp.

Ask:
- Is Akọ equally obvious?
- Is the interaction equally fast?
- Are icon sizes/placements equally intuitive?
- Are touch targets comfortable?
- Is the composer equally easy?
- Is voice recording equally effortless?
- Are message actions equally discoverable?
- Are media interactions equally clear?
- Are animations equally restrained?
- Is feedback immediate?
- Has Akọ introduced unnecessary friction?
- Is Akọ better anywhere?
- Is WhatsApp better anywhere?
- If different, is the difference intentional?

Document regressions instead of assuming every custom Akọ treatment is an improvement.


# 3. Akọ visual direction
Preserve the established Akọ identity:
- green/orange
- soft/light feeling
- clean typography
- restrained cultural personality
- subtle motion
- intimate conversation atmosphere

Messaging must be quieter than Feed/Discover.

Do NOT fill chat with decorative cultural patterns, heavy gradients, oversized icons, excessive shadows, or constant animation.

Use Akọ personality through restrained color, typography, icon treatment, motion, privacy language and carefully chosen empty states.

Core principle:
> Familiar first, Akọ second.

A user who already knows WhatsApp should not need to learn how to chat on Akọ.


# 4. Existing chat audit
Before coding, inventory:
- chat list
- conversation route
- header
- message list
- message bubble
- composer
- attachments
- media viewer
- audio/voice code
- reply
- reactions
- delete/edit
- forward/share
- view-once
- read/delivery state
- typing/presence
- unread state
- realtime subscriptions
- notifications/deep links
- database queries
- indexes
- RLS
- storage
- signed URLs
- optimistic updates
- pagination
- caching
- loading/error/retry
- animation
- sound
- mobile/keyboard behavior

Rate the existing system 1–10 for visual quality, familiarity, navigation, readability, composer, keyboard, scrolling, speed, voice, media, replies, reactions, deletion, sharing, view-once, animation, sound, accessibility, errors, mobile behavior, consistency and Akọ identity.

Be honest. Separate excellent, acceptable, weak, broken, missing and unfinished.


# 5. Chat list and conversation shell
Audit chat-list avatar size, name hierarchy, last-message preview, timestamps, unread state, mute/pin if supported, typing/presence, media/voice previews, search, empty/loading states and navigation.

Audit the conversation header for back navigation, identity, presence and appropriate chat actions. Do not overcrowd it.

Audit message bubbles for spacing, radius, typography, timestamp, delivery/read state, long text, links, replies, media and voice.

Audit selection mode and contextual actions:
Reply, React, Copy, Forward/Share, Delete, Edit where supported, Save/Keep where supported.

Selection must clearly show number selected, available action and cancellation.


# 6. Composer and replies
The composer is a primary product surface.

Audit text input, attachment, camera/media, emoji if supported, microphone, send button, reply preview, recording mode, media preview, loading, disabled state, keyboard, safe areas, multiline expansion and draft preservation.

Replying should:
- quote the original
- identify context
- have an obvious cancel action
- preserve keyboard focus
- not jump the UI unnecessarily
- work with text/media/voice where appropriate
- allow tapping the reply to locate the original

Do not cause reaction/reply operations to rerender the entire conversation or jump the scroll.


# 7. Voice notes — first-class end-to-end feature
Voice notes are a major focus. They must be fully wired end to end:

microphone permission
→ recording
→ real local audio state
→ pause/resume
→ stop
→ review
→ discard/re-record
→ optional view-once
→ upload
→ storage
→ message creation
→ realtime delivery
→ recipient rendering
→ playback
→ progress
→ speed
→ read/open state
→ delete
→ cleanup

No fake timer, fake waveform, fake upload, fake playback, or client-only success.

Treat voice as a first-class message type, not an audio-file attachment.


# 8. Voice recording UX
Implement explicit states.

IDLE:
- microphone action

RECORDING:
- elapsed time
- real waveform/amplitude
- recording indicator
- pause
- stop/finish
- discard/cancel
- send
- view-once toggle if supported

PAUSED:
- microphone is actually paused
- timer stops
- waveform stops
- resume
- discard
- review
- send

REVIEW:
- play/pause
- waveform
- progress/scrub
- duration
- discard
- re-record if appropriate
- send
- view-once if supported

UPLOADING:
- real upload state
- retry/error handling

SENT:
- waveform
- play/pause
- progress
- duration
- delivery/read state

FAILED:
- retry
- discard/delete
- clear error

Study WhatsApp's recording interaction, including familiar lock/hold behavior where appropriate. Do not introduce multiple competing gestures without a reason.


# 9. Voice recording correctness
Pause/resume must be real. Multiple pauses must work. Resuming must continue the same draft without corruption or accidental silence.

Test:
- immediate pause
- multiple pauses
- pause after long recording
- permission denial
- app background/foreground
- incoming call/audio interruption
- network loss
- device interruption
- Bluetooth/headset microphone
- app termination during recording

Review must allow listening before sending. Never force a user to send an audio note merely to hear it.


# 10. Voice playback
Audit:
- play/pause
- waveform/progress
- duration
- scrub
- replay
- remembered position
- speed
- scrolling away
- leaving/re-entering chat
- another voice note starting

Investigate 1x, 1.5x and 2x. The speed control must be discoverable without dominating the bubble.

Prefer one active voice playback at a time unless there is a compelling reason otherwise.

Audio progress must not rerender the entire message list.


# 11. View-once voice, photo and video
Akọ should support view-once voice, photo and video if the current product/security architecture can support them correctly.

Do not implement view-once as a decorative “1” icon.

Define explicit server-authoritative states such as:
created → uploaded → delivered → unopened → opened/consumed → expired/deleted.

For view-once content:
- no normal replay after consumption
- no normal forwarding/share/copy
- no normal save/export
- authorized media access only
- appropriate opened/consumed state
- secure/short-lived access where appropriate
- retries must not create reusable copies
- concurrent-device behavior must be defined

WhatsApp documents that view-once photos, videos and voice messages disappear after opening/listening once; it also warns that external recording by another device cannot be absolutely prevented. Akọ should make accurate claims rather than promising impossible protection.


# 12. Normal media and media viewer
Audit image, video, file and audio attachments.

Use thumbnails, appropriate compression, lazy loading, caching and progressive loading where useful.

Full-screen media should support:
- fast open
- loading/error/retry
- close/back
- zoom where appropriate
- playback
- share/download only when permitted
- safe-area handling
- view-once restrictions

Do not load every full-resolution asset in a long chat immediately.


# 13. Performance — diagnose why chats are slow
This is a hard requirement.

Do not merely add a spinner. Measure and identify root causes.

Audit:
- chat open latency
- first useful frame
- message query latency
- number of queries
- N+1 queries
- duplicate requests
- RLS/query plans
- missing/incorrect indexes
- realtime subscription creation
- duplicate subscriptions
- message-list renders
- React reconciliation
- state/context propagation
- image decoding
- audio/waveform processing
- avatar loading
- signed URL generation
- unread/read queries
- typing/presence updates
- cache behavior
- pagination
- virtualization/windowing
- memory
- network waterfalls

Likely causes to investigate include loading too much history, whole-chat rerenders, excessive realtime listeners, client-side filtering, over-fetching profiles, repeated signed URLs, expensive waveform work and unoptimized media.

Fix the root cause.

Report BEFORE → ROOT CAUSE → FIX → AFTER with actual measurements.


# 14. Fast chat architecture
Recent messages should load first. Older messages should paginate upward.

When older messages load, preserve the user's scroll position.

When a new message arrives while the user is reading older content, do not yank them to the bottom. Use a subtle new-message affordance.

The initial chat frame should be useful immediately:
- stable header
- composer
- cached/recent content where appropriate
- current messages
- realtime subscription

Avoid full-screen spinners when useful structure can already render.

A single playback tick, reaction, typing event or presence event must not rerender every message.


# 15. Realtime, offline and reliability
Audit realtime for:
- prompt delivery
- duplicate prevention
- ordering
- retries
- reconnect
- cleanup
- deleted messages
- reactions
- replies
- read state
- typing
- media state

Test weak mobile networks, temporary disconnection and Wi-Fi/mobile switching.

Sending should use safe optimistic UI where appropriate, with client IDs/idempotency, server reconciliation, failure state and retry.

Never leave a failed optimistic message looking permanently sent.


# 16. Delete, edit, share and forward
Audit delete-for-me and delete-for-everyone as separate concepts.

Deletion must be server-authoritative, authorized, synchronized and idempotent. Deleted messages should have an intentional replacement state.

If editing exists, audit its time window, edited indicator, replies to edited messages and synchronization.

Separate:
- forward within Akọ
- external share
- copy
- media share
- post/Project sharing

Never expose private permanent storage URLs through sharing.

View-once content must have stricter sharing/forwarding rules.


# 17. Reactions and interaction feedback
Reactions should be instant, lightweight and reliable.

Audit:
- reaction picker
- long-press/context action
- selected reaction
- counts
- animation
- accessibility
- synchronization

Do not cause full-chat reloads.

Animations should communicate state, not create noise.


# 18. Z-index and stacking contexts
Hard requirement: audit the entire messaging surface.

Inspect stacking of:
- header
- message list
- composer
- reply preview
- attachment sheet
- emoji/reaction picker
- recorder
- context menu
- selection toolbar
- modal
- bottom sheet
- toast
- upload state
- media viewer
- view-once viewer
- keyboard-safe areas
- typing indicators
- loading/error overlays

Do NOT fix this by randomly increasing z-index values.

Find stacking contexts caused by transforms, opacity, positioned elements, overflow and nested containers.

If no coherent system exists, create a small z-index token hierarchy such as base → sticky → composer → popover → sheet → modal → full-screen viewer → critical overlay.

Use tokens rather than z-[999999] everywhere.


# 19. Icons and touch targets
Compare Akọ with WhatsApp for icon:
- size
- optical weight
- placement
- spacing
- baseline alignment
- edge distance
- order
- touch target

Audit microphone, attachment, send, play, pause, reply, reaction, delete, share/forward and view-once controls.

Visual icon size is not the same as touch-target size.

Do not force every icon into a generic 24px rule if optical comparison says otherwise.


# 20. Animation and sound
Akọ messaging should feel alive, not noisy.

Use animation for:
- sending
- receiving
- reaction
- reply selection
- attachment upload
- recording
- playback
- deletion
- view-once opening

Do not animate everything.

Audit existing sound assets before adding sounds. Sound must respect silent/mute settings and accessibility.

Voice-recording feedback must never contaminate the recorded audio.

Sound and motion must never block actual actions.


# 21. Permissions, audio lifecycle and storage
Microphone states:
- first request
- granted
- denied
- permanently denied
- revoked later
- microphone unavailable
- competing audio
- background/foreground
- interruption

Audio lifecycle:
recording → temporary local audio → review → discard OR upload → storage → message → playback → deletion/cleanup.

Temporary recordings must not accumulate indefinitely.

Validate server-side:
- ownership
- user authorization
- file size
- duration
- MIME type
- storage path
- message relationship
- rate limits

Do not trust client-supplied user IDs or ownership.


# 22. Security and privacy
The UI must never be the security boundary.

Server-side authorization must govern:
- reading conversations
- sending
- deleting
- editing
- reacting
- forwarding
- accessing media
- consuming view-once content

If E2EE exists, do not weaken it. Do not log plaintext messages, private audio, media contents or encryption keys.

If E2EE is not yet implemented, do not claim that UI work creates E2EE; treat encryption as its own architecture/security project.

Analytics must not capture private message contents.


# 23. Accessibility and Android APK testing
Audit screen-reader labels, touch targets, contrast, focus order, reduced motion, recording announcements, playback state, selected state and error feedback.

Because APK testing is immediate, test real Android devices:
- low/mid-range devices
- different screen sizes
- Android keyboard
- microphone permissions
- background/foreground
- audio interruptions
- Bluetooth/headsets
- notifications
- network switching
- process termination
- storage pressure

Also avoid Android-only architectural assumptions because iOS native conversion is planned.


# 24. User testing
Use pioneer testers and real users.

Test people who:
- send long texts
- send short texts
- use voice notes heavily
- send images/videos
- reply/react frequently
- use weak mobile networks
- use lower-end Android devices

Do not teach the feature before observing them.

Ask:
- What did you expect this button to do?
- Where would you look for voice recording?
- How would you delete this?
- How would you send it only once?
- Did you know it was recording?
- Did you know it was paused?
- Did you know it finished sending?
- What felt slow?


# 25. Implementation order
PHASE 1 — inspect and map existing chat architecture.

PHASE 2 — research current WhatsApp behavior and benchmark.

PHASE 3 — measure and fix performance root causes.

PHASE 4 — fix core interactions: composer, messages, selection, reply, reactions, deletion, sharing.

PHASE 5 — fully wire voice notes: permission, recording, pause/resume, stop, review, discard, send, upload, playback, waveform, progress, speed, retry and view-once where in scope.

PHASE 6 — media/view-once.

PHASE 7 — animation/sound.

PHASE 8 — z-index/stacking.

PHASE 9 — accessibility.

PHASE 10 — APK real-device testing.

PHASE 11 — WhatsApp comparison again.

PHASE 12 — final polish.

Do not overbuild. Classify features as MUST HAVE, SHOULD HAVE, FUTURE or DO NOT ADD after inspecting the existing product.


# 26. Definition of done
UX:
- immediately familiar
- unmistakably Akọ
- clear icons
- correct touch targets
- stable keyboard
- polished message bubbles
- intuitive actions
- smooth replies/reactions
- robust media
- polished voice
- coherent view-once
- restrained motion/sound
- correct z-index
- accessible

VOICE:
- permission works
- record works
- pause works
- resume works
- stop/review works
- discard works
- send works
- upload is real
- persistence is real
- realtime delivery works
- playback works
- progress/waveform works
- speed works where supported
- retry works
- deletion works
- view-once works if included
- concurrency and weak-network cases are tested

PERFORMANCE:
- before/after measurements exist
- root causes are documented
- actual fixes are documented
- no speed fix breaks reliability

WHATSAPP BENCHMARK:
- WhatsApp better
- Akọ better
- equivalent
- intentional Akọ differences
- regressions and fixes

SECURITY:
- authorization/RLS
- media access
- view-once enforcement
- upload validation
- rate limits
- idempotency
- no sensitive logs
- no private URL leakage

FINAL REPORT:
- existing state
- research findings
- UX changes
- performance problems/root causes/fixes
- voice implementation
- media/view-once
- security
- z-index
- animation/sound
- accessibility
- devices/networks/testers
- remaining issues
- deferred work


# 27. Final instruction to Claude
Read the existing Akọ repository first. Do not rebuild messaging blindly.

Research current WhatsApp chat UX and behavior before major changes.

For every meaningful round of changes, compare Akọ against WhatsApp.

Preserve anything already strong. Fix what is weak. Find actual causes of chat slowness instead of masking them with loading animations.

Treat voice notes as a complete end-to-end product feature, with particular attention to recording, pause, resume, stop, review, discard, send, upload, waveform, playback, progress, speed, retry and view-once behavior.

Audit z-index and stacking contexts systematically.

Use real backend state, real media, real realtime behavior and real error handling.

Do not fake functionality. Do not weaken security.

Do not add complexity merely because WhatsApp has a feature.

Make the experience familiar enough that users do not need to learn it, but polished enough that it unmistakably belongs to Akọ.

Core standard:

> Familiar enough to feel effortless.
> Distinct enough to feel like Akọ.
> Fast enough to disappear.
> Private enough to trust.
> Polished enough to keep using.
