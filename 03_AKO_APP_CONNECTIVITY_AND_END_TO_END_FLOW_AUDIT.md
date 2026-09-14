# AKỌ — Application Connectivity & End-to-End Flow Audit Specification

## 1. Purpose

This document defines the audit-and-upgrade specification for **connecting Akọ as one coherent application**.

The central problem this document is designed to prevent is:

> **We could have built rooms with no doors.**

A page can exist.
A component can exist.
A button can exist.
A database function can exist.
A route can exist.

And yet the actual product can still be disconnected.

Akọ must not become a collection of isolated rooms.

Every meaningful page, component, feature, action, state, and workflow must have:

- a valid way to enter,
- a valid reason to exist,
- a valid way to proceed,
- a valid way to go back,
- a valid way to finish,
- and a valid way to recover when something goes wrong.

The application should behave as **one connected system**.

This is an **audit-and-upgrade specification**, not a blind rebuild checklist.

Claude must first read and understand the actual Akọ repository, then audit the application from the perspective of:

- a real user,
- a product architect,
- a systems thinker,
- a senior frontend engineer,
- a senior backend engineer,
- a QA engineer,
- and a user navigating the application with no knowledge of the codebase.

---

# 2. Core Principle — No Rooms Without Doors

Use this principle throughout the audit:

> **Every room needs a door.**

A "room" can be:

- a page,
- route,
- modal,
- drawer,
- component,
- feature,
- Project,
- conversation,
- admin screen,
- settings screen,
- onboarding step,
- checkout screen,
- wallet screen,
- notification destination,
- deep link,
- success state,
- error state,
- empty state,
- loading state.

A "door" can be:

- navigation from another page,
- CTA,
- button,
- link,
- tab,
- notification,
- search result,
- feed item,
- Project card,
- profile action,
- deep link,
- browser URL,
- back navigation,
- close action,
- cancel action,
- completion redirect,
- recovery path.

Claude must identify rooms that have:

- no entrance,
- no exit,
- no discoverability,
- no valid next step,
- or no recovery path.

---

# 3. Audit the Actual Repository First

Before implementing anything, Claude must inspect the repository.

Do not infer application structure from filenames alone.

Inspect:

### Frontend
- routes
- route configuration
- pages
- layouts
- nested routes
- navigation
- tabs
- menus
- buttons
- links
- modals
- drawers
- sheets
- dialogs
- forms
- CTA components
- cards
- reusable navigation components
- loading states
- empty states
- error states
- success states
- redirects
- auth guards
- permission guards
- deep-link handlers

### Backend
- Supabase schema
- RLS
- Edge Functions
- database functions
- API calls
- mutations
- server-side validation
- webhook handlers
- scheduled jobs
- notification/event infrastructure
- wallet/gifting
- Projects
- promotion
- messaging
- search/discovery
- onboarding

### Infrastructure
- Vite routing
- deployment configuration
- environment configuration
- Supabase URL/deep-link assumptions
- web/native boundary
- error handling
- analytics
- external service integrations

---

# 4. Build a Complete Route Inventory

Claude must discover every route in the actual codebase.

For every route record:

| Field | Required |
|---|---|
| Route | Yes |
| Page/component | Yes |
| Authentication requirement | Yes |
| Entry points | Yes |
| Exit paths | Yes |
| Parent layout | Yes |
| Child routes | Yes |
| Deep-link behavior | Yes |
| Loading state | Yes |
| Empty state | Yes |
| Error state | Yes |
| Success state | Yes |
| Back behavior | Yes |
| Permission behavior | Yes |
| Deleted-resource behavior | Yes |

Do not assume that routes found in a router file are all routes users can actually reach.

Also search for:

- `navigate`
- `router.push`
- `router.replace`
- `<Link>`
- `<a>`
- URL construction
- deep-link helpers
- redirects
- CTA handlers
- modal navigation
- tab navigation
- notification destinations

---

# 5. Route Graph

Think of the application as a graph.

```text
                ┌───────────┐
                │   HOME    │
                └─────┬─────┘
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
       PROFILE       FEED      DISCOVER
          │           │           │
          ↓           ↓           ↓
       PROJECT      POST       PEOPLE
          │           │           │
          ↓           ↓           ↓
       PURCHASE    COMMENTS    PROFILE
          │
          ↓
        ACCESS
          │
          ↓
       CONTENT
```

Claude must build the equivalent mental/model representation for the real application.

Look for nodes with:

- zero inbound edges,
- zero outbound edges,
- only developer-only access,
- accidental access,
- broken edges,
- edges requiring impossible state.

The final audit should identify these explicitly.

---

# 6. Entry-Point Audit

For every page/feature, ask:

> **How does a normal user get here?**

Possible legitimate entry points:

- Home
- Feed
- Discover
- Search
- Profile
- Project
- Chat
- Notification
- Wallet
- Settings
- Admin
- external shared URL
- deep link
- onboarding
- another feature

If a page has no reasonable user-facing entry point, classify it.

Possible outcomes:

- valid internal page
- valid deep-link-only page
- admin-only page
- system-only page
- incomplete/orphaned page
- obsolete page
- intentionally hidden page

Do not automatically delete it.

Audit first.

---

# 7. Exit-Point Audit

For every page, ask:

> **Where can the user go from here?**

At least one sensible path should normally exist.

Possible exits:

- back
- close
- Home
- Feed
- Profile
- Project
- Discover
- Chat
- Wallet
- relevant next step
- completion redirect

A page that ends with:

> "Success"

and gives the user nowhere useful to go is a dead end.

Likewise:

> "No results"

should normally offer a meaningful next action where appropriate.

---

# 8. Every Flow Must Have an End-to-End Journey

Do not test only individual screens.

Test complete journeys.

Example:

```text
Create account
 ↓
Welcome
 ↓
Choose interests
 ↓
Suggested people
 ↓
Follow
 ↓
Feed
 ↓
Discover
 ↓
Post
 ↓
Engagement
 ↓
Notification
 ↓
Conversation/Profile/Post
```

Every arrow must work.

---

# 9. Authentication Flow

Audit:

```text
Landing
 ↓
Sign up
 ↓
Verification
 ↓
Login/session
 ↓
Onboarding
 ↓
Main application
```

Also audit:

- login
- logout
- expired session
- invalid session
- password/auth recovery if supported
- email changes if supported
- account deletion
- returning user
- partially completed onboarding
- interrupted onboarding
- deep link while logged out
- deep link after login

Example:

User opens a Project URL while logged out.

Expected behavior must be deliberate:

```text
Project URL
 ↓
Auth gate
 ↓
Login/signup
 ↓
Return to original Project
```

Do not dump the user at Home and lose the destination.

---

# 10. Onboarding Connectivity

Audit the complete onboarding system.

Expected conceptual flow:

```text
Create account
 ↓
Welcome
 ↓
Interests
 ↓
Relevant people
 ↓
Follow
 ↓
Build Akọ
 ↓
Initial feed
 ↓
Main app
```

Verify:

- every step has entry
- every step has continuation
- back behavior is safe
- refresh is safe
- interrupted onboarding resumes
- invalid state recovers
- skipped optional steps do not strand the user
- onboarding completion actually reaches the main application

---

# 11. Feed Connectivity

Feed is not an endpoint.

Every meaningful feed object should lead somewhere.

Audit:

### Post
Post → post detail

### Creator
Post → creator profile

### Comment
Post → comment context

### Project
Post → Project

### Product
Post → product context where supported

### Gift
Post → gifting flow where appropriate

### Prioritize
Post → relevant post/content destination

### Shared/reposted content
→ original/source content

No feed card should contain an interaction that appears actionable but leads nowhere.

---

# 12. Post Flow

Audit:

```text
Create post
 ↓
Publish
 ↓
Feed
 ↓
Post detail
 ↓
Engagement
 ↓
Notifications
 ↓
Discussion
```

Also:

```text
Draft
 ↓
Edit
 ↓
Publish
```

and:

```text
Post
 ↓
Share
 ↓
External recipient
 ↓
Akọ
 ↓
Post
```

and:

```text
Post
 ↓
Repost
 ↓
Profile/feed
 ↓
Original post
```

---

# 13. Comment Flow

Audit:

```text
Post
 ↓
Comment
 ↓
Reply
 ↓
Engagement
 ↓
Notification
 ↓
Original comment
```

Verify that:

- comment links resolve
- reply links resolve
- notification opens the correct comment
- deleted comments degrade gracefully
- comment media opens correctly
- bookmark comment opens correct location
- comment actions have visible feedback
- moderation state does not strand users

---

# 14. Messaging Flow

Audit the complete messaging graph.

```text
Profile
 ↓
Message
 ↓
Conversation
 ↓
Message
 ↓
Reply/interaction
 ↓
Notification
 ↓
Conversation
```

Also:

```text
Notification
 ↓
Conversation
```

and:

```text
Shared content
 ↓
Send to chat
 ↓
Conversation
 ↓
Shared content
```

For group conversations:

```text
Create/join group
 ↓
Group
 ↓
Members
 ↓
Messages
 ↓
Shared content
 ↓
Projects/etc.
```

Every shared object must have a way back to its source.

---

# 15. Profile Connectivity

A profile should not be a dead end.

Audit:

```text
Profile
 ├── Posts
 ├── Projects
 ├── Follow
 ├── Message
 ├── Shared content
 └── Other relevant activity
```

Verify that profile actions lead to real flows.

A profile should also be reachable from:

- feed
- comments
- notifications
- chat
- search
- Discover
- Project ownership
- follower lists
- recommendations

---

# 16. Discover Connectivity

Audit Discover as a navigation hub.

Possible paths:

```text
Discover
 ↓
Person
 ↓
Profile
```

```text
Discover
 ↓
Post
 ↓
Discussion
```

```text
Discover
 ↓
Project
 ↓
Project detail
```

```text
Discover
 ↓
Topic
 ↓
Relevant content
```

Every card should have an explicit destination.

---

# 17. Search Connectivity

Search is a major potential orphan generator.

Audit every result type.

Potential result types:

- users
- posts
- Projects
- topics
- groups
- other supported entities

Every search result must lead to the correct entity.

Test:

- no results
- malformed search
- deleted result
- private result
- blocked result
- unavailable Project
- pagination
- result refresh
- deep link

---

# 18. Project Lifecycle

Projects are especially important because they cross many systems.

Audit the complete path:

```text
Create Project
 ↓
Configure
 ↓
Save
 ↓
Publish
 ↓
Discoverable
 ↓
Project detail
 ↓
Purchase/access
 ↓
Project home
 ↓
Content
 ↓
Completion
```

For paid Projects:

```text
Project
 ↓
Checkout
 ↓
Payment
 ↓
Access
 ↓
Content
```

For free Projects:

```text
Project
 ↓
Join/access
 ↓
Content
```

Every Project type must be audited separately.

---

# 19. Project Types

Audit all actual Project types in the repository.

Potential types include:

- Event
- Meeting
- Room
- Course
- Audio
- Video
- File
- other existing types

For each type:

- creation
- editing
- publishing
- discovery
- access
- content
- participation
- completion
- exit

No Project type should terminate unexpectedly after purchase/access.

---

# 20. Project Access

Audit:

```text
Project URL
 ↓
Project detail
 ↓
Access state
 ├── Not purchased
 ├── Purchased
 ├── Free
 ├── Pending
 ├── Expired
 ├── Revoked
 └── Unavailable
```

Each state needs an intentional user journey.

Example:

If a user does not have access, the page should explain the next valid action.

Not:

> blank page

or:

> broken content component.

---

# 21. Course Flow

Audit:

```text
Course
 ↓
Modules
 ↓
Lessons
 ↓
Lesson completion
 ↓
Next lesson
 ↓
Next module
 ↓
Course completion
```

A lesson should not be a room without doors.

Provide:

- previous
- next
- course overview
- exit to Project
- completion state

where appropriate.

---

# 22. Meeting/Event Flow

Audit:

```text
Event/Meeting
 ↓
Details
 ↓
Purchase/Join
 ↓
Countdown
 ↓
Access
 ↓
Session
 ↓
Recording/follow-up
```

Test:

- upcoming
- active
- ended
- cancelled
- postponed
- no access
- expired ticket

Every state needs a sensible next action.

---

# 23. Room Flow

Audit:

```text
Room
 ↓
Overview
 ↓
Join
 ↓
Members
 ↓
Announcements
 ↓
Meetings
 ↓
Assignments/content
 ↓
Participation
```

A Room should always provide an understandable way to:

- enter,
- understand what it is,
- participate,
- navigate its contents,
- and leave/return.

---

# 24. Wallet Flow

Audit:

```text
Wallet
 ↓
Balance
 ↓
Transaction history
 ↓
Gift
 ↓
Earnings
 ↓
Withdrawal
 ↓
Payout
```

Every financial page needs a path back into the application.

Examples:

```text
Gift received notification
 ↓
Gift context
 ↓
Wallet
```

```text
Payout completed
 ↓
Wallet
 ↓
Transaction
```

---

# 25. Gifting Flow

Audit:

```text
Post/Profile/Comment
 ↓
Gift
 ↓
Select cultural gift
 ↓
Confirm
 ↓
Wallet transaction
 ↓
Recipient notification
 ↓
Recipient wallet
```

Check failure paths:

```text
Insufficient balance
 ↓
Wallet
```

not:

> dead-end error modal.

---

# 26. Withdrawal/Payout Flow

Audit:

```text
Wallet
 ↓
Withdraw
 ↓
Eligibility
 ↓
Amount
 ↓
Destination
 ↓
Confirmation
 ↓
Pending
 ↓
Payout
 ↓
History
```

Also:

```text
Failed payout
 ↓
Explain state
 ↓
Next valid action
```

No payout state should leave users stranded.

---

# 27. Promotion Flow

Audit:

```text
Post
 ↓
Promote
 ↓
Targeting
 ↓
Budget
 ↓
Review
 ↓
Submit
 ↓
In Review
 ↓
Admin decision
 ↓
Approved
 ↓
Delivery
 ↓
Completion
```

Also:

```text
Promotion
 ↓
Pause
 ↓
Resume
 ↓
Extend
 ↓
Terminate
```

Every state needs appropriate navigation.

---

# 28. Promotion Admin Flow

Audit:

```text
Admin
 ↓
Promotions
 ↓
Review
 ↓
Promotion detail
 ↓
Decision
 ↓
Give Back configuration
 ↓
Save
 ↓
Outcome
```

The admin must be able to return to:

- promotion list
- dashboard
- relevant user
- relevant post

without relying on browser hacks.

---

# 29. Affiliate Flow

Audit:

```text
Project
 ↓
Enable affiliate
 ↓
Affiliate fork
 ↓
Share link
 ↓
Buyer
 ↓
Purchase
 ↓
Attribution
 ↓
Commission
 ↓
Wallet
```

Affiliate users should be able to navigate back to:

- their fork
- original Project
- affiliate status
- earnings
- relevant transaction

---

# 30. Notification Connectivity

Notifications must be treated as navigation doors.

Audit every notification destination.

Examples:

```text
Comment notification
 ↓
Post
 ↓
Comment
```

```text
Gift notification
 ↓
Gift/wallet
```

```text
Message notification
 ↓
Conversation
```

```text
Project notification
 ↓
Project
```

```text
Payout notification
 ↓
Wallet/transaction
```

```text
Promotion notification
 ↓
Promotion
```

A notification pointing to a nonexistent or unauthorized destination is a broken door.

---

# 31. Share / Repost / Forward / Bookmark

Audit every content-distribution path.

```text
Post
 ├── Share
 ├── Repost
 ├── Forward
 └── Bookmark
```

Every resulting reference must remain connected.

If source content is deleted:

```text
Bookmark/repost/shared reference
 ↓
Content unavailable
 ↓
Safe exit
```

Never leave users staring at an empty component or broken route.

---

# 32. External URL Flow

Every public/shareable URL must be tested as if the user has never visited Akọ before.

Test:

```text
External URL
 ↓
Akọ
 ↓
Correct destination
```

If authentication is required:

```text
External URL
 ↓
Login/signup
 ↓
Return to original URL
 ↓
Destination
```

Test:

- logged out
- logged in
- wrong user
- expired resource
- deleted resource
- private resource
- unpublished resource
- invalid URL
- unknown slug

---

# 33. Browser Back Behavior

Do not assume internal navigation is correct merely because forward navigation works.

Test:

```text
A → B → C → Back → B → Back → A
```

Audit:

- modal history
- drawer history
- tabs
- nested routes
- query parameters
- filters
- search
- checkout
- Project content
- authentication redirects

Avoid history traps.

---

# 34. Modal / Drawer / Sheet Connectivity

A modal is also a room.

Every modal should have:

- open trigger
- close
- cancel where appropriate
- successful completion path
- failure recovery
- keyboard/accessibility exit
- mobile exit

A modal that can only be escaped by refreshing the browser is broken.

---

# 35. Button Audit

Claude must inspect buttons throughout the application.

Classify:

### Working
Action works.

### Partially working
Action exists but flow is incomplete.

### Visual-only
Button looks functional but does nothing.

### Intentionally disabled
Disabled state has a legitimate reason.

### Dead
No meaningful implementation.

### Incorrect
Action goes somewhere unexpected.

### Hidden dependency
Works only under undocumented state.

Every actionable UI element must have an intentional outcome.

---

# 36. Link Audit

Search for:

- hrefs
- internal links
- external links
- dynamic links
- constructed URLs
- route helpers
- slug links
- Project URLs
- notification URLs
- share URLs

Verify every destination.

Watch for:

- typos
- stale routes
- renamed routes
- missing parameters
- undefined IDs
- incorrect slugs
- wrong entity type
- unauthorized destination

---

# 37. Dynamic Route Audit

Dynamic routes are especially vulnerable.

Examples:

```text
/project/:id
/profile/:id
/post/:id
/chat/:id
/room/:id
/course/:id
```

For each:

- valid ID
- invalid ID
- deleted ID
- unauthorized ID
- nonexistent ID
- malformed ID

must resolve intentionally.

---

# 38. Empty-State Connectivity

An empty state is not a dead end.

Examples:

### No Projects
Offer relevant next action.

### No messages
Offer discovery/new conversation path where appropriate.

### No notifications
Explain that there is nothing yet, without fake activity.

### No followers
Provide meaningful next step where appropriate.

### Empty wallet
Explain how earnings/gifts can occur where appropriate.

### No saved posts
Provide route back to discovery/feed.

Claude must audit every empty state.

---

# 39. Error-State Connectivity

An error screen should not trap the user.

Provide appropriate:

- retry
- back
- return home
- return to previous valid entity
- support/report path where necessary

Do not make every error:

> Something went wrong.

with no exit.

---

# 40. Loading-State Connectivity

Loading states must eventually resolve into:

- content
- empty state
- error state

Audit for:

- infinite spinners
- missing error fallback
- failed queries with blank screens
- race conditions
- stale loading flags
- unmounted requests

A perpetual loading screen is another room with no door.

---

# 41. Success-State Connectivity

Audit every success state.

Examples:

```text
Post published
 ↓
View post
```

```text
Project created
 ↓
View Project
```

```text
Gift sent
 ↓
View wallet / return to source
```

```text
Withdrawal requested
 ↓
View withdrawal
```

```text
Promotion submitted
 ↓
View promotion
```

```text
Profile updated
 ↓
View profile
```

Success should lead somewhere useful.

---

# 42. Cancellation Paths

Every multi-step flow should have an intentional cancellation path.

Audit:

- post creation
- Project creation
- checkout
- gifting
- withdrawal
- promotion
- account settings
- admin actions
- forms
- uploads

Cancellation must not create corrupted partial states.

---

# 43. Unsaved Changes

Audit forms with unsaved state.

If a user navigates away:

- warn where appropriate,
- preserve draft where appropriate,
- or intentionally discard.

Do not silently lose meaningful work.

---

# 44. Deep-Link Integrity

Deep links must be first-class citizens.

Every deep-link destination must survive:

- fresh browser load
- direct URL entry
- logged-out state
- logged-in state
- refresh
- app restart
- native conversion

Do not rely on navigating from Home first.

---

# 45. Authorization-Aware Navigation

A link existing does not mean the user should be allowed through it.

Every destination must re-check authorization.

Example:

```text
Notification
 ↓
Private Project
```

The destination must verify access.

Never use navigation as an authorization mechanism.

---

# 46. Deleted / Unpublished / Restricted Content

Every content-linked flow must handle source disappearance.

Examples:

- deleted post
- deleted comment
- deleted Project
- unpublished Project
- suspended creator
- deleted account
- removed message
- terminated promotion

The user should see a meaningful state and a valid exit.

---

# 47. Admin Connectivity

Audit the entire Admin application as a separate connected product.

Admin should have navigation between:

- dashboard
- users
- content
- Projects
- promotions
- wallet/payout operations
- notifications
- moderation
- settings
- analytics
- relevant system controls

Do not create isolated admin pages that can only be reached by manually typing a URL.

---

# 48. Admin Action Completion

Every admin operation needs:

```text
Open object
 ↓
Action
 ↓
Confirmation
 ↓
Processing
 ↓
Success/failure
 ↓
Updated object/list
```

Examples:

- approve promotion
- reject promotion
- change Give Back
- moderate content
- suspend user
- configure notification
- process payout
- change system setting

---

# 49. Cross-System Navigation

Akọ's strongest features cross system boundaries.

Audit connections such as:

### Feed → Project

### Post → Gift → Wallet

### Post → Promotion

### Post → Notification

### Notification → Chat

### Chat → Profile

### Profile → Project

### Project → Wallet

### Project → Affiliate

### Wallet → Withdrawal

### Withdrawal → Notification

### Admin → Promotion

### Admin → User

### Admin → Wallet

Every cross-system handoff must work.

---

# 50. Event-to-UI Connectivity

For every backend event, ask:

> **Where does the user experience the result?**

Example:

```text
Gift transaction
 ↓
Ledger
 ↓
Wallet
 ↓
Notification
 ↓
Recipient
```

If backend functionality exists but there is no reachable user-facing state, classify it as an integration gap.

---

# 51. Component Connectivity

Do not only audit routes.

Reusable components can also be orphaned.

Find components that:

- are imported nowhere;
- are imported but never rendered;
- render actions with no handler;
- expect props that no caller provides;
- reference stale routes;
- contain dead branches;
- depend on unavailable context;
- are visually present but functionally disconnected.

Do not delete unused components automatically.

Determine whether they are:

- intentionally dormant,
- legacy,
- future infrastructure,
- or orphaned.

---

# 52. Feature Flag Connectivity

Audit feature flags.

For every flag:

- what does it control?
- who can see it?
- what happens when OFF?
- what happens when ON?
- does the disabled state leave a dead route?
- does enabling it expose incomplete pages?
- is backend enforcement aligned with frontend?

A feature flag must not create a broken door when toggled.

---

# 53. Conditional UI

Audit conditional rendering.

Examples:

```text
if user.canX
if project.isPublished
if hasAccess
if isAdmin
if isOwner
if featureEnabled
```

For every condition, inspect both branches.

A common failure:

```text
true → complete flow
false → blank space
```

Both states must be intentional.

---

# 54. Mobile / Native Connectivity

The web application is expected to inform future native conversion.

Audit navigation so native conversion does not inherit broken assumptions.

Avoid:

- browser-only dead ends
- URL-only actions with no mobile equivalent
- inaccessible modals
- navigation hidden in desktop-only UI
- hover-only discovery
- browser refresh dependencies

The underlying application flow must remain coherent.

---

# 55. Responsive Connectivity

A feature can be technically connected but practically unreachable on mobile.

Test:

- navigation
- menus
- modals
- drawers
- action buttons
- back behavior
- long titles
- nested pages
- Project content
- chat
- notification center
- wallet
- admin where relevant

No mobile viewport should create a room without a door.

---

# 56. Accessibility Connectivity

Navigation should work without relying only on:

- color
- hover
- tiny icons
- animation
- gesture-only behavior

Interactive elements must have understandable accessible labels.

Keyboard navigation should not trap users.

Focus should move intentionally through dialogs and navigation transitions.

---

# 57. External Integrations

Audit all external integration boundaries.

Examples:

- payment gateway
- authentication provider
- storage
- email
- push
- media
- analytics
- any future provider

Every integration failure needs a recoverable application state.

Example:

```text
Payment provider unavailable
 ↓
Payment failed/pending state
 ↓
Retry or return
```

Not:

> spinner forever.

---

# 58. Data-to-Page Connectivity

A database record should not automatically imply a page.

Audit whether each user-facing entity has:

- list representation
- detail representation where needed
- creation/edit flow where appropriate
- deletion/unavailability state
- navigation entry
- navigation exit

Conversely, every important page should have a real underlying data model or intentional system purpose.

---

# 59. Navigation Consistency

Audit global navigation.

The user should be able to understand where they are.

Check:

- active state
- page title
- back button
- breadcrumbs where appropriate
- tabs
- bottom navigation
- sidebar
- top navigation
- mobile navigation

Avoid multiple competing navigation systems for the same destination.

---

# 60. No Accidental URL Dependency

A page should not be "connected" only because developers know a secret URL.

If normal users need it, there should be a discoverable route.

Exceptions:

- auth callbacks
- webhooks
- system routes
- admin-only technical pages
- intentional deep-link destinations

These should be explicitly classified.

---

# 61. Navigation Naming Audit

Audit route naming and destination semantics.

Avoid confusing situations where:

- `/project` means different things in different contexts;
- a "Room" links to a generic Project page;
- a notification says "View" but opens a dashboard;
- "Back" returns somewhere unrelated.

Navigation labels should match destination meaning.

---

# 62. No Dead-End CTAs

Search for CTA language:

- Continue
- Next
- Start
- Join
- Buy
- Publish
- Send
- Share
- Promote
- Withdraw
- Save
- View
- Learn
- Explore
- Open
- Message
- Follow

Every CTA must have an actual next state.

---

# 63. No Fake Interactivity

Audit elements that look clickable:

- cards
- images
- avatars
- usernames
- icons
- reaction buttons
- tabs
- progress indicators
- breadcrumbs

If something visually communicates:

> "you can interact with this"

either make it work or make its non-interactive nature clear.

---

# 64. End-to-End Test Matrix

Claude should create a matrix covering major journeys.

Example:

| Flow | Entry | Steps | End State | Exit | Failure Path |
|---|---|---|---|---|---|
| Signup | Landing | Signup → onboarding | Feed | Navigation | Retry |
| Post | Feed | Create → publish | Post | Feed/Profile | Draft/error |
| Comment | Post | Comment → reply | Discussion | Post | Retry |
| Message | Profile | Message → send | Conversation | Chat | Retry |
| Gift | Post | Gift → confirm | Wallet | Source/Wallet | Insufficient funds |
| Project | Discover | View → access | Project | Feed/Profile | Access error |
| Purchase | Project | Checkout → pay | Access | Project | Payment failure |
| Withdrawal | Wallet | Request → confirm | Pending | Wallet | Validation |
| Promotion | Post | Promote → review | In Review | Promotion | Validation |
| Admin | Admin | Review → action | Updated | List/object | Failure |

Expand this using actual Akọ flows.

---

# 65. Automated Route Testing

Where practical, implement automated checks for:

- every registered route renders;
- required params are present;
- unauthorized routes redirect;
- invalid routes resolve safely;
- major links point to valid destinations;
- important CTA handlers exist;
- critical journeys complete.

Do not rely solely on static tests.

---

# 66. Browser-Level / E2E Testing

For major user journeys, use real browser-level testing where available.

Test the application as a user.

Examples:

```text
signup → onboarding → feed
```

```text
feed → post → comment → notification
```

```text
profile → message → conversation
```

```text
Project → purchase → access → content
```

```text
wallet → gift → notification → wallet
```

```text
post → promote → review → approval
```

Use the actual deployed/local application behavior, not only isolated component tests.

---

# 67. Broken Link Detection

Search systematically for:

- invalid routes
- stale hrefs
- undefined route params
- missing IDs
- malformed slugs
- route mismatches
- links to removed pages
- links to pages hidden behind unavailable feature flags

Where possible, automate detection.

---

# 68. Orphan Detection

Create an orphan audit.

Find:

### Pages with no inbound links

### Components with no consumers

### Routes with no normal entry point

### Features with no reachable UI

### Database capabilities with no user flow

### Notifications with no valid destination

### CTAs with no meaningful action

### Success states with no next step

### Error states with no recovery

### Admin screens with no navigation

Each should be classified rather than blindly removed.

---

# 69. Broken-Flow Severity

Classify findings.

### P0 — Critical
Blocks core application usage.

Examples:
- cannot complete signup
- cannot access purchased Project
- cannot withdraw
- critical route inaccessible
- broken authentication redirect

### P1 — Major
Breaks important feature flow.

Examples:
- notification opens nowhere
- Project creation cannot reach published Project
- message cannot open conversation

### P2 — Moderate
Meaningful UX dead end.

### P3 — Minor
Polish/navigation inconsistency.

---

# 70. Flow Recovery

For every failure, ask:

> Where should the user go now?

A robust system should rarely leave users without a next move.

Examples:

```text
Payment failed
 → Retry
 → Return to Project
```

```text
Content deleted
 → Return to feed
 → Open creator
```

```text
Search failed
 → Retry
 → Return to Discover
```

```text
Unauthorized
 → Request access / go back
```

---

# 71. Transactional Flow Integrity

A flow is not complete merely because the frontend changed pages.

Verify backend state.

Example:

```text
Click Buy
 ↓
Payment
 ↓
Purchase record
 ↓
Access entitlement
 ↓
Project opens
```

If the UI says "Purchased" but access was never granted, the flow is broken.

Same principle applies to:

- gifts
- wallet
- promotions
- affiliate commissions
- follows
- messages
- Projects
- onboarding
- account changes

---

# 72. Async Flow Integrity

Audit actions that complete asynchronously.

Examples:

- uploads
- payment
- promotion review
- payout
- media processing
- scheduled events
- push delivery
- course publishing

Users need a visible state while waiting.

Example:

```text
Submitted
 ↓
Processing
 ↓
Completed
```

or:

```text
Processing
 ↓
Failed
 ↓
Retry / recover
```

Never silently strand the user in an ambiguous state.

---

# 73. Refresh Safety

Test refreshing every major state.

Examples:

- checkout
- Project content
- course lesson
- promotion review
- wallet
- withdrawal
- chat
- notification center
- onboarding

Refresh must not corrupt or lose the user's state.

---

# 74. Duplicate Action Safety

Test double-clicks and repeated submissions.

Examples:

- publish twice
- buy twice
- send gift twice
- withdraw twice
- promote twice
- follow twice
- send message twice

Backend idempotency and frontend state should work together.

---

# 75. Permission Transition Testing

Test what happens when permissions change while a user is inside a page.

Examples:

- Project access revoked
- account suspended
- content deleted
- admin permission removed
- user blocked
- Project unpublished

The current page should transition safely.

---

# 76. Notification + Connectivity Audit

Use the notification system as a test of application connectivity.

For every notification:

```text
Event
 ↓
Notification
 ↓
Tap
 ↓
Destination
 ↓
Relevant object
 ↓
Valid next action
```

If any arrow breaks, fix the underlying connectivity rather than merely changing the notification.

---

# 77. Share URL + Connectivity Audit

For every shareable entity:

```text
Copy URL
 ↓
External browser
 ↓
Akọ destination
 ↓
Correct content
 ↓
Correct access state
 ↓
Useful next action
```

This is especially important for:

- Projects
- posts
- profiles
- affiliate links
- other public entities

---

# 78. Data Deletion + Connectivity Audit

When an object disappears, all references must degrade gracefully.

Audit:

- notifications
- bookmarks
- reposts
- shares
- chats
- comments
- feeds
- search
- Projects
- admin pages
- external URLs

No dangling reference should crash the application.

---

# 79. Architecture Principle

Do not solve connectivity by adding random links everywhere.

The goal is **meaningful graph connectivity**, not maximum navigation.

A user should always have a sensible next step, not 17 unrelated buttons.

---

# 80. UX Principle

Navigation should answer three questions:

> Where am I?

> How did I get here?

> Where can I go next?

If the interface cannot answer those questions, investigate the flow.

---

# 81. Systems Thinking Requirement

Claude must think across boundaries.

Do not fix:

```text
Notification page
```

without checking:

```text
Notification event
 → notification row
 → realtime
 → push
 → notification UI
 → destination
 → destination authorization
 → source entity
 → deleted-state behavior
```

Do not fix:

```text
Project page
```

without checking:

```text
Project creation
 → publication
 → discovery
 → URL
 → purchase
 → entitlement
 → access
 → content
 → notification
 → completion
```

The objective is not local correctness.

The objective is **system correctness**.

---

# 82. Product Completeness Test

For every feature, ask:

```text
Can the user discover it?
Can the user enter it?
Can the user understand it?
Can the user perform the action?
Does the backend complete it?
Does the UI reflect the result?
Can the user continue?
Can the user return?
Can the user recover from failure?
Can another user reach the result?
Can a notification/deep link reach it?
Can the user leave?
```

If any answer is "no", investigate.

---

# 83. Avoid False Completeness

A feature is not complete because:

- its page exists;
- its component renders;
- its database table exists;
- its button exists;
- its Edge Function exists;
- its route exists.

It is complete when the **user journey works end to end**.

---

# 84. Codebase Cleanup

After connectivity fixes, identify:

- dead routes
- obsolete navigation
- unused components
- duplicate route helpers
- duplicate navigation logic
- stale imports
- abandoned feature code
- old URLs
- inconsistent destination builders

Only remove code after verifying it is genuinely obsolete.

Do not delete dormant infrastructure that the current architecture intentionally preserves.

---

# 85. Navigation Abstraction

Where appropriate, use centralized route/destination helpers.

Avoid scattering strings such as:

```text
/project/...
/projects/...
/Project/...
```

through unrelated components.

A single route contract reduces broken links.

Claude should inspect the current architecture and improve it only where justified.

---

# 86. Destination Contracts

Important entities should have consistent destination builders.

Conceptually:

```text
post → getPostUrl(postId)
profile → getProfileUrl(userId)
project → getProjectUrl(projectId/slug)
conversation → getConversationUrl(id)
notification → resolveNotificationDestination()
```

Do not blindly introduce these helpers if equivalent infrastructure already exists.

---

# 87. Frontend / Backend Contract Audit

Navigation often breaks because frontend and backend disagree.

Audit:

- entity IDs
- slug formats
- status values
- access states
- route params
- API response fields
- nullable fields
- deleted states
- permission states

The frontend must not assume backend states that no longer exist.

---

# 88. State Machine Audit

For major flows, model actual states.

Example:

```text
Promotion:
draft
→ submitted
→ in_review
→ approved
→ active
→ paused
→ completed
→ terminated
```

Then ask:

> Does every state have a valid page, action, transition, notification, and exit?

Apply this to:

- Projects
- payments
- withdrawals
- payouts
- promotions
- onboarding
- messages
- uploads
- moderation

---

# 89. Impossible States

Find UI states that can occur in code but have no meaningful UX.

Examples:

- Project `published` but no URL
- payment `successful` but no access
- promotion `approved` but no delivery state
- withdrawal `failed` but no retry/history
- notification references missing entity
- onboarding complete but user remains in onboarding

Either prevent impossible states or provide safe handling.

---

# 90. User Journey Inventory

Claude should produce an inventory of actual user journeys found in the repository.

At minimum:

- new user
- returning user
- creator
- Project owner
- Project participant
- buyer
- affiliate
- person receiving gift
- person sending gift
- person earning Give Back
- person withdrawing
- promoter
- person receiving promotion
- messenger/group participant
- admin

Do not assume these are all roles; inspect the actual codebase.

---

# 91. Role-Based Connectivity

For every meaningful role:

> Can this person complete the things the product promises them?

Example:

Creator:

```text
Create
 → Publish
 → Share
 → Discover
 → Engage
 → Monetize
 → Receive earnings
 → Withdraw
```

Participant:

```text
Discover
 → Join
 → Access
 → Participate
 → Complete
```

Admin:

```text
Observe
 → Review
 → Act
 → Verify
 → Return
```

---

# 92. First-Time vs Returning User

A flow may work for developers because they already know where everything is.

Test:

### First-time user
Can discover the feature naturally?

### Returning user
Can get back to it?

### External user
Can arrive from a URL?

### Notification-driven user
Can arrive from a notification?

### Search-driven user
Can arrive from search?

All should have valid paths.

---

# 93. No Hidden Knowledge Requirement

Users should not need to know:

- secret URLs
- exact navigation sequences
- which profile contains a feature
- browser refresh tricks
- special buttons hidden in unrelated pages

If a feature matters, it needs a discoverable door.

---

# 94. Information Architecture Audit

Claude should inspect whether the current navigation structure actually reflects Akọ's product model.

Do not create arbitrary top-level navigation for every feature.

Instead identify natural hubs:

- Feed
- Discover
- Projects
- Messages
- Notifications
- Wallet
- Profile
- Admin

Use the actual repository/product structure rather than assuming these exact tabs exist.

---

# 95. Cross-Link Opportunities

During the audit, identify high-value contextual connections.

Examples:

Post:

```text
Creator
Project
Topic
Discussion
Gift
Share
```

Project:

```text
Owner
Participants
Related content
Chat
Wallet/purchase
Affiliate
```

Profile:

```text
Posts
Projects
Followers
Following
Message
```

Wallet:

```text
Gift
Earnings
Withdrawal
Transaction
```

Do not add every possible link. Add links that make the user's next logical action obvious.

---

# 96. Accessibility + Navigation

Every route and interactive component should remain navigable for users who:

- use keyboard
- use screen readers
- use mobile devices
- use reduced motion
- cannot distinguish color-only cues

---

# 97. Analytics for Broken Journeys

Where analytics already exist, use them to identify:

- high drop-off routes
- repeated back navigation
- dead-end pages
- failed actions
- abandoned flows
- repeated retries
- notification clicks that fail
- external links that return to unexpected places

Do not introduce analytics solely for vanity metrics.

Use them to identify connectivity problems.

---

# 98. QA Exploration Strategy

Claude should explore the app non-linearly.

Do not simply follow the intended happy path.

Try:

```text
Feed → Profile → Back → Post → Share → Back
```

```text
Notification → Deleted content
```

```text
Project → Purchase → Refresh
```

```text
Login → Deep link → Logout → Back
```

```text
Form → Error → Retry → Cancel
```

```text
Modal → Navigate → Back → Close
```

The objective is to expose paths the original implementation may not have anticipated.

---

# 99. Final Connectivity Graph

At the end of the audit, Claude should be able to describe Akọ as a connected graph.

Identify:

### Hubs
Pages users naturally return to.

### Bridges
Features that connect systems.

### Leaves
Pages that intentionally terminate a flow.

### Orphans
Pages/features with no valid entry or relationship.

### Broken edges
Links/actions that fail.

### Dead ends
States without meaningful continuation.

### Traps
Navigation states that make it difficult/impossible to leave.

---

# 100. Required Final Audit Report

Claude must provide a final report containing:

## A. Connected and Correct
What already works.

## B. Stronger Than This Specification
Where the existing implementation is better.

## C. Partially Connected
Flows that work but have gaps.

## D. Orphaned
Pages/components/routes/features with no legitimate entry or relationship.

## E. Broken Links
Invalid or stale destinations.

## F. Dead Ends
Pages/states with no meaningful next step.

## G. Broken End-to-End Flows
Complete journeys that cannot finish.

## H. Security Risks
Authorization/deep-link/navigation vulnerabilities.

## I. Backend Integration Gaps
Frontend appears complete but backend state is incomplete.

## J. Frontend Integration Gaps
Backend exists but users cannot reach/use it.

## K. Performance Risks
Connectivity fixes that could create excessive queries/fan-out.

## L. UX Risks
Confusing or unintuitive navigation.

## M. Product Opportunities
High-value connections that would make Akọ feel more coherent.

---

# 101. Required Fix Classification

Every discovered issue should be classified as:

- **KEEP** — already correct.
- **UPGRADE** — works but should be improved.
- **CONNECT** — exists but is unreachable/disconnected.
- **FIX** — broken.
- **REMOVE** — genuinely obsolete.
- **DEFER** — intentionally incomplete/future functionality.
- **INVESTIGATE** — ambiguous and requires product/architecture judgment.

Do not blindly delete anything.

---

# 102. Definition of Done

This work is complete only when:

- every production route has been audited;
- every important page has a legitimate entry point;
- every important page has a sensible exit;
- every major CTA has a real action;
- every important flow works end to end;
- authentication redirects correctly;
- deep links preserve intended destinations;
- feed content leads to valid destinations;
- profiles connect to relevant content/actions;
- Discover results connect correctly;
- search results connect correctly;
- posts connect to comments, creators, Projects, sharing, etc. where applicable;
- comments connect to their parent content;
- messaging connects to profiles/content/notifications;
- notifications connect to valid destinations;
- Projects connect from creation through access/content;
- payments connect to entitlements;
- wallet connects to gifts, earnings, withdrawals and transactions;
- promotion connects from submission through review and delivery;
- affiliate flows connect through attribution and commission;
- admin pages are navigable;
- success states have meaningful next steps;
- error states have recovery paths;
- empty states have sensible exits where appropriate;
- loading states resolve or recover;
- deleted content does not create broken screens;
- blocked/private content cannot be bypassed through links;
- browser back behavior is sane;
- modal/drawer navigation does not trap users;
- refresh does not break major flows;
- duplicate submissions are safe;
- async operations expose meaningful states;
- feature flags do not expose broken rooms;
- unused/orphaned routes/components have been classified;
- no critical route exists only as a secret URL;
- no major feature depends on developer knowledge to discover;
- cross-system flows have been tested;
- frontend/backend state transitions agree;
- native conversion is not unnecessarily constrained;
- automated tests cover important connectivity;
- major end-to-end journeys have been tested;
- malicious navigation/deep-link cases have been tested;
- final route/flow graph has been reviewed;
- final audit report has been produced.

---

# 103. Final Instruction to Claude

**Read the entire repository before deciding what is missing.**

Do not assume a page is orphaned because you did not immediately find a link.

Do not assume a route is valid because it compiles.

Do not assume a feature is complete because its UI renders.

Do not assume a backend function is integrated because it exists.

Do not assume a button works because it has an `onClick`.

Trace the actual system.

Think like this:

```text
Can the user discover it?
        ↓
Can the user enter it?
        ↓
Can the user understand it?
        ↓
Can the user perform the action?
        ↓
Did the backend actually complete it?
        ↓
Did the frontend reflect the result?
        ↓
Can the user continue?
        ↓
Can the user return?
        ↓
Can another user reach the result?
        ↓
Can a notification/deep link reach it?
        ↓
What happens if the source disappears?
        ↓
What happens if the operation fails?
        ↓
Can the user recover?
        ↓
Can the user leave?
```

Think beyond screens.

Think in **systems, states, transitions, entities, events, users, permissions, and navigation graphs**.

Akọ should feel like one application.

Not:

> "Here is a page."

But:

> "Here is a connected place in the product, and there is always a meaningful door."

**No orphaned rooms.  
No broken roads.  
No dead-end journeys.  
No disconnected features.**

Build Akọ so that every meaningful thing in it belongs to a coherent path from discovery → action → result → continuation.
