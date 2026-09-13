# AKỌ — PERSONAL PROJECT LIBRARY & ACCESS UX AUDIT / UPGRADE SPECIFICATION

## Role

Claude must approach this task as a **veteran UX designer, product designer, information architect, interaction designer, and senior frontend engineer**.

Do not treat this as “add a My Projects page.”

Treat it as a fundamental UX question:

> **Once a user has bought, joined, received, booked, downloaded, or otherwise gained access to something on Akọ, where does that thing live for the user afterward?**

Akọ already has multiple pages and surfaces that can potentially answer this. The goal is to **audit and intentionally connect the existing UI**, not blindly create duplicate pages.

Claude must first inspect the existing repository, routes, components, database model, Project types, navigation, wallet/purchase/access logic, and existing pages.

Preserve what is already good.

Do not rebuild working infrastructure merely to satisfy this document.

If the current implementation is stronger than anything suggested here, keep the stronger implementation and integrate the UX principles around it.

---

# 1. THE CORE UX PROBLEM

A user should never have to remember:

- which creator they bought something from,
- where that creator's profile is,
- which post originally advertised it,
- which chat contained the link,
- which notification they received,
- or which URL they previously clicked

in order to access something they already own or belong to.

The creator's profile is a **discovery surface**.

It is not the user's permanent filing cabinet.

If a user buys a book, that book should become part of the user's accessible collection.

If a user joins a Room, that Room should become part of the user's Rooms.

If a user registers for or attends a Meeting, that Meeting should have a sensible place in their Meetings/history.

If a user downloads a file, there should be a reliable record of that file/download.

If a user buys or joins a Course, the Course should live in their learning area.

If a user has access to a Project, **Akọ should remember that relationship for them.**

---

# 2. PRIMARY PRODUCT PRINCIPLE

## “Things you have access to should have a home.”

This should become a foundational UX principle across the app.

The user journey should feel like:

```text
DISCOVER
   ↓
PROJECT
   ↓
PURCHASE / JOIN / BOOK / RECEIVE ACCESS
   ↓
ACCESS GRANTED
   ↓
PROJECT ENTERS USER'S LIBRARY / RELEVANT AREA
   ↓
USER RETURNS DIRECTLY FROM THEIR OWN UI
```

The user should not need to retrace the discovery journey.

---

# 3. DO NOT ASSUME EVERYTHING BELONGS IN ONE GENERIC LIBRARY

Claude must **not automatically dump every Project into a giant “My Projects” list**.

The user needs information architecture that reflects what the thing actually is.

Potential examples:

```text
My Library
├── Books
├── Courses
├── Rooms
├── Meetings
├── Events
├── Files
├── Audio
└── Video
```

But the existing application may already have better pages.

Claude must inspect what exists before deciding.

The correct architecture could instead be:

```text
Library
├── Reading
├── Learning
├── Communities
├── Meetings
├── Events
└── Files
```

Or:

```text
My Akọ
├── Books
├── Courses
├── Rooms
├── Meetings
├── Saved
└── Downloads
```

Or another structure that is substantially better.

**Do not choose the architecture because this document says so.**

Choose it after understanding:

- current routes,
- existing pages,
- navigation,
- existing Project models,
- user mental models,
- current terminology,
- mobile constraints,
- and what Akọ already exposes.

The job is to make the product coherent.

---

# 4. THE CREATOR PROFILE IS NOT THE USER'S LIBRARY

Audit the current UX for this anti-pattern:

> User buys Project → later wants it → visits creator profile → searches through creator's content → finds Project again.

This is poor retention UX.

The creator profile should answer:

> “What does this person make?”

The user's library should answer:

> “What do I have access to?”

These are different questions.

A user's access should survive:

- creator profile changes,
- creator posts being buried,
- feed ranking changes,
- the original post disappearing,
- notification history becoming crowded,
- time passing.

Access should be represented as a first-class relationship.

---

# 5. AUDIT ALL EXISTING PAGES FIRST

Claude must inventory existing pages and determine what can serve the user's “owned/accessed things” experience.

Search the repository for:

- Library
- Books
- Courses
- Rooms
- Meetings
- Events
- Files
- Downloads
- Purchases
- Orders
- Transactions
- Wallet
- Projects
- Saved
- Bookmarks
- History
- Activity
- Collections
- My Projects
- My Content
- Access
- Membership
- Tickets
- Learning
- Reading
- Media
- Audio
- Video
- Inbox
- Notifications
- Profile
- Account
- Dashboard
- Home
- Navigation
- Bottom navigation
- Sidebar
- Menu
- Project detail
- Project access
- Purchase success
- Checkout
- Payment success
- Join
- Enrollment

Do not assume page names.

Inspect routes and actual components.

Create an internal inventory:

| Existing Surface | Current Purpose | Can Serve User Access? | Keep / Modify / Merge / Retire |
|---|---|---|---|
| Page A | ... | ... | ... |
| Page B | ... | ... | ... |
| Page C | ... | ... | ... |

The purpose is to **reuse intentionally**, not accumulate duplicate destinations.

---

# 6. MAP THE USER'S OBJECTS

Claude should think in terms of **user-owned/accessible objects**, not only Project types.

At minimum audit:

## Books

A user who buys a book should have:

- a persistent place to find it,
- reading state if the product supports it,
- access status,
- last-opened position if supported,
- obvious “Continue reading” behavior,
- purchase/access history where appropriate.

Do not force a full ebook reader if one does not exist.

But the UX must answer:

> “Where are my books?”

---

# 7. COURSES

A purchased/enrolled Course should become part of the user's learning space.

The user should be able to see:

- courses they have access to,
- progress if available,
- last lesson,
- continue learning,
- completed courses,
- access status.

Do not make users return to the creator profile.

If existing Course pages already provide this, connect them.

---

# 8. ROOMS

Rooms are especially important because they represent an ongoing relationship.

If a user belongs to a Room:

> They should be able to find that Room from their own Akọ UI.

They should not normally need:

```text
Profile → Creator → Project → Room
```

Instead:

```text
Akọ
 ↓
My Rooms
 ↓
Room
```

or whatever existing navigation architecture is judged best.

The Room surface should make it obvious:

- which Rooms the user belongs to,
- what is active,
- unread activity,
- upcoming meetings/events if applicable,
- recent announcements,
- recordings/resources if available,
- how to return to the Room.

A Room should feel like a persistent place, not a purchase receipt.

---

# 9. MEETINGS

Meetings need a distinction between:

### Upcoming

Things the user needs to attend.

### Past / History

Things the user attended or had access to.

Depending on the existing model, include:

- date/time,
- Project association,
- creator/host,
- status,
- recording if available,
- meeting notes/resources if available.

A user should be able to answer quickly:

> “What meeting do I have?”

and:

> “What meetings have I had?”

without searching a creator profile or scrolling through notifications.

If the existing app already has calendar/history functionality, integrate rather than duplicate it.

---

# 10. EVENTS

Events should have a persistent home after ticket purchase/registration.

The user should be able to see:

- upcoming events,
- past events,
- ticket/access status,
- event details,
- ticket/access artifact,
- venue or meeting link where applicable,
- recordings/materials if the product supports them.

The original promotional post is not the user's ticket system.

---

# 11. FILES / DOWNLOADS

If a user purchases or accesses a file, there should be a reliable record.

Examples:

- PDF
- ZIP
- audio file
- video
- design asset
- document
- album
- resource pack

The UX should make it easy to answer:

> “What files have I accessed/downloaded?”

Where technically appropriate, distinguish:

- available to access,
- downloaded,
- expired,
- revoked,
- unavailable,
- deleted/orphaned.

Do not imply a file remains downloadable forever if the underlying access has been revoked.

---

# 12. AUDIO / VIDEO / MEDIA

Audit how purchased/accessed media currently behaves.

Users should not have to rediscover media through the creator.

Possible UX:

- Continue listening
- Continue watching
- Recently accessed
- My media
- Purchased media
- Project resources

Do not add categories merely because they sound complete.

Use the smallest information architecture that makes retrieval effortless.

---

# 13. SAVED IS NOT THE SAME AS OWNED

This distinction is critical.

A user can:

- save a Project,
- bookmark a post,
- purchase a Project,
- join a Room,
- register for an Event,
- enroll in a Course,
- access a File.

These are different relationships.

Do not merge them into one ambiguous “Saved” list.

For example:

```text
Saved
= “I want to come back to this.”

Owned / Access
= “I have access to this.”

Joined
= “I belong to this.”

History
= “I interacted with this.”
```

The UI should reflect these distinctions.

---

# 14. PURCHASE HISTORY VS ACCESS LIBRARY

Do not confuse:

### Transaction history

“What have I paid for?”

with:

### Access library

“What can I access right now?”

A user may have:

- purchased a Course,
- joined a Room,
- received access,
- had access revoked,
- downloaded a file,
- bought an Event ticket,
- purchased a book.

Transaction history is useful for receipts/accounting.

Library/access is useful for daily product use.

Both may exist.

They should not be forced into one screen if that creates poor UX.

---

# 15. THE POST-PURCHASE EXPERIENCE

Audit the moment immediately after purchase.

Ideal flow:

```text
Project
 ↓
Checkout
 ↓
Payment
 ↓
Success
 ↓
Access granted
 ↓
“Open now” / “Go to your library”
```

The success screen should not simply say:

> Payment successful.

It should answer:

> “What do I do now?”

Examples:

### Book

“Your book is ready.”

→ Start reading

### Course

“You're enrolled.”

→ Start course

### Room

“You're in.”

→ Open Room

### Meeting

“Meeting added to your schedule/history.”

→ View meeting

### Event

“Your ticket is ready.”

→ View event/ticket

### File

“Your file is ready.”

→ Open/download

Use the existing design system.

Do not create seven unrelated success experiences if a reusable pattern can handle them.

---

# 16. ACCESS SHOULD BE IMMEDIATE

After successful purchase/access:

1. transaction completes,
2. authoritative backend access is created,
3. user-facing library/access state updates,
4. UI gives a direct route to the thing.

Do not rely on:

- refreshing manually,
- returning to the creator,
- reopening the original post,
- waiting for notification,
- remembering a URL.

If eventual consistency exists, handle it gracefully with a clear state rather than a dead end.

---

# 17. THE USER'S OWN UI SHOULD REMEMBER

The product should gradually develop a sense of:

> “These are the things you are doing.”

Potential home/library sections:

- Continue reading
- Continue learning
- Your Rooms
- Upcoming meetings
- Upcoming events
- Recently accessed
- Downloads
- Saved

But avoid dashboard clutter.

Claude must determine which modules are genuinely useful from the existing product.

A user's home should not become an ERP dashboard.

---

# 18. INFORMATION ARCHITECTURE AUDIT

Claude must explicitly evaluate:

### Discoverability

Can a user intuitively find their purchased/joined content?

### Findability

Can they locate a known Project in seconds?

### Recognition

Does the UI remind them what each item is?

### Retrieval

Can they return after days/weeks without remembering where it came from?

### Status

Can they tell:

- purchased,
- joined,
- enrolled,
- upcoming,
- completed,
- downloaded,
- expired,
- unavailable?

### Continuity

Does the experience pick up where the user left off?

---

# 19. NAVIGATION AUDIT

Inspect the existing:

- bottom navigation,
- sidebar,
- profile menu,
- More menu,
- home actions,
- global navigation,
- search,
- notifications,
- wallet,
- Projects area.

Determine where a user's persistent content belongs.

Do not automatically add another bottom-nav item.

Ask:

> What is the most natural place in Akọ's existing information architecture for “things that belong to me”?

Possible answers may include:

- Library
- My Akọ
- Projects
- Home
- Profile menu
- dedicated tab
- contextual navigation

The correct answer depends on the existing product.

---

# 20. MOBILE-FIRST UX

Akọ is becoming a native mobile application.

Therefore audit the experience for:

- thumb reach,
- bottom navigation,
- compact cards,
- swipe/scroll behavior,
- mobile-safe headers,
- back navigation,
- deep links,
- loading states,
- empty states,
- offline-ish states,
- small screens,
- accessibility,
- Android behavior,
- iOS behavior.

Do not design a desktop dashboard and squeeze it onto mobile.

---

# 21. EMPTY STATES

Empty states should teach users where things will appear.

Examples:

### No books yet

Not:

> No data.

Instead:

> Your books will appear here when you get one.

Then provide an appropriate discovery action if one exists.

### No Rooms

Explain:

> Rooms you join will live here.

### No meetings

Explain:

> Your upcoming and past meetings will appear here.

### No downloads

Explain:

> Files you access or download will appear here.

Empty states should reduce uncertainty.

---

# 22. LOADING STATES

Do not show blank pages while access collections load.

Use:

- skeletons,
- meaningful placeholders,
- cached last-known state where safe,
- progressive loading.

Avoid fake loading timers.

Loading must represent real asynchronous state.

---

# 23. ERROR STATES

Handle:

- Project no longer available,
- creator deleted Project,
- access revoked,
- payment succeeded but access provisioning delayed,
- file unavailable,
- expired event,
- cancelled meeting,
- deleted Room,
- network failure,
- authorization failure.

Do not leave users with:

> Something went wrong.

Tell them what happened and what they can do next.

---

# 24. ORPHANED CONTENT

This must integrate with Akọ's existing orphan-content rules.

If a saved/shared/bookmarked/download-linked Project or post is deleted:

The user should not encounter a broken screen.

Show a subtle unavailable state.

For example:

> This content is no longer available.

But if the user has a legitimate purchase/access relationship, determine whether access should remain available based on the authoritative Project/access rules.

Do not automatically destroy access merely because a discovery post disappeared.

---

# 25. ACCESS CONTROL IS AUTHORITATIVE

The UI must never decide ownership.

The client should not be able to manufacture:

- purchased status,
- Room membership,
- Course enrollment,
- ticket access,
- file access,
- download authorization.

The server/database remains authoritative.

UI states are projections of authoritative access.

Audit:

- RLS,
- access tables,
- purchase records,
- membership records,
- Project permissions,
- signed URLs,
- download authorization,
- entitlement logic.

---

# 26. ACCESS RELATIONSHIPS

Claude should inspect the current database model and determine whether Akọ has a coherent concept of:

```text
user → Project → access
```

or equivalent relationships.

Do not automatically introduce a new generic ownership table if existing tables already model this correctly.

But if the existing implementation has fragmented access logic, consider whether a normalized entitlement/access layer would make the system safer and easier to reason about.

Possible conceptual states:

```text
discovered
saved
purchased
joined
enrolled
registered
access_granted
access_active
access_expired
access_revoked
completed
```

Not every Project type needs every state.

The model should match actual product semantics.

---

# 27. “MY THINGS” SHOULD BE ACTION-ORIENTED

Do not make the user's library a cemetery of cards.

Each item should answer:

- What is this?
- Why is it here?
- What can I do now?

Examples:

```text
Book
[Cover]
Title
Creator
Reading progress
Continue reading
```

```text
Course
Title
Creator
Progress
Continue
```

```text
Room
Name
Creator
Unread indicator
Next meeting
Open room
```

```text
Meeting
Title
Date/time
Status
Join / View details
```

```text
Event
Name
Date
Ticket/access
View event
```

```text
File
Name
Type
Project
Downloaded/accessed
Open/download
```

Use progressive disclosure.

Do not show every possible metadata field.

---

# 28. RECENT ACTIVITY / CONTINUITY

Consider a small “Continue” or “Recent” layer where it genuinely improves retrieval.

Examples:

- Continue reading
- Continue course
- Return to Room
- Upcoming meeting
- Recently accessed file

This is particularly valuable when a user has many Projects.

But avoid turning Recent into another confusing duplicate of History.

Claude should define clear semantics.

---

# 29. SEARCH AND FILTER

If the collection becomes large, users need retrieval tools.

Audit whether existing search can search:

- Project title,
- creator,
- Project type,
- Room,
- Course,
- Book,
- Event,
- Meeting,
- File.

Useful filters may include:

- type,
- active/completed,
- upcoming/past,
- downloaded/not downloaded,
- reading/learning progress.

Do not over-filter a small collection.

Start simple.

---

# 30. SORTING

Potential sorting:

- Recently accessed
- Recently purchased
- Upcoming
- Alphabetical
- Progress
- Most recently updated

Do not add a sort menu merely because it is technically easy.

Prioritize the sort order that matches the user's job.

Default ordering should usually be intelligent.

---

# 31. PROJECT-TYPE-SPECIFIC UX

Claude must create a UX matrix.

| Project Type | User Relationship | Persistent Home | Primary Action |
|---|---|---|---|
| Book | Purchased/accessed | Reading/Books | Read |
| Course | Enrolled | Learning/Courses | Continue |
| Room | Member | Rooms | Open Room |
| Meeting | Registered/attended | Meetings | Join/View |
| Event | Ticket holder | Events | View ticket/event |
| File | Purchased/accessed | Files/Downloads | Open/Download |
| Audio | Purchased/accessed | Media/Audio | Play |
| Video | Purchased/accessed | Media/Video | Watch |

This is a conceptual matrix.

Claude must adapt it to the actual Project model.

---

# 32. PROJECTS THAT CONTAIN MULTIPLE THINGS

A Project may contain:

- files,
- meetings,
- lessons,
- recordings,
- resources,
- links,
- announcements,
- tickets.

Do not make users navigate a maze.

Example:

```text
Course
 ├── Lessons
 ├── Resources
 └── Recordings
```

Example:

```text
Room
 ├── Feed
 ├── Meetings
 ├── Recordings
 └── Resources
```

The parent Project should be the organizing object where appropriate.

---

# 33. DEEP LINKS

Every persistent user-accessible object should have a stable route where appropriate.

Examples:

```text
/rooms/:id
/courses/:id
/books/:id
/meetings/:id
/events/:id
/projects/:id
```

Do not expose IDs insecurely if the app has a better existing routing strategy.

Deep links should respect:

- authentication,
- authorization,
- access status,
- deleted content,
- blocked users,
- revoked access.

---

# 34. NOTIFICATIONS ARE NOT STORAGE

Notifications tell users something happened.

They should not be the only way to access something important.

For example:

> “You joined Room X.”

The notification is useful.

But Room X must also appear in the user's persistent Rooms area.

Likewise:

> “Your purchase was successful.”

The receipt/notification is useful.

But the Book/Course/etc. must live in the appropriate access area.

---

# 35. CHAT LINKS ARE NOT STORAGE

If someone sends a Project in chat:

```text
Chat → Project
```

that is discovery.

Once the user gains access:

```text
Chat → Project
             ↓
       persistent access
```

The user should not have to search the chat later.

---

# 36. FEED POSTS ARE NOT STORAGE

A Project may be discovered through:

- Feed
- Discover
- Search
- Profile
- Chat
- External share
- Affiliate fork
- Promotion

Once acquired, the access relationship should outlive the discovery surface.

---

# 37. PURCHASED PROJECTS AND CREATOR CHANGES

Audit behavior if:

- creator edits Project,
- creator unpublishes Project,
- creator deletes Project,
- creator account is suspended,
- Project price changes,
- Project content changes,
- Room closes,
- Course updates.

Users need predictable access semantics.

Do not silently lose a user's legitimate access.

Do not promise permanent access if the product does not support it.

---

# 38. UX COPY

Use calm, direct language.

Avoid:

- “Your digital asset inventory”
- “Entitlement management”
- “Content repository”

Prefer human language:

- Your books
- Your courses
- Your rooms
- Your meetings
- Your events
- Your files
- Continue reading
- Continue learning
- Upcoming
- History

But preserve Akọ's established terminology where it is already intentional.

---

# 39. VISUAL DESIGN DIRECTION

The UI should feel:

- modern,
- smooth,
- lightweight,
- confident,
- organized,
- premium without being corporate,
- consistent with Akọ.

Avoid:

- giant dashboard boxes,
- excessive borders,
- information overload,
- unnecessary gradients,
- excessive badges,
- clutter,
- “SaaS admin panel” aesthetics.

Use the existing Akọ design language.

The user's personal library should feel like a natural extension of the app, not a separate product.

---

# 40. MOTION

Integrate with the existing Akọ micro-interaction system.

Useful motion:

- item entering library after purchase,
- subtle success transition,
- progress movement,
- opening Room,
- continuing a Book/Course,
- ticket becoming available,
- download completion.

Do not animate everything.

Motion should reinforce:

> “This is now yours / accessible to you.”

Respect reduced-motion preferences.

---

# 41. PURCHASE → LIBRARY TRANSITION

This deserves special attention.

After a successful transaction, the user should feel a clear transition:

```text
I discovered this
        ↓
I bought/joined it
        ↓
Now it belongs in my Akọ world
```

The transition should be obvious but not theatrical.

Potential pattern:

```text
✓ You're in

[Open Room]

You'll also find this in
Your Rooms.
```

or:

```text
✓ Book added

[Start reading]

Find it anytime in
Your Books.
```

Use the appropriate existing terminology.

---

# 42. WALLET INTEGRATION

Wallet is the financial record.

Library/access is the product-access record.

Do not overload Wallet with content retrieval.

Wallet can show:

- transaction,
- amount,
- purchase,
- refund,
- gift,
- earnings.

Library can show:

- access,
- content,
- progress,
- next action.

These systems should connect but remain conceptually distinct.

---

# 43. REFUNDS / REVOKED ACCESS

Audit the UX for:

- refund,
- chargeback,
- failed payment,
- expired membership,
- cancelled event,
- revoked access.

A Project may move from:

```text
active
→ access revoked
```

The user should receive a clear explanation.

Avoid silently removing it from history where financial/accounting records require retention.

Possible distinction:

```text
Active access
Past / history
Unavailable
```

Again, use the smallest architecture that works.

---

# 44. ADMIN AND SUPPORT

Admin should be able to understand a user's access when debugging.

Audit existing Admin pages for:

- purchase,
- entitlement,
- membership,
- enrollment,
- ticket,
- download,
- access revocation.

For support/admin:

> “Why can this user access this Project?”

should have an inspectable answer.

Do not expose sensitive financial/security information unnecessarily to ordinary users.

---

# 45. ANALYTICS

Add or audit events such as:

- project_access_granted
- project_library_added
- project_library_opened
- project_continue_clicked
- project_completed
- project_access_revoked
- project_downloaded
- room_opened
- course_started
- course_continued
- meeting_joined
- event_opened
- ticket_viewed

Use the existing analytics architecture.

Do not create duplicate analytics systems.

The purpose is to understand whether users can actually retrieve what they acquired.

---

# 46. UX SUCCESS METRICS

Claude should evaluate:

### Retrieval success

Can users find an acquired Project without returning to the creator?

### Time to access

How many actions from app open to desired content?

### Post-purchase continuation

How often does purchase lead directly to first meaningful use?

### Return behavior

Do users return to acquired content later?

### Abandonment

Where do users lose the path?

### Navigation confusion

Do users repeatedly use search/profile/chat to rediscover owned content?

---

# 47. USER JOURNEY TESTS

Test at least:

## Journey A — Buy Book

```text
Feed
→ Book
→ Purchase
→ Success
→ Start reading
→ Leave
→ Reopen app
→ Find Book without creator profile
→ Continue reading
```

## Journey B — Join Room

```text
Post
→ Room
→ Join
→ Success
→ Open Room
→ Leave
→ Reopen app
→ Find Room
→ Open Room
```

## Journey C — Buy Course

```text
Project
→ Purchase
→ Course access
→ Lesson 1
→ Leave
→ Reopen
→ Continue course
```

## Journey D — Meeting

```text
Project
→ Book/register
→ Meeting appears in user's Meeting area
→ Upcoming
→ Join
→ Later
→ Meeting history
```

## Journey E — Event

```text
Post
→ Event
→ Ticket
→ Purchase
→ Ticket accessible from user's event area
```

## Journey F — File

```text
Project
→ Purchase/access
→ File
→ Download
→ Later
→ Download/history area
→ Find file
```

## Journey G — Creator Profile Avoidance

Explicitly test:

> User knows they bought something but does not remember the creator.

They should still be able to find it.

---

# 48. THE “I BOUGHT THIS MONTHS AGO” TEST

This is the most important mental-model test.

Imagine the user bought something three months ago.

They remember:

> “I bought that course.”

They do not remember:

- creator name,
- original post,
- date,
- chat,
- URL.

Can they find it?

If the answer is no, the UX is incomplete.

---

# 49. THE “I BELONG HERE” TEST

For Rooms:

Imagine a user joins five Rooms.

Can they open the app and immediately understand:

> “These are my Rooms.”

without navigating through five creators?

If not, the information architecture is incomplete.

---

# 50. THE “WHAT DO I HAVE?” TEST

A user should be able to answer:

> What have I bought?
> What am I enrolled in?
> What Rooms am I in?
> What meetings are coming?
> What events do I have?
> What files have I accessed?

without reconstructing their history manually.

---

# 51. AVOID DASHBOARD BLOAT

The solution is not:

> “Put everything on one giant page.”

Claude must use hierarchy.

Example:

```text
My Akọ
│
├── Continue
│
├── Your Rooms
│
├── Upcoming
│
├── Books
│
└── Courses
```

or a different structure if the existing app supports something better.

Use:

- tabs,
- filters,
- segmented controls,
- sections,
- dedicated pages,
- contextual navigation

only where they improve clarity.

---

# 52. EXISTING PAGES ARE RAW MATERIAL

This instruction is especially important.

The repository already contains several pages that can likely be repurposed.

Claude must not say:

> “We need to create a Library page.”

until it has inspected the existing application.

Maybe the app already has:

- Projects
- Purchases
- Saved
- Profile
- Wallet
- Rooms
- Courses
- Meetings
- Downloads
- History

Some may already be 70–90% of the required UX.

The task is to **connect and reshape them into a coherent mental model.**

---

# 53. INFORMATION ARCHITECTURE DECISION RECORD

After auditing, Claude must document:

### Current architecture

What exists today?

### Problems

Where do users currently get lost?

### Proposed architecture

Where should each user-accessible object live?

### Why

Explain the reasoning.

### Existing pages reused

Which pages are retained?

### Existing pages modified

Which pages are reshaped?

### New pages

Only create new pages where genuinely necessary.

### Pages merged/retired

Remove redundant paths where safe.

---

# 54. DO NOT BREAK EXISTING ROUTES

Before changing navigation:

- inventory routes,
- identify deep links,
- inspect external links,
- inspect notifications,
- inspect chat links,
- inspect Project links,
- inspect creator profile links,
- inspect affiliate links,
- inspect promotion links.

If a route changes, provide a safe migration/redirect strategy where appropriate.

Do not create dead links.

---

# 55. ACCESS FROM MULTIPLE SURFACES

The same Project may be reachable through:

```text
Feed
Discover
Search
Profile
Chat
Notification
External link
Affiliate link
Promotion
Library
```

All should converge on the same authoritative Project/access experience.

Do not create seven different Project-detail implementations.

---

# 56. ONE PROJECT, ONE SOURCE OF TRUTH

The UI may have multiple entry points.

The Project itself should remain one coherent entity.

Example:

```text
Feed card
   ↓
Project detail
   ↓
Purchase/access

Library card
   ↓
Same Project detail/access

Notification
   ↓
Same Project detail/access

Chat
   ↓
Same Project detail/access
```

Avoid divergent states.

---

# 57. ACCESSIBILITY

Audit:

- screen reader labels,
- keyboard navigation,
- focus states,
- contrast,
- touch target sizes,
- semantic headings,
- progress announcements,
- error messaging.

Do not make library content visually beautiful but functionally inaccessible.

---

# 58. PERFORMANCE

Large libraries should not become slow.

Audit:

- pagination,
- lazy loading,
- image optimization,
- query efficiency,
- indexes,
- caching,
- duplicate requests,
- N+1 queries,
- realtime subscriptions.

Do not fetch every Project the user has ever interacted with when only active access is needed.

---

# 59. SECURITY

Audit for:

- unauthorized access to purchased content,
- IDOR,
- client-manipulated ownership,
- forged Project IDs,
- unauthorized file downloads,
- stale access,
- revoked access still working,
- RLS bypass,
- insecure signed URLs,
- access checks only on frontend,
- race conditions around purchase/access provisioning.

The library is not merely UI.

It is a security boundary around purchased/authorized content.

---

# 60. DATA CONSISTENCY

Purchase success and access creation must be designed together.

Potential failure:

```text
Payment succeeded
BUT
Access record not created
```

This must not leave the user permanently stranded.

Claude should inspect current transaction/access architecture and ensure there is a recoverable, idempotent provisioning path.

Likewise:

```text
Access granted
BUT
Purchase transaction duplicated
```

must be impossible or safely reconciled.

Do not create a second payment system.

---

# 61. IDEMPOTENCY

Repeated actions must not create:

- duplicate library entries,
- duplicate memberships,
- duplicate course enrollments,
- duplicate tickets,
- duplicate access records.

Use existing idempotency architecture where present.

---

# 62. REALTIME UPDATES

If Rooms, Courses, Meetings, or other Project content updates in realtime:

The user's library should reflect relevant changes without unnecessary refreshes.

But do not subscribe to everything.

Use the existing realtime architecture intelligently.

---

# 63. OFFLINE / INTERRUPTED STATES

On mobile, users may lose connectivity.

If they open their library during a weak connection:

- show cached information where safe,
- distinguish stale from live state,
- do not claim access that cannot be verified if authorization is required,
- recover gracefully.

Do not make offline handling unnecessarily complex if Akọ does not support offline content.

---

# 64. DESIGN SYSTEM

Use existing:

- spacing,
- typography,
- cards,
- buttons,
- icons,
- colors,
- shadows,
- modal patterns,
- sheets,
- tabs,
- loading states.

Create reusable primitives where patterns genuinely repeat.

Avoid one-off styling for every Project type.

---

# 65. PROJECT CARD SYSTEM

If multiple library pages use cards, establish a coherent card grammar.

Possible hierarchy:

```text
Visual
Title
Creator
Status/progress
Relevant metadata
Primary action
```

But adapt by Project type.

A Room card should not look exactly like a Book card.

They should feel related without becoming identical.

---

# 66. MOBILE CARD PRIORITY

On small screens, show the minimum necessary:

### Book

Cover → title → progress → continue.

### Course

Title → progress → continue.

### Room

Name → unread/upcoming signal → open.

### Meeting

Title → date/time → join/view.

### Event

Title → date → ticket/access.

### File

Name → type → open/download.

Do not cram desktop metadata into mobile cards.

---

# 67. RECENT VS PERMANENT

Define semantics clearly.

### Permanent access

Things the user currently owns/is entitled to.

### Recent

Things the user recently interacted with.

### History

Things that happened in the past.

### Saved

Things the user intentionally bookmarked for later.

Do not mix them accidentally.

---

# 68. CREATOR CONTENT VS USER ACCESS

Keep these two navigation concepts distinct.

```text
Creator
“What does this person offer?”

User Library
“What do I have?”

Feed
“What is happening?”

Discover
“What might I want?”

Wallet
“What happened financially?”

Notifications
“What happened recently?”

Chat
“What are people saying to me?”
```

This is a useful mental-model map.

Claude should refine it according to the actual product.

---

# 69. PRODUCT DISCOVERY SHOULD FEED LIBRARY

A successful discovery system should naturally lead into persistent access.

```text
Discover
   ↓
Interest
   ↓
Project
   ↓
Purchase
   ↓
Library
   ↓
Usage
   ↓
Return
```

This creates a healthy product loop.

The library is not merely archival.

It becomes the user's bridge from discovery to continued use.

---

# 70. HOME SHOULD KNOW WHAT MATTERS

If a user has:

- an upcoming meeting in 2 hours,
- an unfinished course,
- a Room with new activity,
- a book they were reading yesterday,

the app may surface the most relevant item.

But do not let these contextual surfaces replace the permanent library.

The user should always have a reliable place to retrieve the thing.

---

# 71. NO “WHERE DID IT GO?” MOMENTS

Claude should explicitly audit these failure scenarios:

### Purchased Project disappears from obvious UI.

### Joined Room cannot be found.

### Course enrollment exists but Course isn't discoverable.

### Meeting exists but user cannot locate it.

### Ticket exists but user must search notifications.

### Downloaded file has no history.

### User returns weeks later and cannot remember creator.

Every one of these should have a clear resolution.

---

# 72. DESIGN FOR RETURN VISITS

A good library is mostly about the **second visit**, not the first.

First visit:

> “I bought this.”

Second visit:

> “Where is it?”

Third visit:

> “Continue where I stopped.”

Design around the second and third visits.

---

# 73. MICROCOPY SHOULD REDUCE MEMORY LOAD

Instead of:

> Project

Use contextual labels:

> Your Rooms

> Your Books

> Continue learning

> Upcoming meetings

> Your files

This reduces cognitive load.

---

# 74. DO NOT OVER-EMPHASIZE PURCHASES

The user's library should not feel like an e-commerce order history.

Akọ is a social platform where Projects become things people participate in.

Therefore:

```text
Purchase
→ Access
→ Participation
```

is often more meaningful than:

```text
Order
→ Receipt
→ Transaction
```

Financial records still exist in Wallet/history.

---

# 75. SOCIAL CONTEXT

Where useful, show contextual social information:

- creator,
- Room members,
- upcoming session,
- recent announcement,
- community activity.

But do not let social context overwhelm the user's ability to access the thing.

---

# 76. ROOMS AS FIRST-CLASS DESTINATIONS

Rooms deserve particular attention.

A Room is not merely:

> a Project card.

It is an ongoing social destination.

Claude should audit whether Room membership creates:

- a persistent navigation path,
- unread state,
- activity state,
- upcoming meetings,
- recordings,
- resources,
- announcements,
- member context.

If these already exist, connect them.

If not, identify the minimum needed.

---

# 77. COURSES AS FIRST-CLASS LEARNING DESTINATIONS

Courses should support a clear:

```text
Course
→ Progress
→ Continue
→ Completion
```

If course progress already exists, surface it.

Do not duplicate progress calculations.

---

# 78. BOOKS AS FIRST-CLASS READING DESTINATIONS

Books should support:

```text
Book
→ Read
→ Continue
```

If reading progress does not exist yet, do not invent a complex reader backend.

But the UX should still establish where books belong.

---

# 79. MEETINGS AS TIME-BASED OBJECTS

Meetings should be organized around time.

Useful concepts:

```text
Upcoming
Today
Past
```

But only implement what fits the current app.

---

# 80. FILES AS RETRIEVABLE RESOURCES

A downloaded file should not vanish from the user's mental model.

Even if the actual file is stored on the device, Akọ should maintain an appropriate app-side record of the Project/file relationship where the existing product supports it.

---

# 81. USER-INITIATED DOWNLOAD HISTORY

Distinguish, where useful:

```text
Available
Downloaded
Recently downloaded
```

Do not imply that “download history” means Akọ can inspect arbitrary files on the user's device.

Only track downloads performed through Akọ's own mechanisms.

---

# 82. DELETE / HIDE FROM LIBRARY

If users can remove something from their personal view:

Be explicit about whether they are:

- hiding it,
- removing a shortcut,
- leaving a Room,
- cancelling enrollment,
- revoking access,
- deleting local download.

These are different operations.

Do not use destructive semantics for a simple UI hide.

---

# 83. FAVORITES / SAVED

If Saved already exists, preserve it.

But clarify:

```text
Saved = remember this
Library = access this
```

If a user saves a Project and later purchases it:

It may appear in both conceptual states, but the UI should avoid confusing duplicates.

Claude must decide based on existing architecture.

---

# 84. NOTIFICATION → PERSISTENT ACCESS

Notifications should link to the relevant persistent destination.

Example:

```text
“You've joined AI Builders Room”
       ↓
Open Room
```

The notification is not the destination.

---

# 85. CHAT → PERSISTENT ACCESS

A shared Project in chat should resolve to the same canonical Project.

If the user purchases it:

The access relationship becomes persistent.

---

# 86. EXTERNAL LINK → PERSISTENT ACCESS

A user may buy from an external/shared link.

After authentication/payment:

The Project should still enter the user's normal access experience.

Do not create a separate “externally purchased” silo.

---

# 87. AFFILIATE FLOW INTEGRATION

Akọ has affiliate forking and persistent attribution.

If a user buys a Project through an affiliate fork:

- attribution must remain intact,
- commission must be calculated correctly,
- user access should still behave exactly like any other legitimate Project purchase.

The affiliate relationship is financial attribution.

It should not fragment the user's library.

---

# 88. PROMOTED PROJECTS

If a promoted post contains a Project and the user purchases it:

The resulting access should flow into the same library/access architecture.

Promotion should not create a separate content silo.

---

# 89. GIFTS

If gifting creates access to something in future/current product behavior, audit how that relationship appears.

Do not assume every gift creates Project access.

Respect the actual gift semantics.

---

# 90. ACCESSIBLE FROM PROFILE, BUT NOT DEPENDENT ON PROFILE

It is acceptable for the creator profile to contain:

> View Project

But once acquired:

The user should have a second, personal route.

Ideal relationship:

```text
Creator profile
    ↓
Discovery / purchase

User library
    ↓
Return / access
```

---

# 91. NO DUPLICATE BUSINESS LOGIC

If an existing Project access helper exists:

Use it.

If an existing purchase query exists:

Use it.

If existing Room membership logic exists:

Use it.

Do not create multiple systems solving the same problem.

Audit first.

Consolidate where necessary.

---

# 92. BACKEND / FRONTEND CONTRACT

The frontend needs a coherent contract for:

- accessible Projects,
- access status,
- type,
- progress,
- next action,
- availability,
- relevant metadata.

Avoid making every library page assemble this independently from raw tables.

If appropriate, establish a clean read model/view/query layer while preserving authoritative underlying records.

Do not overengineer.

---

# 93. UX STATE MODEL

For each Project type, map:

```text
Not discovered
↓
Discovered
↓
Saved
↓
Checkout
↓
Purchased / Joined / Registered
↓
Access granted
↓
In library
↓
In use
↓
Completed / attended / downloaded
↓
Past / history
↓
Revoked / unavailable
```

Not every Project uses every state.

Claude must document the actual state transitions.

---

# 94. DESIGN REVIEW CHECKLIST

Claude must ask:

### Findability

- Can users find acquired content without creator profiles?
- Is there a clear personal destination?
- Is it obvious from navigation?

### Clarity

- Does each section have a clear purpose?
- Are Saved and Access distinct?
- Are History and Library distinct?

### Continuity

- Can users continue where they stopped?
- Are upcoming things prioritized?

### Consistency

- Do all Project types follow a coherent pattern?
- Do different entry points converge?

### Mobile

- Is this excellent on a phone?
- Are actions thumb-friendly?

### Security

- Is access server-authoritative?
- Are files protected?

### Performance

- Does it remain fast with hundreds of accessible items?

### Emotional UX

- Does the user feel:
  > “Akọ remembers what I'm doing.”

rather than:

  > “Akọ makes me search for what I already bought.”

---

# 95. IMPLEMENTATION APPROACH

Claude must follow this sequence.

## Phase 1 — Repository audit

Read:

- route structure,
- navigation,
- Project components,
- Project types,
- purchase flow,
- wallet,
- access/membership,
- Rooms,
- Courses,
- Meetings,
- Events,
- Files,
- Books,
- Saved,
- History,
- Notifications,
- Profile,
- Admin,
- database schema,
- RLS,
- relevant Edge Functions.

Do not modify code yet.

## Phase 2 — Existing UX map

Produce an internal map:

```text
Where does a Book live?
Where does a Course live?
Where does a Room live?
Where does a Meeting live?
Where does an Event live?
Where does a File live?
Where does purchased Project access live?
```

Mark:

- already solved,
- partially solved,
- duplicated,
- missing,
- confusing,
- insecure.

## Phase 3 — Information architecture

Design the smallest coherent architecture.

Prioritize reuse.

Do not create new destinations merely because they sound cleaner.

## Phase 4 — Interaction flows

Map:

```text
Discover → Purchase → Access → Library → Return
```

for each Project type.

## Phase 5 — UI implementation

Use existing:

- components,
- tokens,
- patterns,
- routes,
- APIs,
- access logic.

Add only what is needed.

## Phase 6 — Polish

Improve:

- hierarchy,
- spacing,
- typography,
- empty states,
- loading states,
- error states,
- transitions,
- micro-interactions,
- mobile ergonomics.

## Phase 7 — End-to-end testing

Test both happy and broken paths:

- payment success but access delayed,
- Project deleted,
- access revoked,
- logout/login on another device,
- network failure,
- duplicate purchase,
- deep link,
- notification link,
- chat link.

---

# 96. DO NOT BLINDLY IMPLEMENT

This is an audit-and-upgrade specification.

Claude must not mechanically create:

- Library page,
- Books page,
- Courses page,
- Rooms page,
- Meetings page,
- Events page,
- Downloads page

just because they appear in this document.

That could produce fragmented UX.

Instead:

> **Find the existing architecture. Understand it. Then make it coherent.**

---

# 97. VETERAN UX DESIGN STANDARD

Claude should evaluate decisions using established UX principles such as:

- Jakob's Law — respect familiar mental models.
- Recognition over recall — remind users where their things are.
- Hick's Law — reduce unnecessary choices.
- Fitts's Law — make frequent mobile actions easy to reach.
- Aesthetic-usability effect — polish matters, but polish must serve usability.
- Progressive disclosure — reveal detail when needed.
- Consistency — similar relationships should behave similarly.

Use these principles as design tools, not buzzwords.

---

# 98. MODERN PRODUCT UX

The final experience should feel like a mature product.

Not:

> “We added pages for purchased projects.”

But:

> “Akọ understands the things I am participating in.”

The user should naturally develop a mental model:

```text
Feed
= ideas

Discover
= possibilities

Projects
= things people build

Library / My Akọ
= things I have access to

Rooms
= communities I belong to

Wallet
= my financial activity

Notifications
= things that happened

Chat
= conversations
```

This is only a starting hypothesis.

Claude must validate it against the actual application.

---

# 99. DEFINITION OF DONE

This task is complete only when:

- [ ] Existing routes/pages have been audited.
- [ ] Existing Project types have been mapped.
- [ ] Existing access/purchase logic has been inspected.
- [ ] A coherent personal-access information architecture exists.
- [ ] Users can find purchased Books without creator profiles.
- [ ] Users can find Courses without creator profiles.
- [ ] Users can find Rooms without creator profiles.
- [ ] Users can find Meetings without creator profiles.
- [ ] Users can find Events without creator profiles.
- [ ] Users can find Files/Downloads without creator profiles.
- [ ] Audio/Video access has an intentional home if supported.
- [ ] Saved is clearly distinguished from purchased/accessed content.
- [ ] Transaction history is distinguished from access library where appropriate.
- [ ] Purchase success routes users directly into useful action.
- [ ] Access is server-authoritative.
- [ ] Existing RLS/security is preserved or strengthened.
- [ ] Duplicate access records are prevented.
- [ ] Payment/access provisioning is idempotent.
- [ ] Deep links work.
- [ ] Notifications link to persistent destinations.
- [ ] Chat links converge on canonical Project/access pages.
- [ ] External/affiliate/promotion purchases enter the same access architecture.
- [ ] Deleted/orphaned content is handled gracefully.
- [ ] Revoked access is handled correctly.
- [ ] Empty states are useful.
- [ ] Loading states are real.
- [ ] Error states are actionable.
- [ ] Mobile UX is polished.
- [ ] Existing Akọ design language is preserved.
- [ ] Motion follows the existing motion system.
- [ ] Performance is acceptable.
- [ ] Analytics are integrated with existing architecture.
- [ ] End-to-end user journeys pass.
- [ ] No redundant duplicate library systems were created.
- [ ] No unnecessary new pages were created.
- [ ] Existing good work was preserved.
- [ ] Navigation has no dead ends.
- [ ] A user can answer “Where is the thing I bought?” without thinking about the creator who sold it.

---

# 100. FINAL PRODUCT PRINCIPLE

The implementation should make this statement true:

> **When I acquire something on Akọ, Akọ gives it a place in my world.**

A user should be able to leave the original post, creator profile, notification, chat, search result, or external link behind.

The thing they acquired should remain findable.

Not because they remember where they found it.

Because **Akọ remembers that it is theirs to access.**

---

# FINAL CLAUDE INSTRUCTION

Before touching code:

1. Read this entire specification.
2. Inspect the entire existing relevant application.
3. Map the current information architecture.
4. Identify existing pages that can already solve parts of this problem.
5. Identify duplication and fragmentation.
6. Identify missing persistent access paths.
7. Design the cleanest coherent UX.
8. Preserve stronger existing implementations.
9. Implement only the necessary changes.
10. Re-test all affected flows.
11. Audit security and access control.
12. Audit mobile UX.
13. Audit empty/loading/error states.
14. Verify that purchased/joined/accessed Projects are retrievable without returning to creator profiles.
15. Produce a concise final report describing:
   - what already existed,
   - what was changed,
   - what was reused,
   - what was newly created,
   - what was intentionally not changed,
   - any remaining product decisions,
   - any security/performance concerns.

**Do not optimize for number of pages. Optimize for clarity of the user's mental model.**

**Do not build a “library” because the word sounds right. Build the place where the user's acquired world naturally lives.**
