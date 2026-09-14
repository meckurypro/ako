# AKỌ — SOFT FEED DISCOVERY & CROSS-SURFACE INVITATION SYSTEM

## Product / UX / Interaction Audit-and-Upgrade Specification

**Status:** Repo-ready specification  
**Purpose:** Audit and upgrade how Akọ gently brings users from non-feed destinations back into the Feed without forcing navigation, interrupting their task, or making the product feel like it is begging for engagement.

---

# 1. THE CORE IDEA

Akọ will inevitably have people who arrive for a specific reason:

- buy a Book
- read a Book
- join a Course
- complete a Course lesson
- download a File
- access Audio or Video
- join a Room
- attend a Meeting
- access an Event/ticket
- purchase a Project
- receive or use another Project entitlement
- interact with Wallet/Gifts
- follow a deep link directly to a specific resource

Some of these people will complete their task and leave.

That is acceptable.

However, Akọ should not accidentally communicate:

> “Your task is finished. There is nothing else here.”

The product should instead create tasteful, contextual opportunities to discover the Feed.

The desired feeling is:

> **“I came here for this. Oh — there is more happening here.”**

Not:

> “Akọ is trying to make me visit the Feed.”

The Feed is Akọ's social/discovery layer. Other surfaces should therefore be able to act as **doors into the Feed**, without becoming funnels that trap users or interrupt their primary task.

---

# 2. PRODUCT PRINCIPLE

## No destination should feel like a dead end.

A user may come to Akọ for one thing.

A Book.

A Course.

A File.

A Meeting.

A Room.

A ticket.

A download.

A purchase.

That thing should work perfectly on its own.

But once the user's immediate task is complete, Akọ may quietly reveal:

> **There is more happening here.**

This is a discovery principle, not a forced-engagement principle.

---

# 3. THE EXPERIENCE WE WANT

The ideal sequence is:

```text
Specific intent
     ↓
User accomplishes task
     ↓
Task completion / stable access state
     ↓
Small contextual discovery moment
     ↓
Optional Feed entry
     ↓
Feed experience feels relevant and alive
     ↓
User chooses whether to continue
```

Never:

```text
Specific intent
     ↓
Interrupt task
     ↓
Force Feed
     ↓
Block access until Feed is visited
```

The latter is explicitly prohibited.

---

# 4. EXPERIENCE PHILOSOPHY

Claude should approach this as a **veteran product designer, UX designer, interaction designer, information architect, copywriter and frontend engineer**.

The goal is:

> **Add discovery, not friction.**

The Feed invitation should feel:

- sleek
- premium
- calm
- intentional
- editorial
- culturally coherent with Akọ
- lightweight
- slightly intriguing
- occasionally playful
- never desperate
- never noisy
- never manipulative

Avoid generic social-media language and generic SaaS growth language.

Do NOT turn the system into:

- “Join our community!”
- “Don't miss out!!!”
- “🔥 Check out what's trending!”
- “You're missing out!”
- “People are waiting for you!”
- excessive emojis
- fake urgency
- fake activity
- fake scarcity
- notification spam
- repeated modal interruptions

Akọ should feel confident enough to invite without begging.

---

# 5. WHAT THE INVITATION IS NOT

The Feed invitation is NOT:

- a mandatory step
- an onboarding gate
- an interstitial that blocks content
- a disguised advertisement
- a reward claim
- a notification
- a push notification by default
- an engagement-bait mechanism
- a popup that appears after every action
- a requirement to follow people
- a requirement to create a post
- a requirement to interact
- a requirement to purchase something
- a requirement to join a community
- a forced social graph mutation

The user must always be able to complete the original task without visiting Feed.

---

# 6. AUDIT THE EXISTING REPOSITORY FIRST

Before changing code:

1. Read the existing repository.
2. Map all current routes.
3. Map the existing navigation architecture.
4. Identify all Project-related surfaces.
5. Identify existing completion/success states.
6. Identify existing empty states.
7. Identify existing post-purchase states.
8. Identify existing download-complete states.
9. Identify existing lesson/course completion states.
10. Identify existing Room/Meeting/Event completion/access states.
11. Identify existing Feed entry points.
12. Identify existing buttons/links that already lead to Feed.
13. Identify existing motion/micro-interaction primitives.
14. Identify existing design tokens.
15. Identify existing typography hierarchy.
16. Identify existing card/surface patterns.
17. Identify existing modal/drawer/toast patterns.
18. Identify existing analytics/event tracking.
19. Identify existing feature flags/configuration.
20. Identify existing personalization/recommendation infrastructure.
21. Identify existing Feed candidate-generation/ranking infrastructure.
22. Identify existing user state and access models.
23. Identify existing Project ownership/purchase/access relationships.
24. Identify existing deep-link behavior.
25. Identify existing mobile/native navigation assumptions.

**Do not blindly create a new global component if the repository already has a stronger reusable architecture.**

Preserve good work.

Reuse existing primitives.

Upgrade existing architecture where appropriate.

---

# 7. THE IMPORTANT DISTINCTION

There are two separate systems:

## A. ACCESS / TASK COMPLETION

This answers:

> “Can the user get to what they came for?”

Examples:

- Can I open my purchased Book?
- Can I download the File?
- Can I continue the Course?
- Can I join the Room?
- Can I access the Meeting?
- Can I retrieve my ticket?

This system must remain authoritative and reliable.

## B. FEED DISCOVERY

This answers:

> “Now that you're here, would you like to see what else is happening?”

These systems must not become entangled in a way that makes Feed availability a dependency for access.

---

# 8. FEED IS AN INVITATION, NOT A DESTINATION REQUIREMENT

The user should always be able to say:

> “No thanks.”

Without being presented with a literal rejection button if one is unnecessary.

For example:

```text
Your download is ready.

[ Download file ]

────────────

There’s more happening on Akọ.

Explore the feed →
```

The user can simply ignore the lower section.

No:

> “Are you sure you don't want to see the Feed?”

No second prompt.

No guilt.

---

# 9. WHERE FEED INVITATIONS SHOULD APPEAR

Audit every relevant surface and determine whether a Feed invitation is useful.

Potential surfaces include:

### Books
- Book purchase success
- Book access page
- Book reading completion
- Book download completion, if applicable
- Saved/owned Book page

### Courses
- Course purchase success
- Course dashboard
- Lesson completion
- Module completion
- Course completion
- Certificate/completion state, if one exists

### Files
- File purchase/access
- Download completion
- File viewer completion
- Access confirmation

### Audio
- Audio access
- Audio completion

### Video
- Video access
- Video completion

### Rooms
- Room join success
- Room dashboard
- Room milestone/completion
- Room exit state where appropriate

### Meetings
- Meeting access
- Meeting completion
- Meeting recording availability

### Events
- Ticket purchase
- Ticket confirmation
- Event completion
- Post-event state

### General Projects
- Project purchase success
- Project access page
- Project completion
- Project saved/accessed state

### Wallet / Gifts
Only where context makes sense.

Do not randomly insert Feed invitations into financial actions.

For example, a sensitive withdrawal confirmation should prioritize financial clarity. Feed discovery can be secondary or absent.

### Profiles / discovery surfaces
Audit existing profile and Project discovery pages for natural Feed entry points.

---

# 10. DO NOT PUT THE INVITATION EVERYWHERE

A common failure mode is:

```text
Every page → Feed CTA
```

That turns the system into UI wallpaper.

Instead, determine the **natural moment**.

Good moments:

- after successful completion
- after the user has received what they came for
- when a page has otherwise reached a natural stopping point
- when a resource has contextual social relevance
- when there is genuinely interesting Feed content available

Bad moments:

- before the user has accessed their purchase
- while a download is processing
- while a video is loading
- while a course lesson is loading
- during a payment failure
- during a wallet transaction
- during an error state
- when the user is actively performing a task
- immediately after another major modal
- repeatedly during the same session

---

# 11. CONTEXTUAL INVITATIONS

The copy should adapt to the user's current context.

The system does not need hundreds of hard-coded messages.

Create a small, high-quality copy system with contextual variants.

---

# 12. EXAMPLE: FILE DOWNLOAD

After successful download:

> **Download complete.**
>
> There’s more happening on Akọ.
>
> **Explore the feed →**

Alternative:

> **That’s sorted.**
>
> See what people are saying, making and building.
>
> **Open Feed →**

Keep it subtle.

---

# 13. EXAMPLE: BOOK

After purchase/access:

> **Your book is ready.**
>
> And there’s a whole conversation happening around ideas like this.
>
> **Explore the feed →**

Alternative:

> **Enjoy the book.**
>
> When you're ready, see what's happening on Akọ.
>
> **Go to Feed →**

Do not imply that the Book itself has a discussion unless the system actually has one.

Never fabricate social activity.

---

# 14. EXAMPLE: COURSE

After a lesson:

> **Lesson complete.**
>
> See what people are learning, building and reasoning about.
>
> **Explore Feed →**

After full course completion:

> **You made it to the end.**
>
> Don't stop there.
>
> **See what's happening on Akọ →**

The second version can be used sparingly because it has a stronger emotional tone.

---

# 15. EXAMPLE: AUDIO / VIDEO

After completion:

> **That's a wrap.**
>
> There’s more to discover on Akọ.
>
> **Explore Feed →**

Alternative:

> **Finished here?**
>
> See what people are talking about.
>
> **Open Feed →**

Do not interrupt media playback merely to show this.

Show it after the natural completion state.

---

# 16. EXAMPLE: ROOM

After joining a Room:

> **You're in.**
>
> While you're here, see what the wider Akọ community is reasoning about.
>
> **Explore Feed →**

Do not make the Feed invitation compete with Room-specific actions.

The Room remains the primary destination.

---

# 17. EXAMPLE: EVENT

After ticket acquisition:

> **You're all set.**
>
> There's more happening before the event.
>
> **See what's happening on Akọ →**

Only use wording such as “before the event” if the event date and context make that true.

---

# 18. THE PREMIUM VERSION

The system should not always be a rectangular CTA card.

Explore several treatments using existing Akọ design language.

Possible treatments:

### A. Quiet inline invitation

```text
Your download is ready.

[ Download ]

──────────────

There’s more happening on Akọ.
Explore the feed →
```

### B. Editorial card

```text
BEYOND THIS

Ideas don't stop here.

Explore the feed →
```

### C. Contextual footer

```text
Finished here?

See what people are reasoning about →
```

### D. Feed preview

If the existing Feed system can safely provide a useful preview:

```text
WHILE YOU'RE HERE

[small preview of genuinely available post]

See more in Feed →
```

This must use real content.

Never fabricate activity.

Never use fake “people are talking about this” language unless the underlying system can substantiate it.

---

# 19. THE “MISSING OUT” FEELING

The desired FOMO should come from **curiosity**, not manipulation.

Good:

> **There’s more happening on Akọ.**

Good:

> **See what people are reasoning about.**

Good:

> **Ideas are moving.**

Good:

> **Beyond this, there’s more to discover.**

Good:

> **See what's happening.**

Potentially strong:

> **Don't stop at the download.**

Use stronger language sparingly.

Bad:

> **You're missing out! 😱**

Bad:

> **Thousands of people are online right now!**

unless that is actually known and intentionally exposed.

Bad:

> **Everyone is talking about this!**

unless factually supported.

---

# 20. THE FEED INVITATION SHOULD NOT LOOK LIKE AN AD

Do not use:

- promotional banners
- excessive gradients
- fake sponsored styling
- flashing animation
- oversized CTA buttons
- countdown timers
- fake urgency
- “LIMITED TIME”
- notification red dots
- fake engagement counters

The Feed should feel like a natural part of Akọ.

---

# 21. MOTION

Use Akọ's existing motion system.

If the repository contains the previously specified micro-interaction/motion system, reuse it.

Do not introduce unrelated animation language.

The invitation can have:

- subtle entrance
- slight opacity/translation
- gentle arrow movement on hover/tap
- restrained press feedback
- optional quiet reveal after completion

Avoid:

- bouncing CTA
- shaking
- pulsing
- auto-playing attention-grabbing animation
- confetti
- repeated movement
- sound

The user should notice the invitation because it is well designed, not because it is moving aggressively.

---

# 22. SOUND

Do not automatically play sound for Feed invitations.

The Feed invitation should never create audio interruption.

If the existing Akọ motion/sound system eventually supports an intentional interaction sound, it must be:

- user-triggered
- muted when appropriate
- consistent with the design system
- optional
- non-disruptive

---

# 23. FEED PREVIEW — OPTIONAL, NOT REQUIRED

A stronger future version could show a small live Feed preview.

Example:

```text
WHILE YOU'RE HERE

[ genuine post preview ]

Explore more →
```

But only build this if the current Feed architecture can supply a lightweight, reliable candidate.

Do not create a second Feed ranking algorithm solely for this.

Do not duplicate Feed business logic.

The preview should use existing Feed candidate generation/ranking where practical.

---

# 24. CONTEXTUAL RELEVANCE

If the user has just interacted with a Project about a particular topic, the invitation may be more compelling if the Feed destination contains relevant material.

However:

**Do not turn the Feed into a Project-specific silo.**

A course about AI can lead to:

- AI discussions
- business
- creativity
- education
- culture
- unexpected adjacent ideas

The Feed remains a discovery environment.

The goal is:

> relevance without monotony.

---

# 25. IMPORTANT: DO NOT OVERRIDE NORMAL FEED ARCHITECTURE

A user clicking:

> Explore Feed →

should enter the normal Feed.

Do not silently:

- force a creator
- force-follow anyone
- subscribe the user
- modify interests
- prioritize a creator
- prioritize a Project
- alter social graph
- manufacture engagement
- insert an unrelated sponsored post

Normal Feed rules remain authoritative.

---

# 26. IF THE USER IS NEW

A new user may have little or no Feed history.

Use the existing onboarding / cold-start architecture.

Do not invent a separate Feed onboarding algorithm here.

If the repository already has:

- selected interests
- suggested accounts
- curated pioneer content
- social signals
- topic relevance
- cold-start ranking

then Feed discovery should use that infrastructure.

The invitation system's job is to **open the door**.

The Feed system's job is to determine **what they see after entering**.

---

# 27. IF THE USER HAS NO FEED CONTENT

Never create an embarrassing empty experience.

If the Feed has an existing empty-state architecture, use it.

Audit the Feed cold-start experience.

The Feed invitation system should not promise:

> “See what everyone is talking about”

if the user will encounter an empty page.

---

# 28. FREQUENCY MANAGEMENT

This is critical.

A user may:

- buy three books
- download two files
- complete five lessons
- attend a meeting
- access a room

within one session.

Do not show ten Feed invitations.

Create a lightweight frequency policy.

For example:

- prioritize the most natural invitation moment
- suppress duplicates within a short session window
- avoid repeated identical copy
- avoid showing the invitation after every lesson
- prefer milestone completion over micro-completion
- respect dismissal/ignore behavior
- avoid repeatedly prompting after the user has already entered Feed

Exact frequency thresholds should be determined from the existing product architecture and analytics.

Do not blindly hard-code arbitrary limits.

---

# 29. SESSION-LEVEL STATE

Audit whether the current application has a suitable session/UI state mechanism.

Potential conceptual state:

```text
feed_invitation_last_shown_at
feed_invitation_last_context
feed_invitation_count_session
feed_invitation_last_destination
feed_invitation_dismissed
feed_invitation_entered_feed
```

Do not necessarily create persistent database columns for all of these.

Prefer local/session state for purely presentational frequency management where appropriate.

Use server persistence only when product behavior genuinely requires cross-device or long-term memory.

---

# 30. DO NOT TURN “DISMISSED” INTO A PERMANENT BAN

Ignoring a Feed invitation should not permanently disable Feed discovery.

Likewise, clicking Feed once should not necessarily disable all future invitations.

Use sensible contextual/frequency logic.

---

# 31. FEED ENTRY DESTINATION

The CTA should generally land on the primary Feed route.

Do not create:

```text
/project-feed
/course-feed
/book-feed
/file-feed
```

unless the product already has an intentional destination architecture for such views.

The primary concept is:

> **Enter the Feed.**

---

# 32. DEEP-LINK SAFETY

The Feed invitation must work correctly across:

- web
- mobile web
- future native app
- authenticated users
- session restoration
- deep links

If the user is already authenticated:

> Feed opens normally.

If authentication is unexpectedly required:

- preserve intended destination
- avoid losing the user's current Project state
- do not force a confusing login loop

---

# 33. MOBILE FIRST

Akọ will have a native app.

Design this system so it converts cleanly to native.

Audit:

- touch target size
- safe-area behavior
- bottom navigation interaction
- card spacing
- typography
- CTA hierarchy
- screen transitions
- back behavior

Do not design a web-only hover experience as the core interaction.

---

# 34. ACCESSIBILITY

Feed invitations must:

- have accessible labels
- have adequate contrast
- support keyboard navigation on web
- support screen readers
- not rely on color alone
- respect reduced-motion preferences
- have sensible focus behavior
- have touch targets appropriate for mobile

Motion must never be required to understand the CTA.

---

# 35. ANALYTICS

The system should be observable.

Track useful events such as:

```text
feed_invitation_eligible
feed_invitation_shown
feed_invitation_clicked
feed_invitation_ignored
feed_invitation_dismissed
feed_entry_after_invitation
feed_session_after_invitation
feed_return_after_invitation
```

Context should be captured where useful:

```text
source_surface
project_type
project_id
completion_state
session_id
invitation_variant
destination
```

Do not collect unnecessary personal data.

---

# 36. MEASURE QUALITY, NOT JUST CLICKS

A high click-through rate is not automatically success.

Measure:

### Discovery
- Feed invitation impressions
- Feed entry rate

### Quality
- meaningful Feed session after entry
- Feed dwell/active time
- meaningful interactions
- subsequent voluntary Feed returns

### Negative signals
- immediate back navigation
- rapid exit
- repeated dismissal
- session abandonment
- user frustration signals if available

The system should optimize for:

> **“Did this invitation help the user discover Akọ?”**

not:

> **“Did we force more Feed clicks?”**

---

# 37. IMPORTANT METRIC

Consider a useful metric:

## Post-Task Feed Discovery Rate

Conceptually:

```text
Users who voluntarily enter Feed after completing/accessing
a non-Feed task
-----------------------------------------------------------
Eligible users who completed/accessed that non-Feed task
```

But do not optimize this metric in isolation.

Pair it with quality metrics.

---

# 38. LONGER-TERM NETWORK EFFECT

The deeper purpose is not simply:

> “Get people to Feed.”

It is:

> **Turn one-purpose visits into optional discovery.**

Example:

```text
User arrives for Course
        ↓
Completes lesson
        ↓
Sees subtle Feed invitation
        ↓
Visits Feed
        ↓
Discovers interesting post
        ↓
Follows creator
        ↓
Returns later independently
```

Another:

```text
User downloads File
        ↓
Explores Feed
        ↓
Discovers a Book
        ↓
Buys Book
```

Another:

```text
User buys Book
        ↓
Feed
        ↓
Discovers Project creator
        ↓
Follows creator
        ↓
Later joins Room
```

These are natural network loops.

Do not force them.

---

# 39. RELATIONSHIP TO PROJECT LIBRARY

The Personal Project Library remains the user's reliable home for things they own/access.

The Feed invitation is not a replacement for the Library.

Correct architecture:

```text
PROJECT / ACCESS
       ↓
Personal Library = retrieval
       ↓
Feed = discovery
```

The user should never have to remember:

> “I think the Feed is where my purchased course lives.”

It is not.

The Library answers:

> “What do I have?”

The Feed answers:

> “What is happening?”

---

# 40. RELATIONSHIP TO NOTIFICATIONS

Notifications can link users to:

- gifts
- messages
- replies
- Project events
- purchases
- access changes

The Feed invitation is different.

It is a **contextual discovery surface**, not a notification.

Do not create notification records simply because an inline Feed invitation appeared.

---

# 41. RELATIONSHIP TO ONBOARDING

Do not duplicate onboarding.

If a new user is already in an onboarding flow:

- let onboarding complete
- use existing Feed introduction if present
- avoid stacking another “Explore Feed” moment on top

The system should know when onboarding has already introduced the Feed.

---

# 42. RELATIONSHIP TO PROMOTION

Do not confuse Feed discovery with paid promotion.

A Feed invitation is product navigation.

It does not:

- create a promotion
- change promoted content
- change promotion targeting
- expose advertiser controls
- alter Give Back
- influence sponsored-post reward calculations

The Feed remains governed by its normal architecture.

---

# 43. RELATIONSHIP TO GIFTS

A gift can create special Feed eligibility through the previously defined gift → Prioritized post bridge.

That is a separate product mechanism.

Do not merge it with this generic Feed invitation.

Conceptually:

### Generic Feed invitation

> “You have completed something. There is more to discover.”

### Gift → Prioritized delivery

> A valid gift transaction can create a special eligibility path for the sender's prioritized post.

They are different systems.

Do not create accidental cross-effects.

---

# 44. RELATIONSHIP TO AFFILIATE FORKING

Affiliate Projects may be accessed through external links.

After the user lands and completes the relevant action:

- preserve attribution
- preserve Project access
- preserve purchase state
- optionally present Feed discovery

Do not allow Feed navigation to destroy or mutate affiliate attribution.

---

# 45. ERROR STATES

If the user's original task fails:

Do not show:

> “Explore Feed →”

as though nothing happened.

Example:

```text
Download failed.

[ Try again ]

[ Contact support ]
```

The primary experience is recovery.

Feed discovery is secondary and should generally be suppressed.

---

# 46. PAYMENT FAILURE

If payment fails:

Focus on:

- failure explanation
- retry
- payment method
- support

Do not immediately celebrate or promote Feed.

A user who just failed to buy something does not need:

> “Anyway, check out the Feed!”

This feels tone-deaf.

---

# 47. PAYMENT SUCCESS

After successful payment:

Primary:

> Access your Project

Secondary, once access is clear:

> There’s more happening on Akọ.

This is a good Feed invitation moment.

But never make Feed the primary post-payment action over the purchased content.

---

# 48. DOWNLOAD SUCCESS

The download button should remain primary.

Feed invitation should appear after confirmation.

Example:

```text
✓ Download complete

[ Open file ]

────────────

BEYOND THIS

There’s more happening on Akọ.

Explore Feed →
```

---

# 49. COURSE COMPLETION

Course completion is potentially one of the strongest invitation moments.

The emotional state is:

> “I finished something.”

Use that naturally.

Example:

> **You made it to the end.**
>
> There’s more to reason about.
>
> **Explore Feed →**

This is potentially a signature Akọ interaction.

Do not over-animate it.

---

# 50. BOOK COMPLETION

If Akọ knows that a user has completed a Book, consider a similar milestone state.

Example:

> **That's one idea finished.**
>
> See what else is being reasoned about.
>
> **Explore Feed →**

Only use this if “completion” is actually known.

Do not infer completion merely because the user opened the Book.

---

# 51. EVENT COMPLETION

After an Event ends:

> **That's a wrap.**
>
> See what people are talking about now.
>
> **Explore Feed →**

Again, this is a natural stopping point.

---

# 52. ROOM / COMMUNITY STATES

Rooms may be ongoing.

Do not treat every visit as a completion.

Use invitations only when there is a genuine transition:

- after joining
- after a milestone
- after a scheduled session
- after meaningful completion

Do not interrupt ongoing participation.

---

# 53. DESIGN SYSTEM

The Feed invitation should use existing Akọ:

- typography
- spacing
- surface radius
- borders
- shadows
- green/orange identity
- iconography
- motion primitives

Do not invent an unrelated visual system.

The invitation should look like:

> **Akọ quietly opening another door.**

Not a marketing landing page.

---

# 54. CTA LANGUAGE

Prefer:

- Explore the feed →
- Open Feed →
- See what's happening →
- See what people are reasoning about →
- Continue to Feed →
- Explore what's happening →
- Enter the Feed →

Use capitalization consistent with the existing product's UI conventions.

Avoid:

- JOIN NOW!!!
- CHECK IT OUT!!!
- DON'T MISS OUT!!!
- START SCROLLING
- COMMUNITY
- GO VIRAL
- SEE WHAT'S TRENDING NOW!!! 
- GET SOCIAL
- ENGAGE

Unless the product's actual context specifically warrants them.

---

# 55. COPY SHOULD BE SHORT

A good Feed invitation often needs only:

```text
There’s more happening on Akọ.

Explore the feed →
```

Do not turn every invitation into a paragraph.

Premium UI often comes from restraint.

---

# 56. PERSONALIZATION

Personalize only where the system already has reliable context.

Potential contextual inputs:

- Project type
- Project topic
- completion state
- user onboarding interests
- existing Feed history
- meaningful social signals

Do not fabricate personalization.

Do not say:

> “People like you are talking about...”

unless the system genuinely knows this.

Do not expose internal recommendation logic.

---

# 57. FEED PREVIEW PERSONALIZATION

If a preview is implemented:

The preview should be:

- real
- currently available
- appropriate to the user's permissions
- safe
- non-blocked
- non-deleted
- consistent with Feed ranking

If the candidate disappears before render, gracefully fall back to a text-only invitation.

Never show broken/orphaned content.

---

# 58. ORPHANED CONTENT

The existing product rule around deleted content applies here.

If a Feed preview references content that becomes unavailable:

- do not leave a broken card
- do not expose deleted content
- do not create a dead-end
- fall back gracefully

Example:

> **There’s more happening on Akọ.**
>
> Explore the feed →

---

# 59. BLOCKS / PRIVACY / MODERATION

All existing:

- blocks
- privacy
- moderation
- deleted accounts
- unavailable posts
- restricted content
- safety rules

must remain authoritative.

The Feed invitation must never bypass them.

---

# 60. SERVER VS CLIENT RESPONSIBILITIES

This is primarily a UI/discovery system, but do not put authoritative access logic in the client.

Client may decide:

- whether an invitation has already appeared this session
- animation state
- presentation variant
- local dismissal state

Server/backend remains authoritative for:

- access
- purchase state
- Project entitlement
- moderation
- Feed eligibility
- Feed content
- privacy
- blocked relationships
- content availability

---

# 61. DO NOT CREATE A SECOND FEED ALGORITHM

This is a critical architectural rule.

The invitation system must not create:

```text
Feed algorithm
+
Feed invitation algorithm
+
Project Feed algorithm
+
Preview algorithm
```

Instead:

```text
Existing Feed architecture
        ↓
Optional entry point / preview
```

Reuse the strongest existing implementation.

---

# 62. COMPONENT ARCHITECTURE

If appropriate after repository inspection, create a reusable conceptual component such as:

```text
FeedDiscoveryInvite
```

or equivalent naming consistent with the codebase.

Possible conceptual API:

```ts
<FeedDiscoveryInvite
  context="course-complete"
  projectId={projectId}
  variant="inline"
/>
```

But do not blindly use this exact API.

Inspect the current component architecture first.

The component should be presentation-oriented.

Business logic should not be duplicated inside every page.

---

# 63. INVITATION VARIANTS

Potential variants:

```text
inline
footer
completion
success
editorial
compact
preview
```

Only implement variants that are actually needed.

Do not create a giant design system for a simple invitation.

---

# 64. CONTEXT MODEL

A conceptual context enum could include:

```text
purchase-success
download-complete
course-lesson-complete
course-complete
book-access
book-complete
audio-complete
video-complete
room-joined
meeting-complete
event-ready
event-complete
project-complete
generic-access
```

Use only states supported by the current application.

---

# 65. COPY MODEL

Prefer centralized copy configuration over dozens of page-specific strings.

Conceptually:

```text
context
→ preferred message
→ fallback message
→ CTA
→ variant
```

This makes the system easier to evolve.

---

# 66. DO NOT MAKE COPY TOO “AI”

The language should feel written by a human product designer.

Avoid:

> “Discover a world of engaging conversations tailored to your intellectual journey.”

😂 No.

Prefer:

> **There’s more happening on Akọ.**

Or:

> **See what people are reasoning about.**

Or:

> **Ideas don't stop here.**

Simple wins.

---

# 67. VISUAL HIERARCHY

The original task always wins.

Example:

```text
PROJECT TITLE
Project details

[ Primary action ]

secondary information

──────────────────

BEYOND THIS

There’s more happening on Akọ.

Explore the feed →
```

The Feed invitation should never visually overpower:

- Download
- Open
- Continue
- Join
- Attend
- Read
- Watch
- Purchase

---

# 68. USER CONTROL

The user should be able to ignore the invitation without consequence.

No:

- loss of access
- lower ranking
- reduced rewards
- fewer recommendations
- hidden Projects
- negative personalization

Ignoring Feed is a valid user choice.

---

# 69. NO SOCIAL GRAPH SIDE EFFECTS

Clicking Feed does not automatically:

- follow Project creator
- follow recommended accounts
- join Rooms
- join groups
- subscribe
- like
- repost
- bookmark

Navigation is navigation.

---

# 70. NO ARTIFICIAL ENGAGEMENT

Do not count:

> Feed invitation click

as:

- a Like
- a Support
- a Disagree
- a comment
- a social interaction
- a reward-bearing engagement

It is navigation telemetry only.

---

# 71. FEED ENTRY AND REWARD SYSTEM

Entering Feed should not itself create Give Back earnings.

Only existing legitimate reward-bearing interactions should affect the relevant reward systems.

Do not accidentally make:

```text
Click Feed → earn money
```

or:

```text
View invitation → earn money
```

unless a future explicit product policy introduces such behavior.

---

# 72. PROMOTION SAFETY

If the Feed contains promoted/reward-bearing content, the Feed invitation itself must not reveal secret reward mechanics.

Do not tell users:

> “Go to Feed to earn.”

unless product policy explicitly changes.

The Feed invitation should be about discovery.

---

# 73. A/B TESTING

If experimentation infrastructure exists, the system may test:

- copy
- placement
- variant
- timing
- preview vs no preview

But preserve product quality.

Do not run experiments that:

- spam users
- manipulate users
- hide access
- alter financial behavior
- secretly change critical navigation
- violate privacy

---

# 74. EXPERIMENT EXAMPLES

Potential variants:

### Variant A
> There’s more happening on Akọ.
>
> Explore the feed →

### Variant B
> Ideas don't stop here.
>
> See what's happening →

### Variant C
> See what people are reasoning about.
>
> Explore Feed →

Measure downstream quality, not just clicks.

---

# 75. ANALYTICS PRIVACY

Use existing analytics architecture.

Do not create a new analytics platform.

Do not record sensitive information unnecessarily.

Use IDs and contextual metadata already permitted by the application.

---

# 76. PERFORMANCE

The invitation should be cheap.

Do not:

- block page rendering while generating Feed recommendations
- make a heavy Feed request merely to render a text CTA
- download large media just to show an invitation
- add large bundles for a tiny component

A simple invitation should render instantly.

If a Feed preview is used, load it progressively.

---

# 77. OFFLINE / SLOW NETWORK

On slow connections:

The basic invitation should still work.

If Feed preview data is unavailable:

```text
There’s more happening on Akọ.

Explore the feed →
```

Do not leave a skeleton indefinitely for a tiny optional preview.

---

# 78. LOADING STATES

The user's original task's loading state always takes priority.

Do not show Feed invitation skeletons while:

- payment is processing
- download is processing
- content is loading
- lesson is saving
- Project is being provisioned

Wait until the primary state is stable.

---

# 79. ERROR RECOVERY

If the Feed route fails:

- preserve the current page
- show existing navigation/error handling
- do not destroy the Project state

The invitation is optional.

The user's primary resource is not.

---

# 80. BACK NAVIGATION

If a user taps:

> Explore Feed →

and then presses Back:

they should return naturally to the resource they came from, subject to the existing navigation architecture.

Do not create navigation loops.

---

# 81. NATIVE APP CONSIDERATIONS

For native conversion:

- Feed invitation should map to a normal navigation action
- respect tab/navigation-stack architecture
- preserve back stack
- do not launch external browser
- do not create duplicate Feed screens
- use native transitions consistent with the app

---

# 82. EMPTY STATE DESIGN

If Feed is genuinely empty for a new user, audit and improve the existing Feed empty state.

The Feed invitation system should not be responsible for solving the entire cold-start problem.

However, the two systems should work together.

---

# 83. PIONEER CONTENT

Akọ's pioneer-user strategy may make Feed discovery especially powerful.

New users should be able to arrive in Feed and see quality content from the initial Akọ culture.

The invitation system should not explicitly reveal internal pioneer mechanics.

The user should simply experience:

> “There are interesting people here.”

---

# 84. DISCOVERY SHOULD NOT BE MONOTONOUS

If a user comes from a photography course, Feed should not become:

> photography post  
> photography post  
> photography post  
> photography post

unless normal Feed signals genuinely support it.

Use the existing Feed diversity architecture.

The invitation opens the door; normal ranking determines the room they enter.

---

# 85. PRODUCT PSYCHOLOGY

The desired psychological transition is:

```text
Task completion
     ↓
Curiosity
     ↓
Optional discovery
```

Not:

```text
Task completion
     ↓
Obligation
```

A good invitation creates:

> “Hmm. Let me see.”

That is enough.

---

# 86. “COOL” SHOULD COME FROM RESTRAINT

Do not try too hard to make it cool.

Premium design often looks like:

- one strong sentence
- generous whitespace
- subtle divider
- small arrow
- good typography
- confident spacing
- restrained motion

Not:

- ten gradients
- animated stickers
- giant illustrations
- exclamation marks everywhere
- social-media clichés

---

# 87. POSSIBLE SIGNATURE LANGUAGE

Explore an Akọ-specific vocabulary around ideas.

Examples:

> **Ideas don't stop here.**

> **There’s more happening on Akọ.**

> **See what people are reasoning about.**

> **Beyond this, there’s more to discover.**

> **Keep going.**

> **See what's moving.**

Do not force a single phrase everywhere.

A small language system is better.

---

# 88. INVITATION TIMING

Possible timing hierarchy:

### Highest priority
- Course completion
- Book completion
- Event completion
- successful Project completion

### Medium
- successful purchase/access
- successful download

### Lower
- ordinary page visit
- repeated resource access

### Avoid
- active task
- error state
- payment failure
- transaction processing

This hierarchy is conceptual.

Audit actual user journeys before implementation.

---

# 89. DO NOT INTERRUPT

The Feed invitation should almost always be:

- inline
- below the primary action
- at a natural stopping point
- optional

Avoid full-screen modals.

Avoid surprise drawers.

Avoid blocking dialogs.

A modal should require a very strong product reason.

---

# 90. NO PUSH NOTIFICATION DEFAULT

Do not automatically send a push notification saying:

> “You haven't visited Feed.”

That is a separate retention strategy and outside this specification.

---

# 91. FEED INVITATION AFTER PURCHASE

Potential state:

```text
Payment successful
       ↓
Access provisioned
       ↓
Primary CTA: Open Project
       ↓
Secondary discovery invitation
```

Never:

```text
Payment successful
       ↓
Feed
       ↓
Where is my Project?
```

---

# 92. FEED INVITATION AFTER DOWNLOAD

Potential state:

```text
Download successful
       ↓
Confirmation
       ↓
Download/open action
       ↓
Soft Feed invitation
```

---

# 93. FEED INVITATION AFTER COURSE COMPLETION

Potential state:

```text
Lesson saved
       ↓
Completion confirmed
       ↓
Progress updated
       ↓
Completion state
       ↓
Feed invitation
```

Ensure the completion write is authoritative before presenting a success state.

---

# 94. DUPLICATE SUBMISSION SAFETY

If completion events are retried:

Do not generate duplicate:

- analytics records
- notifications
- invitations
- database records

Where server-side events are persisted, use idempotency where appropriate.

---

# 95. ROUTE INVENTORY

Create a route/surface matrix during implementation.

Example:

| Surface | Natural moment | Invite? | Priority |
|---|---|---:|---:|
| Book purchase | access ready | Yes | High |
| Book reader | completion | Maybe | High |
| Course lesson | every lesson | No/rare | Low |
| Course completion | completion | Yes | Very high |
| File download | complete | Yes | Medium |
| Audio | complete | Maybe | Medium |
| Video | complete | Maybe | Medium |
| Room | join | Maybe | Medium |
| Meeting | complete | Yes | Medium |
| Event | complete | Yes | High |
| Wallet | financial action | Usually no | Low |
| Withdrawal | completion | Usually no | Low |
| Error state | failure | No | None |

This table is illustrative.

The repository audit must produce the actual final matrix.

---

# 96. IMPLEMENTATION RULE

Do not implement the table above blindly.

Inspect:

- actual routes
- actual components
- actual Project types
- actual completion states
- actual navigation
- actual existing UI

Then decide.

---

# 97. FEED INVITATION SYSTEM STATE MACHINE

Conceptually:

```text
NOT_ELIGIBLE
      ↓
ELIGIBLE
      ↓
SHOWN
   ↙     ↘
IGNORED  CLICKED
             ↓
         FEED_ENTERED
```

Potential contextual state:

```text
ELIGIBLE
   ↓
SUPPRESSED_BY_FREQUENCY
   ↓
ELIGIBLE_LATER
```

No state should block the original task.

---

# 98. FEED ENTRY QUALITY

After the user clicks, ensure the Feed itself is excellent.

Audit:

- first visible post
- loading speed
- cold-start ranking
- diversity
- relevance
- social signals
- Prioritize
- new creator discovery
- empty states
- back navigation

A beautiful invitation cannot compensate for a poor Feed.

---

# 99. SUCCESS CONDITION

The system succeeds when:

A user completes a non-Feed task and thinks:

> **“Oh. There’s more here.”**

Then they voluntarily enter Feed.

Even better:

They later return to Feed **without being prompted**.

That is the actual product win.

---

# 100. ANTI-GROWTH-HACK RULE

Do not optimize this system for maximum Feed sessions at any cost.

The product should never degrade:

- Project usability
- reading
- learning
- downloads
- meetings
- events
- rooms
- financial flows

just to increase Feed traffic.

Akọ is a network of useful things.

The Feed connects those things socially.

It does not consume them.

---

# 101. DESIGN REVIEW QUESTIONS

Before shipping, ask:

### Does this feel optional?
### Does the primary task remain obvious?
### Does the invitation feel premium?
### Does it feel like Akọ?
### Is the copy human?
### Is the copy too promotional?
### Is there too much text?
### Is there too much motion?
### Is this the right moment?
### Would a user find it useful?
### Are we showing it too often?
### Does the Feed actually have something good to show?
### Does clicking it preserve navigation state?
### Does it work on mobile?
### Does it work with screen readers?
### Does it work with reduced motion?
### Does it survive slow networks?
### Does it respect blocks/privacy/moderation?
### Does it avoid changing the social graph?
### Does it avoid creating financial side effects?
### Does it avoid duplicating Feed logic?

---

# 102. ENGINEERING REVIEW QUESTIONS

Before shipping:

### Is the component reusable?
### Is business logic duplicated?
### Are existing primitives reused?
### Are completion states authoritative?
### Are access states authoritative?
### Are route transitions correct?
### Are deep links safe?
### Are analytics events deduplicated?
### Is session frequency state appropriate?
### Is Feed loading independent from Project access?
### Can Feed failures leave the current page intact?
### Are deleted/blocked posts handled?
### Are feature flags respected?
### Is the implementation compatible with native conversion?
### Are there any new database writes that are unnecessary?
### Are there any new backend dependencies that are unnecessary?

---

# 103. SECURITY REVIEW

Confirm:

- Feed invitation cannot bypass auth.
- Feed content respects RLS/access controls.
- Blocked users remain blocked.
- Deleted content is not exposed.
- Private content is not previewed.
- Moderated content is not surfaced.
- Project entitlement is not modified by Feed navigation.
- Affiliate attribution is not destroyed.
- Wallet state is unaffected.
- Promotion state is unaffected.
- Gift state is unaffected.
- Client cannot manipulate authoritative Feed eligibility.
- Client cannot manufacture Feed engagement.
- Client cannot manufacture reward events through the invitation.
- Analytics cannot be abused to create financial effects.

---

# 104. PERFORMANCE REVIEW

Confirm:

- no unnecessary Feed fetch for text-only invitations
- no render-blocking recommendation request
- no large asset dependency
- no excessive bundle growth
- no repeated Feed queries on every lesson
- no excessive analytics calls
- no memory leak from invitation state
- no repeated network request on navigation/back
- graceful behavior under poor connectivity

---

# 105. TEST MATRIX

Test at minimum:

## Book
- purchase
- access
- completion
- back navigation

## Course
- lesson completion
- repeated lesson completion
- full completion
- refresh
- resume
- Feed entry

## File
- successful download
- failed download
- retry
- Feed entry

## Audio
- completion
- interruption
- resume

## Video
- completion
- interruption
- resume

## Room
- join
- return
- ongoing participation

## Meeting
- access
- completion
- recording

## Event
- ticket success
- event completion

## Payment
- success
- failure
- retry
- duplicate callback

## Feed
- Feed loads
- Feed empty
- Feed error
- blocked/deleted content
- back navigation

---

# 106. FREQUENCY TESTS

Test:

1. One Project completion → one appropriate invitation.
2. Five lessons completed → not five identical invitations.
3. Multiple purchases → sensible suppression.
4. User ignores invitation → no immediate repeated prompt.
5. User enters Feed → avoid redundant same-session invitation.
6. New session → system can eventually invite again where appropriate.
7. User completes another major milestone → contextual invitation can reappear.
8. Refreshing page does not duplicate the invitation unexpectedly.

---

# 107. MOBILE TESTS

Test:

- Android
- future iOS/native architecture assumptions
- small screens
- large screens
- bottom navigation
- keyboard
- back button
- slow network
- interrupted network
- orientation where supported

---

# 108. ACCESSIBILITY TESTS

Test:

- keyboard focus
- screen reader
- reduced motion
- high contrast
- text scaling
- touch targets

---

# 109. ANALYTICS TESTS

Verify:

```text
shown ≠ clicked
clicked ≠ Feed engagement
Feed entry ≠ financial reward
```

Verify duplicate events are not generated by:

- refresh
- route restoration
- React re-render
- back/forward navigation
- repeated network callbacks

---

# 110. ADMIN / FEATURE FLAG

If the repository has feature flags or Admin configuration, consider whether this system needs:

```text
Feed Discovery Invitations: ON/OFF
```

If introduced:

- server-side enforcement only where necessary
- Admin access control
- audit trail
- safe default
- kill switch
- no client-only security assumption

Do not add an Admin panel merely because one could exist.

Reuse existing Admin architecture.

---

# 111. COPY CONFIGURATION

If Admin copy management already exists, determine whether this belongs there.

Do not automatically make every phrase Admin-editable.

Product-critical UX copy may be better versioned in code.

Admin configuration is appropriate only if the existing product architecture genuinely benefits from operational control.

---

# 112. FEATURE FLAG BEHAVIOR

If disabled:

```text
Original Project experience remains intact.
No Feed invitation.
```

If enabled:

```text
Eligible surfaces may show Feed invitation.
```

No other business behavior should change.

---

# 113. GRACEFUL DEGRADATION

If:

- Feed service is unavailable
- Feed preview fails
- analytics fails
- personalization is unavailable

the original Project experience must continue.

A Feed invitation is optional.

---

# 114. FUTURE EXTENSION

Potential future versions:

### V1
Text/inline invitation.

### V1.5
Contextual copy variants.

### V2
Lightweight Feed preview.

### V3
More intelligent contextual placement.

### Future
Cross-surface discovery recommendations based on what the user actually does.

Do not overbuild V1.

---

# 115. DO NOT BUILD A “DISCOVERY ENGINE” YET

A simple invitation can accomplish a lot.

Do not create:

- new recommendation service
- new database subsystem
- new ranking model
- new personalization engine

just to say:

> “Explore Feed.”

Start with the existing architecture.

---

# 116. PRODUCT LANGUAGE

The system can be thought of internally as:

## Soft Feed Discovery

or:

## Cross-Surface Feed Invitation

or:

## Feed Doorways

The final code naming should follow the repository's conventions.

---

# 117. CORE PRINCIPLE FOR CLAUDE

When implementing:

> **Do not ask “How do we get users to Feed?”**

Ask:

> **“Where has the user naturally finished something, and how can Akọ quietly reveal that there is more happening here?”**

That distinction matters.

---

# 118. FINAL PRODUCT DEFINITION

Akọ has many doors.

A user can enter through:

- a Book
- a Course
- a File
- an Event
- a Meeting
- a Room
- a Project
- a purchase
- a shared link
- another person's recommendation

The product should not force every visitor through the Feed.

Instead:

> **When the user's immediate reason for being on Akọ is satisfied, Akọ can quietly open another door.**

That door is the Feed.

The invitation should feel:

**optional, contextual, premium, curious, human, restrained, and unmistakably Akọ.**

---

# 119. FINAL CLAUDE INSTRUCTION

You are not being asked to blindly implement a list of UI cards.

You are being asked to **audit and upgrade Akọ's entire cross-surface discovery experience**.

Before writing code:

1. Inspect the repository.
2. Map all non-Feed destinations.
3. Map every natural completion/access state.
4. Map current Feed entry points.
5. Map existing navigation.
6. Map existing motion and design primitives.
7. Map existing analytics.
8. Map existing Feed architecture.
9. Map existing Project/access architecture.
10. Identify existing reusable components.
11. Identify gaps.
12. Identify unnecessary duplication.
13. Preserve anything already stronger than this specification.
14. Improve anything that can be made more coherent.

Then implement the smallest, cleanest architecture that gives Akọ a consistent **soft Feed discovery layer**.

Do not create dead-end pages.

Do not create intrusive prompts.

Do not create fake social proof.

Do not create fake urgency.

Do not create AI-sounding copy.

Do not duplicate Feed ranking.

Do not interfere with Project access.

Do not interfere with wallet/gifting/payouts.

Do not interfere with promotion/reward systems.

Do not mutate the social graph.

Do not force engagement.

Do not optimize blindly for clicks.

Make the experience feel like a confident product quietly saying:

> **“You came for this. There's more happening here.”**

And let the user decide.

---

# 120. DEFINITION OF DONE

This work is complete only when:

- [ ] Repository was inspected before implementation.
- [ ] All relevant non-Feed surfaces were inventoried.
- [ ] Natural completion/access moments were identified.
- [ ] Existing Feed entry points were audited.
- [ ] Existing navigation architecture was preserved/improved.
- [ ] Existing design system was reused.
- [ ] Existing motion system was reused.
- [ ] Feed invitation is optional.
- [ ] Primary Project/task action always remains primary.
- [ ] No blocking Feed modal was introduced without a compelling reason.
- [ ] No repetitive Feed prompts were introduced.
- [ ] Frequency management exists where needed.
- [ ] Course completion has an appropriate discovery moment.
- [ ] Book/project access has an appropriate discovery moment where useful.
- [ ] File download has an appropriate discovery moment where useful.
- [ ] Audio/video completion has an appropriate discovery moment where useful.
- [ ] Room/Meeting/Event flows were audited.
- [ ] Payment success/failure states remain coherent.
- [ ] Error states do not use Feed invitations inappropriately.
- [ ] Feed uses the existing Feed architecture.
- [ ] No second Feed ranking system was created.
- [ ] No social graph mutations occur.
- [ ] No financial reward is generated by invitation clicks.
- [ ] Blocks/privacy/moderation remain authoritative.
- [ ] Deleted content is handled safely.
- [ ] Feed failures cannot break Project access.
- [ ] Deep links work.
- [ ] Back navigation works.
- [ ] Mobile behavior works.
- [ ] Accessibility works.
- [ ] Reduced motion works.
- [ ] Analytics are meaningful and deduplicated.
- [ ] Performance impact is minimal.
- [ ] Existing stronger implementations were preserved.
- [ ] Tests cover major Project and Feed journeys.
- [ ] Final audit report identifies what was already good, what changed, what remains, and any product decisions requiring review.

---

# FINAL PRINCIPLE

## Things users come to Akọ for should work beautifully on their own.

## But no destination should accidentally make Akọ feel smaller than it is.

**The Project gives them a reason to arrive.**

**The Feed gives them a reason to discover.**

**The invitation simply opens the door.**
