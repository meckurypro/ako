# AKỌ — FINAL PRE-LAUNCH SYNTHETIC USER ARMY & END-TO-END SYSTEM ASSURANCE AUDIT

## Final MVP Launch Gate

**Status:** Final pre-launch specification  
**Audience:** Claude acting as senior QA engineer, adversarial product tester, full-stack engineer, security reviewer, database auditor, UX auditor, and release engineer  
**Purpose:** Perform the final merciless end-to-end validation of the Akọ MVP by operating the real application through its UI and backend, using a controlled synthetic population of at least 100 test users, exercising realistic multi-user journeys, finding failures, tracing them to root causes, and producing a repo-ready Markdown implementation/remediation report.

---

# 1. THIS IS THE FINAL GATE

This document is the final major task before MVP launch.

Do not treat it as:

- a code review
- a static lint pass
- a unit-test request
- a checklist to mark complete without execution
- a screenshot review
- a theoretical security assessment

The requirement is:

> **ACTUALLY USE THE SYSTEM.**

Claude must crawl the UI, operate the application, exercise the backend/database through legitimate application paths, create controlled synthetic users, simulate real multi-user behavior, deliberately stress important workflows, identify failures, trace them to root causes, and document exact remediation.

The objective is to answer:

> **“If 100+ different people started using Akọ tomorrow, what breaks?”**

And then:

> **“What must be fixed before we launch?”**

---

# 2. PRIMARY DIRECTIVE

Claude must behave as if it is:

- a real user
- a group of real users
- a malicious-but-authorized client
- a careless user
- a power user
- a new user
- a returning user
- a creator
- a buyer
- a participant
- a person who forgets passwords
- a person who abandons flows halfway through
- a person who double-clicks everything
- a person who refreshes at the worst possible moment
- a user on a slow network
- a user on mobile
- a user who follows deep links
- a user who receives gifts
- a user who sends gifts
- a user who funds a wallet
- a user who requests withdrawal
- a creator who posts
- a commenter
- a Project creator
- a Project purchaser
- an affiliate
- an Admin
- an attacker attempting to manipulate client-visible state

But remain inside the authorized test environment.

---

# 3. MINIMUM SYNTHETIC POPULATION

Create and use **at least 100 synthetic test users**.

Do not interpret “100 users” as:

> “Create 100 accounts and stop.”

The users must actually participate in workflows.

The synthetic population should have varied states and behavior.

At minimum, model users across categories such as:

```text
new_user
returning_user
creator
high_activity_user
low_activity_user
buyer
course_student
book_reader
room_member
event_attendee
commenter
gifter
gift_recipient
wallet_user
withdrawal_user
affiliate
inactive_user
blocked_user
reported_user
admin/test-admin
```

One synthetic user may have multiple roles.

Do not create unnecessary real-world personal data.

Use clearly synthetic identities.

---

# 4. TEST USER IDENTITY STRATEGY

Use deterministic, traceable identities.

For example:

```text
ako-e2e-001
ako-e2e-002
...
ako-e2e-100
```

Use test email domains/accounts appropriate to the configured test environment.

Never use:

- real people's email addresses
- real people's phone numbers
- real financial accounts
- real payment cards outside an authorized sandbox
- production personal data

Maintain a test-user registry containing:

- synthetic user ID
- auth identifier
- role/state
- relevant created resources
- test scenarios participated in
- cleanup state

---

# 5. ENVIRONMENT SAFETY — NON-NEGOTIABLE

Before running destructive or financial tests, establish exactly which environment Claude is operating against.

Confirm:

- repository
- deployment
- Supabase project
- database
- authentication environment
- storage
- payment environment
- webhook environment
- Admin environment

If there is any possibility that the connected Supabase project is production or contains real users/data:

**STOP destructive testing.**

Do not:

- delete real users
- fund real wallets
- withdraw real money
- alter real financial records
- mass-create real users
- manipulate production data
- trigger real payment settlement

The test harness must be isolated or explicitly authorized.

---

# 6. NO REAL MONEY

Financial testing must use the provider's authorized sandbox/test facilities where available.

Never use real money merely to prove a flow works.

For financial workflows, test:

- successful funding
- failed funding
- duplicate callback
- delayed callback
- cancelled payment
- insufficient withdrawal
- valid withdrawal
- withdrawal failure
- payout state transitions
- reconciliation

using authorized test infrastructure.

---

# 7. DO NOT DISABLE SECURITY TO MAKE TESTING EASIER

Do not:

- disable RLS
- disable authentication
- expose service-role keys to the browser
- bypass authorization globally
- weaken policies
- remove validation
- turn off security middleware
- make production endpoints permissive

If a controlled test bypass is absolutely necessary:

- isolate it to the test environment
- make it explicit
- make it temporary
- make it auditable
- remove it before launch

---

# 8. THE TEST IS BLACK-BOX FIRST

Claude should first behave through the UI like a user.

Then inspect:

- frontend code
- backend code
- Supabase schema
- RLS policies
- Edge Functions
- database functions/RPCs
- triggers
- storage policies
- webhooks
- auth configuration
- logs
- relevant infrastructure

The goal is to connect:

```text
Observed behavior
       ↓
UI
       ↓
API / Edge Function
       ↓
Database / Supabase
       ↓
Side effects
```

Do not stop at:

> “The button worked.”

Verify what actually happened.

---

# 9. UI CRAWL

Crawl the application systematically.

Inventory:

- routes
- pages
- tabs
- navigation
- menus
- buttons
- links
- modals
- drawers
- forms
- cards
- Project surfaces
- Feed surfaces
- profile surfaces
- messaging surfaces
- wallet surfaces
- Admin surfaces
- settings
- authentication
- onboarding
- error states
- empty states

For every discoverable action ask:

> What should happen when I press this?

Then actually press it.

---

# 10. CRAWL FOR DEAD ENDS

Find:

- buttons that do nothing
- links that go nowhere
- pages with no exit
- pages with broken Back behavior
- actions that appear successful but do not persist
- actions that persist but do not update UI
- stale data after mutation
- duplicate actions
- infinite loading
- blank screens
- missing error states
- broken deep links
- routes that require impossible state
- pages inaccessible from normal navigation
- orphaned content

Document every finding.

---

# 11. AUTHENTICATION — FULL TEST

Test:

### Signup
- valid signup
- duplicate email
- invalid email
- weak password
- password mismatch if applicable
- missing fields
- refresh during signup
- network failure
- retry
- session establishment
- profile creation
- onboarding state

### Login
- valid credentials
- wrong password
- unknown account
- empty fields
- expired session
- refresh
- multiple tabs
- logout
- re-login

### Password reset
- request reset
- invalid email
- valid email
- reset link
- expired link
- reused link
- new password
- old password invalidation where intended
- session behavior
- login after reset

### Account deletion
- confirmation
- cancellation
- deletion
- session termination
- inaccessible account afterward
- associated content behavior
- wallet implications
- Projects/access implications
- messages
- comments
- follows
- gifts
- financial records
- audit requirements

Do not assume deletion means physically deleting every financial record.

Verify the actual product/legal architecture.

---

# 12. SESSION / AUTHORIZATION TESTING

Test:

- session expiration
- refresh
- concurrent sessions
- logout in another tab/device
- revoked session
- unauthorized route access
- user A attempting to access user B's private data
- user A attempting to mutate user B's resources
- stale session after account changes

---

# 13. ONBOARDING

For multiple synthetic users:

- signup
- welcome
- interests
- suggested people
- follow
- build Akọ
- initial Feed
- main application

Test:

- skip where allowed
- incomplete onboarding
- refresh
- close app
- return later
- repeated onboarding
- invalid state
- duplicate follow
- self-follow
- empty recommendations
- no-interest edge cases

Verify server-side state.

---

# 14. FEED — MULTI-USER TESTING

Populate the Feed with synthetic activity.

Users should:

- post
- view posts
- follow creators
- engage
- disagree
- support
- push back
- comment
- save
- share
- repost
- forward where available
- receive replies
- receive notifications

Then inspect whether Feed behavior reflects intended architecture.

Test:

- topic relevance
- social signals
- performance
- creator diversity
- topic diversity
- new creator discovery
- new user cold start
- repeated content
- deleted content
- blocked users
- unavailable content
- Prioritize
- gift-triggered Prioritized post
- normal ranking
- non-dominance behavior

Do not merely inspect ranking code.

Generate actual activity and observe outcomes.

---

# 15. POST LIFECYCLE

Test:

```text
create
→ publish
→ appear in Feed
→ open
→ engage
→ comment
→ share
→ repost
→ bookmark
→ revisit
→ delete
→ revisit old link
```

Verify every state transition.

---

# 16. POST CREATION EDGE CASES

Test:

- empty post
- long text
- special characters
- emoji
- URLs
- image
- video
- audio
- malformed upload
- large upload
- interrupted upload
- retry
- double submit
- rapid publish
- refresh during publish
- back during publish
- failed publish
- duplicate publish

---

# 17. COMMENTS

Test:

- create comment
- reply
- like
- dislike
- delete
- edit if supported
- report
- bookmark comment
- comment on deleted post
- comment on unavailable post
- multiple users commenting simultaneously
- duplicate submit
- refresh
- notification

Verify comment deletion policy and Admin controls.

---

# 18. COMMENT REWARD TESTING

Where reward systems apply:

Test:

- comment receives Like
- comment receives Dislike
- comment receives Save
- comment receives Share
- comment receives Reply
- comment receives multiple interactions
- negative points
- deletion
- moderation
- account deletion
- duplicate engagement

Verify financial/accounting consequences.

---

# 19. LIKE / SUPPORT / DISAGREE / PUSH BACK

Each stance must be tested independently.

Test:

- add
- remove
- switch where allowed
- repeated click
- rapid click
- concurrent click
- refresh
- offline failure
- rollback
- notification
- Feed effect

Verify semantics.

Do not allow the UI to claim success when the database mutation failed.

---

# 20. SHARE / REPOST / FORWARD

Test:

### Share
- internal
- external
- deep link
- logged-out destination
- logged-in destination
- deleted source

### Repost
- create
- duplicate
- remove if supported
- source deletion
- attribution
- Feed behavior

### Forward
- one-to-one chat
- group
- unavailable recipient
- blocked recipient
- deleted source

### Bookmark
- post
- comment
- remove
- deleted source
- orphaned bookmark

---

# 21. ORPHANED CONTENT

Explicitly test:

1. User A bookmarks Post X.
2. User B shares Post X.
3. User C reposts Post X.
4. User D has a direct URL to Post X.
5. Post X is deleted.
6. All four users revisit it.

Expected behavior must match Akọ's defined deleted-content experience.

No broken UI.

No deleted content leak.

No endless loading.

---

# 22. FOLLOW SYSTEM

Test:

- follow
- unfollow
- duplicate follow
- self-follow
- blocked account
- deleted account
- private account if applicable
- follower count
- following count
- Feed effect
- recommendations
- notifications

---

# 23. PROFILE TESTING

Test:

- own profile
- other profile
- new profile
- incomplete profile
- deleted user
- blocked user
- followed user
- creator profile
- Project list
- posts
- social actions
- navigation into Feed

---

# 24. MESSAGING

Test:

- open conversation
- send
- receive
- reply
- group if supported
- media if supported
- deleted user
- blocked user
- notification
- unread count
- refresh
- duplicate send
- slow network
- realtime delivery

---

# 25. PROJECT CREATION ELIGIBILITY

Verify the previously defined rules.

Test:

- ineligible user
- eligible user
- boundary user
- newly eligible user
- account age
- posting activity
- distinct engagement
- followers if applicable
- account standing
- Project history
- Admin override
- revoked override
- client manipulation attempt

The server must decide eligibility.

---

# 26. PROJECT CREATION

For each supported Project type, test:

- creation
- draft
- save
- edit
- publish
- unpublish
- delete
- access settings
- free/paid where applicable
- content upload
- content replacement
- invalid content
- incomplete configuration
- buyer access

---

# 27. PROJECT PURCHASE

Test:

- free Project
- paid Project
- successful payment
- failed payment
- cancelled payment
- duplicate payment
- retry
- receipt/confirmation
- access provisioning
- purchase history
- Personal Project Library
- notifications
- creator earnings
- wallet effects
- refund behavior

---

# 28. PERSONAL PROJECT LIBRARY

Verify:

> **Things users have access to have a home.**

Test:

- newly purchased Book
- Course
- Room
- Meeting
- Event
- File
- Audio
- Video
- saved Project
- revoked access
- refunded purchase
- deleted Project
- creator unpublishes Project
- deep link
- search/filter
- Recent/Continue if implemented

---

# 29. COURSE

Test:

- enroll
- access
- modules
- lessons
- progress
- resume
- completion
- refresh
- multiple devices
- completion persistence
- course creator changes
- revoked access

---

# 30. ROOM

Test:

- join
- leave where supported
- access
- announcements
- meetings
- recordings
- assignments
- member participation
- permissions
- deleted/restricted Room
- revoked access

---

# 31. MEETING

Test:

- scheduled state
- countdown
- access
- wrong time
- completed meeting
- recording if applicable
- attendee permissions
- deep link

---

# 32. EVENT

Test:

- ticket purchase
- ticket access
- ticket delivery
- scheduled state
- event access
- completed event
- duplicate ticket
- refund
- cancellation
- attendee identity

---

# 33. WALLET

Treat financial functionality as high severity.

Test:

- wallet creation
- balance
- funding
- successful funding
- failed funding
- duplicate funding callback
- pending funding
- balance refresh
- transaction history
- gifts
- earnings
- withdrawal

Verify:

> **Client cannot create money.**

---

# 34. FUNDING

Test:

```text
Initiate funding
→ provider
→ callback/webhook
→ verification
→ ledger
→ wallet balance
→ transaction history
```

Verify the server trusts the provider verification rather than arbitrary client claims.

Test:

- duplicate callback
- replayed callback
- mismatched amount
- mismatched reference
- wrong user
- delayed callback
- malformed callback
- provider failure

---

# 35. GIFTS

Test:

- sender balance
- recipient balance
- artifact selection
- correct value
- transaction
- notification
- recipient cannot forward gift
- recipient can cash out wallet value
- insufficient balance
- duplicate send
- double click
- concurrent send
- rollback
- failed transaction
- idempotency

---

# 36. GIFT → PRIORITIZED POST BRIDGE

Test the exact intended behavior.

Scenario:

```text
User A gifts User B
        ↓
B receives normal gift notification
        ↓
A has a Prioritized post
        ↓
A's Prioritized post becomes specially eligible for B
```

Verify it does NOT:

- follow A
- grant A social access
- force B to engage
- require interest match
- require B to follow A
- require profile visit

Test:

- no Prioritized post
- one Prioritized post
- changed Prioritized post
- deleted Prioritized post
- blocked sender
- blocked recipient
- repeated gifts
- maximum 3 gift-triggered opportunities
- engagement stops remaining opportunities
- no engagement reaches max
- daily reset
- concurrency

---

# 37. PRIORITIZE

Test:

- create Prioritized post
- change prioritized post
- remove
- daily behavior
- normal Feed interaction
- creator's other posts
- repeated opportunity
- no forced engagement

Verify the intended slot-substitution model:

> Prioritize should preferentially use the creator's available Feed opportunity for the selected post rather than simply behaving as a generic audience expansion boost.

---

# 38. PAYOUTS

Test the defined payout architecture.

Verify:

- minimum withdrawal
- Friday withdrawal request window
- Saturday payout process
- fund reservation
- pending
- processing
- paid
- failed
- reversed where applicable
- provider callback
- idempotency
- reconciliation
- Admin controls
- insufficient available funds
- account restrictions

Never bypass financial state machines merely to make a test pass.

---

# 39. PROMOTION

Test:

- Promotion enabled
- Promotion disabled
- Promote UI visibility
- targeting
- age
- gender
- location
- topic/niche
- budget
- duration
- $1–$50/day
- review
- Admin review
- Give Back
- engagement weights
- submission
- approval/rejection
- active
- pause
- terminate
- extend
- delivery
- organic engagement
- Project attachment

Verify promotions do not run in comments.

---

# 40. GIVE BACK

Test the financial reward system using sandbox/test data.

Verify:

```text
Promotion
    ↓
Give Back configured
    ↓
Eligible engagement
    ↓
Internal points
    ↓
Total points
    ↓
Participant share
    ↓
Wallet credit
```

Test:

- Like
- Dislike
- Share
- Repost
- Comment
- Comment engagement
- negative values
- deletion
- moderation
- duplicate event
- self-engagement
- coordinated engagement
- account deletion

Do not expose secret reward mechanics merely because the test needs to inspect them.

The test system may inspect internal accounting; users must not be shown hidden formulas.

---

# 41. TIME-BASED REWARD FACTOR

Test that meaningful active time acts as a quality/context multiplier rather than simply another engagement event.

Test:

- short session
- normal session
- long meaningful session
- idle tab
- background app
- rapid scrolling
- scripted interaction
- engagement burst
- repeated open/close

Verify the system does not reward:

- idle time
- background time
- synthetic activity
- meaningless rapid interaction

---

# 42. AFFILIATE FORKING

Test:

- creator enables affiliate program
- commission percentage
- affiliate forks Project
- unique attribution link
- external visit
- signup
- purchase
- attribution
- direct revisit
- original Project purchase after affiliate discovery
- attribution window
- refund
- chargeback
- affiliate revocation
- self-referral
- attribution hijacking

Verify creator ownership remains intact.

---

# 43. NOTIFICATIONS

Test every major event:

- follow
- comment
- reply
- gift
- purchase
- Project access
- Room activity
- meeting
- event
- payout
- withdrawal
- relevant system events

Verify:

- correct recipient
- no duplicate notifications
- correct deep link
- deleted content handling
- blocked users
- unread state
- read state
- navigation

---

# 44. SOFT FEED DISCOVERY

Test the recently defined cross-surface Feed invitations.

After:

- Book access
- Book completion
- Course completion
- File download
- Audio/video completion
- Room milestone
- Meeting completion
- Event completion
- Project purchase

Verify the invitation:

- is optional
- does not block the primary task
- is not repetitive
- uses appropriate copy
- navigates correctly
- respects frequency management
- does not mutate social graph
- does not generate financial rewards
- does not break on Feed failure

---

# 45. ACCOUNT DELETION CASCADE TEST

Use a synthetic user who has:

- posts
- comments
- follows
- messages
- bookmarks
- Project purchases
- wallet history
- gifts
- withdrawal history
- affiliate relationships

Then execute account deletion.

Verify all dependent systems behave according to their intended data-retention architecture.

Do not casually hard-delete immutable financial ledger records.

Flag any inconsistency.

---

# 46. BLOCKING / MODERATION

Create at least several synthetic relationships involving:

- blocked user
- blocked creator
- blocked commenter
- blocked recipient

Test:

- Feed
- profiles
- messages
- comments
- gifts
- Projects
- recommendations
- notifications
- deep links

The block system must be consistently respected.

---

# 47. ABUSE TESTING

Within the authorized test environment, simulate:

- rapid likes
- rapid dislikes
- rapid comments
- repeated follows/unfollows
- repeated gift attempts
- repeated funding attempts
- repeated withdrawal requests
- duplicate webhooks
- replayed events
- concurrent actions
- self-engagement
- multiple users coordinating engagement
- repeated refresh
- repeated form submission

Verify:

- rate limits
- idempotency
- validation
- ledger integrity
- abuse controls
- graceful errors

---

# 48. CONCURRENCY TESTING

This is mandatory.

At least some scenarios must execute simultaneously.

Examples:

```text
Two users like the same post simultaneously.

Two users comment simultaneously.

Same user double-submits a comment.

Two gift requests race.

Two funding callbacks arrive.

Two withdrawal requests race.

Multiple users engage with one sponsored post.

Multiple users attempt to purchase the final/limited resource if such limits exist.
```

Look for:

- duplicate rows
- lost updates
- negative balances
- double credits
- double debits
- inconsistent counts
- stale UI
- transaction races

---

# 49. REFRESH-AT-THE-WORST-MOMENT TEST

During critical operations, refresh or navigate away:

- signup
- login
- password reset
- post publish
- comment submit
- upload
- purchase
- funding
- gift
- withdrawal
- Project creation
- course progress

Then return.

The system must converge to the correct authoritative state.

---

# 50. DOUBLE-CLICK EVERYTHING

For important mutation buttons:

- click twice
- click rapidly
- tap repeatedly
- trigger keyboard submit repeatedly where applicable

Verify:

> One intended action = one authoritative mutation.

---

# 51. SLOW NETWORK

Simulate or approximate:

- slow request
- delayed response
- request timeout
- interrupted request
- retry
- duplicate retry

The UI must distinguish:

```text
processing
success
failure
unknown / pending
```

Do not use fake timers to pretend an operation succeeded.

---

# 52. CLIENT TAMPERING

Within the test environment, inspect whether a malicious client could attempt to:

- change wallet amount
- change gift value
- change recipient
- alter Project price
- alter commission
- alter Give Back
- alter withdrawal amount
- mark payment successful
- access another user's resource
- edit another user's post
- delete another user's content
- bypass Project eligibility
- impersonate Admin
- alter promotion state
- manipulate reward points

Test through appropriate authorized methods.

Expected:

> Server rejects unauthorized or inconsistent mutations.

---

# 53. RLS / DATABASE SECURITY

Inspect Supabase:

- tables
- views
- functions
- RPCs
- RLS policies
- storage policies
- service-role usage
- SECURITY DEFINER functions
- ownership checks
- recipient checks
- Admin checks

Test representative cross-user access.

Do not merely read the policies.

Attempt access using different synthetic user sessions.

---

# 54. EDGE FUNCTIONS

Inventory all relevant Edge Functions.

For each:

- input validation
- authentication
- authorization
- idempotency
- error handling
- secrets
- service-role usage
- database transaction safety
- logging
- timeout behavior
- webhook verification

Where practical, exercise the function through the application.

---

# 55. WEBHOOKS

Test:

- valid webhook
- duplicate webhook
- replay
- malformed webhook
- wrong reference
- wrong amount
- wrong user
- delayed webhook
- provider error
- out-of-order events

Financial state must not be corrupted.

---

# 56. DATABASE INVARIANTS

Explicitly inspect financial invariants.

Examples:

```text
Wallet balance cannot become negative unless explicitly supported.

Client cannot mint funds.

Every financial balance mutation has an authoritative ledger event.

A gift cannot debit sender twice.

A gift cannot credit recipient twice.

A withdrawal cannot reserve the same funds twice.

A payout cannot settle twice.

A refund cannot credit twice.

A commission cannot settle twice.
```

Test these invariants with synthetic activity.

---

# 57. STORAGE

Test:

- upload
- download
- access control
- wrong-user access
- deleted file
- orphaned file
- oversized file
- unsupported file
- interrupted upload
- retry
- private resource
- public resource
- Project-linked resource

---

# 58. SEARCH / DISCOVERY

Test:

- users
- posts
- Projects
- topics
- exact match
- partial match
- no result
- deleted content
- blocked content
- pagination
- deep link
- refresh

---

# 59. RECOMMENDATIONS

Test:

- new user
- established user
- creator
- complementary recommendations
- followed users
- blocked users
- inactive users
- duplicate suggestions

Verify the intended principle:

> Recommend people/accounts the user may need, not merely people who are similar.

Do not replace the existing architecture if it already handles this well.

---

# 60. ADMIN

Audit Admin UI and backend.

Test:

- access control
- Admin-only routes
- configuration
- feature flags
- Promotion review
- Give Back
- comment deletion controls
- Project eligibility
- payout controls
- fraud/abuse controls
- audit logs
- kill switches

Attempt Admin access using ordinary synthetic users.

They must be rejected.

---

# 61. ADMIN ACTION SAFETY

Test:

- toggle
- save
- cancel
- stale state
- concurrent Admin changes
- invalid values
- boundary values
- refresh
- audit trail

---

# 62. UI/BACKEND CONSISTENCY

For every major mutation:

```text
User action
→ UI state
→ request
→ server
→ database
→ response
→ UI reconciliation
```

Confirm every layer agrees.

Flag cases such as:

> UI says “sent” but ledger says failed.

> UI says “withdrawal submitted” but no withdrawal exists.

> UI shows Project access but entitlement is missing.

> UI shows comment but database has no comment.

---

# 63. STATE-MACHINE AUDIT

For each important entity, document states.

Examples:

### Purchase

```text
initiated
pending
paid
failed
refunded
```

### Withdrawal

```text
requested
reserved
processing
paid
failed
reversed
```

### Promotion

```text
draft
in_review
approved
active
paused
terminated
completed
rejected
```

### Project

```text
draft
published
unpublished
deleted
```

Use the actual repository states where they differ.

Find impossible transitions.

---

# 64. DATA CONSISTENCY AFTER FAILURE

For every critical operation:

Simulate failure at:

- before request
- during request
- after server commit
- before client receives response
- during retry

Then determine whether the system converges correctly.

This is especially important for:

- wallet
- gifts
- purchases
- payouts
- comments
- posts
- Project access

---

# 65. REALISTIC MULTI-USER SCENARIOS

Do not only run isolated tests.

Run full stories.

---

# 66. SCENARIO A — NEW USER

Synthetic User 001:

```text
Signup
→ onboarding
→ interests
→ suggested accounts
→ follow
→ Feed
→ like
→ comment
→ bookmark
→ return later
```

Verify the complete journey.

---

# 67. SCENARIO B — CREATOR

Synthetic User 002:

```text
Signup
→ build profile
→ post
→ receive engagement
→ become Project-eligible
→ create Project
→ publish
→ receive purchase
→ receive earnings
```

---

# 68. SCENARIO C — BUYER

Synthetic User 003:

```text
Discover Project
→ purchase
→ access
→ Personal Library
→ use Project
→ complete
→ soft Feed invitation
→ Feed
```

---

# 69. SCENARIO D — COURSE STUDENT

Synthetic User 004:

```text
Purchase
→ Course
→ lesson
→ progress
→ resume
→ completion
→ Feed discovery
```

---

# 70. SCENARIO E — GIFT LOOP

Users 005–010:

```text
A gifts B
B receives
A Prioritizes post
B becomes eligible
B sees opportunity
B engages
special delivery stops
```

Then test:

```text
no engagement
→ opportunity 2
→ no engagement
→ opportunity 3
→ special delivery ends
```

---

# 71. SCENARIO F — WALLET

Synthetic User 011:

```text
Fund
→ wallet
→ gift
→ receive gift
→ earnings
→ withdrawal request
→ payout lifecycle
```

---

# 72. SCENARIO G — PROMOTION

Synthetic User 012:

```text
Create post
→ Promote
→ targeting
→ budget
→ submit
→ Admin review
→ Give Back
→ active delivery
→ engagement
→ wallet reward
```

---

# 73. SCENARIO H — AFFILIATE

Synthetic Users 013–015:

```text
Creator creates paid Project
→ enables affiliate
→ affiliate forks
→ external visit
→ buyer purchase
→ commission
→ later direct discovery
→ attribution behavior
```

---

# 74. SCENARIO I — ACCOUNT DELETION

Synthetic User 016:

Build substantial state, then:

```text
Delete account
→ session invalidated
→ resources handled
→ financial records preserved correctly
→ other users' views remain coherent
```

---

# 75. SCENARIO J — ADVERSARIAL USER

Synthetic User 017:

Attempt:

- double clicks
- invalid inputs
- direct route access
- cross-user access
- repeated requests
- stale sessions
- manipulated client payloads

Document every successful bypass.

---

# 76. POPULATION-LEVEL TESTING

After individual stories, use the 100+ users to create a realistic ecosystem.

Generate:

- posts
- comments
- replies
- follows
- bookmarks
- shares
- reposts
- Project purchases
- Room memberships
- gifts
- Feed activity

Then inspect:

- Feed diversity
- recommendation quality
- notification correctness
- counts
- performance
- database growth
- race conditions
- duplicate records

---

# 77. NOT ALL 100 USERS SHOULD BE IDENTICAL

Create behavioral variation.

Examples:

### User type A
Reads, rarely interacts.

### User type B
Comments heavily.

### User type C
Creates Projects.

### User type D
Buys Projects.

### User type E
Gifts frequently.

### User type F
Uses Wallet heavily.

### User type G
Barely returns.

### User type H
Creates high-performing posts.

### User type I
Creates poor-performing posts.

### User type J
Attempts abuse.

This creates a more realistic system state.

---

# 78. FEED LOAD / DATA VOLUME

The goal is not formal production-scale load testing unless appropriate tooling exists.

However, generate enough realistic data to expose:

- pagination bugs
- N+1 queries
- slow Feed
- broken counts
- missing indexes
- duplicate ranking candidates
- slow notifications
- inefficient recommendation queries
- large query payloads

---

# 79. DATABASE PERFORMANCE

Inspect:

- slow queries
- missing indexes
- unbounded queries
- inefficient joins
- repeated queries
- N+1 patterns
- oversized payloads
- unnecessary realtime subscriptions

Do not optimize prematurely.

Flag evidence-backed issues.

---

# 80. MOBILE UI CRAWL

Run the key journeys on the target mobile experience.

At minimum:

- signup
- login
- Feed
- post
- comment
- profile
- Project purchase/access
- wallet
- gift
- withdrawal
- notifications
- messaging

Look for:

- clipped UI
- inaccessible buttons
- keyboard overlap
- broken scrolling
- bottom navigation conflicts
- slow loading
- incorrect back behavior
- touch target issues

---

# 81. BROWSER / PLATFORM COVERAGE

Use the available test environment to exercise supported browsers/devices.

Do not claim browser compatibility that was not actually tested.

Document:

```text
tested
not tested
blocked
not applicable
```

---

# 82. ACCESSIBILITY SMOKE TEST

For major flows test:

- keyboard navigation where applicable
- focus
- labels
- screen readers where tooling allows
- contrast
- text scaling
- reduced motion

Flag major blockers.

---

# 83. OBSERVABILITY

Verify that critical failures are diagnosable.

Look for:

- useful server logs
- request identifiers
- transaction references
- webhook references
- error categories
- Admin visibility
- audit trails

Do not log:

- passwords
- secrets
- full payment credentials
- sensitive tokens

---

# 84. ERROR MESSAGES

Test whether errors tell users:

- what happened
- what they can do next
- whether the operation may have succeeded despite a client error

Avoid:

> “Something went wrong.”

when the system can provide a useful safe explanation.

---

# 85. UX QUALITY

Not every issue is a crash.

Flag:

### P0
Launch blocker / security / financial corruption / catastrophic data loss.

### P1
Major broken user journey.

### P2
Significant UX or reliability issue.

### P3
Polish / minor defect.

### P4
Future improvement.

Use evidence.

---

# 86. DO NOT HIDE ISSUES BECAUSE THEY ARE SMALL

A tiny issue can reveal a systemic problem.

For example:

> Duplicate comment after double-click

may indicate a broader idempotency problem.

Trace the underlying architecture.

---

# 87. ROOT-CAUSE ANALYSIS

For every significant issue:

```text
Observed behavior
↓
Reproduction
↓
Affected user(s)
↓
UI component
↓
API / function
↓
Database behavior
↓
Root cause
↓
Recommended fix
↓
Regression test
```

Do not stop at:

> “Button is broken.”

Find out why.

---

# 88. ISSUE REPORT FORMAT

Every issue should include:

```text
ID:
Severity:
Area:
Scenario:
Synthetic user(s):
Preconditions:
Steps:
Expected:
Actual:
Reproducibility:
Evidence:
Likely root cause:
Affected architecture:
Recommended fix:
Regression test:
Launch decision:
```

---

# 89. EVIDENCE

Where possible capture:

- route
- timestamp
- synthetic user
- database record
- request/response
- server log
- screenshot
- console error
- reproduction steps

Do not expose secrets in evidence.

Redact tokens.

---

# 90. “WORKS” IS NOT ENOUGH

A flow is only considered healthy when:

- UI works
- server works
- database state is correct
- authorization is correct
- failure states are sane
- refresh is safe
- repeated actions are safe
- relevant downstream state updates
- no obvious security bypass exists

---

# 91. TEST DATA CLEANUP

After testing:

Determine which synthetic data should be:

- deleted
- retained as fixtures
- archived
- reset

Do not accidentally delete:

- source code
- migrations
- configuration
- real data
- production records

Financial test records may need retention for audit/reconciliation.

Document cleanup.

---

# 92. DO NOT CLEAN UP BEFORE INVESTIGATION

Preserve enough test evidence to diagnose issues.

If cleanup is destructive, export/store the necessary identifiers and logs first.

---

# 93. FINAL SECURITY PASS

After functional testing, perform a focused security pass.

Check:

- auth
- RLS
- authorization
- IDOR
- storage
- Admin
- wallet
- gifts
- purchases
- payouts
- promotions
- affiliate attribution
- webhooks
- secrets
- service-role exposure
- rate limiting
- replay
- idempotency
- client tampering

---

# 94. FINAL FINANCIAL INTEGRITY PASS

Calculate and reconcile synthetic financial state.

Verify:

```text
Opening balance
+ verified credits
- verified debits
= closing balance
```

For each test wallet where applicable.

Reconcile:

- funding
- gifts
- earnings
- purchases
- commissions
- withdrawals
- payouts
- refunds
- reversals

Any unexplained discrepancy is a launch blocker until understood.

---

# 95. FINAL DATA-INTEGRITY PASS

Check for:

- orphaned rows
- duplicate rows
- impossible states
- missing foreign relationships
- dangling references
- deleted content references
- broken access records
- duplicate notifications
- duplicate ledger events

---

# 96. FINAL NAVIGATION PASS

After all workflows:

Crawl again as a user.

Ask:

> Can I always get somewhere useful?

Check:

- Feed
- Projects
- Library
- Profile
- Notifications
- Messages
- Wallet
- Settings
- Admin
- deep links
- Back behavior

---

# 97. FINAL “100 PEOPLE ARRIVED TOMORROW” QUESTION

Claude must explicitly answer:

> If 100 new people joined Akọ tomorrow and behaved unpredictably, what would break first?

Then:

> What would break second?

Then:

> What would users notice?

Then:

> What would Admin notice?

Then:

> What would the database notice?

Then:

> What could silently corrupt money or access without anyone noticing?

This section should be evidence-based.

---

# 98. LAUNCH BLOCKER RULES

Any issue involving the following should normally be treated as a launch blocker until resolved or explicitly accepted by the product owner:

- unauthorized access
- account takeover path
- wallet corruption
- money creation
- incorrect debit
- incorrect credit
- duplicate payout
- duplicate withdrawal
- duplicate financial settlement
- payment verification bypass
- Admin bypass
- private data exposure
- severe RLS failure
- broken authentication
- destructive data-loss path
- widespread inability to access purchased Projects

---

# 99. IMPORTANT: DO NOT FIX EVERYTHING BLINDLY

Claude should not immediately modify the code for every issue.

First:

1. Discover.
2. Reproduce.
3. Classify.
4. Trace.
5. Group related failures.
6. Identify root cause.
7. Determine safest fix.
8. Check whether existing architecture already has a stronger solution.
9. Then implement fixes where appropriate.

---

# 100. SOLUTION MD

At the end, Claude must produce a repo-ready Markdown file:

```text
AKO_FINAL_PRE_LAUNCH_FINDINGS_AND_REMEDIATION.md
```

This is not merely a bug list.

It must contain:

- executive summary
- launch verdict
- test environment
- synthetic population
- scenarios executed
- coverage
- issues
- severity
- evidence
- root causes
- architecture findings
- security findings
- financial findings
- UX findings
- performance findings
- navigation findings
- recommended fixes
- implemented fixes, if Claude implements them
- unresolved issues
- accepted risks
- regression tests
- final launch checklist

---

# 101. FINAL FINDINGS STRUCTURE

Use:

```markdown
# AKỌ — FINAL PRE-LAUNCH FINDINGS & REMEDIATION

## 1. Executive Summary

## 2. Launch Verdict

## 3. Environment

## 4. Synthetic User Population

## 5. Test Coverage

## 6. Critical Findings

## 7. Authentication Findings

## 8. Feed Findings

## 9. Social Interaction Findings

## 10. Messaging Findings

## 11. Project Findings

## 12. Library / Access Findings

## 13. Wallet Findings

## 14. Gift Findings

## 15. Withdrawal / Payout Findings

## 16. Promotion / Give Back Findings

## 17. Affiliate Findings

## 18. Security Findings

## 19. Database / RLS Findings

## 20. Performance Findings

## 21. Mobile Findings

## 22. Accessibility Findings

## 23. Navigation / Connectivity Findings

## 24. UX Findings

## 25. Root-Cause Clusters

## 26. Fix Plan

## 27. Regression Tests

## 28. Unresolved Issues

## 29. Accepted Risks

## 30. Final Launch Gate
```

---

# 102. ROOT-CAUSE CLUSTERS

If ten bugs have the same cause, do not write ten unrelated solutions.

Example:

```text
Observed:
17 duplicate mutation issues.

Root cause:
Mutation endpoints lack consistent idempotency.

Solution:
Establish shared idempotency strategy for mutation class.
```

This is much more valuable.

---

# 103. FIX PRIORITIZATION

For each fix:

```text
P0 — Must fix before launch
P1 — Should fix before launch
P2 — Fix immediately after MVP launch
P3 — Backlog
```

Do not downgrade a security/financial issue simply because it is difficult.

---

# 104. LAUNCH VERDICT

The final report must give one of:

## GO

No known P0/P1 blocker remains and critical systems passed.

## CONDITIONAL GO

Known issues remain, but they are explicitly documented, understood, mitigated, and consciously accepted.

## NO-GO

One or more unresolved launch-blocking issues remain.

Do not say:

> “Everything looks good.”

without evidence.

---

# 105. NO-GO CONDITIONS

Recommend NO-GO if there is credible evidence of:

- financial corruption
- unauthorized private data access
- Admin bypass
- authentication bypass
- material RLS failure
- destructive account/data bug
- inability to reliably provision purchased access
- duplicate financial settlement
- serious webhook replay vulnerability
- severe concurrency corruption
- systemic mutation duplication

---

# 106. CONDITIONAL GO

Conditional Go should list:

```text
Issue
Risk
Mitigation
Owner
Deadline
Monitoring
Rollback
```

Do not use Conditional Go as a way to hide unresolved critical risk.

---

# 107. FINAL REGRESSION SUITE

After fixes, rerun all affected scenarios.

Do not assume the fix works because the code changed.

For every P0/P1 fix:

```text
Original reproduction
→ fix
→ original test
→ neighboring tests
→ concurrency test where applicable
→ regression result
```

---

# 108. FINAL REPO STATE

Before declaring completion:

- run tests
- run build
- run type checks
- run lint where configured
- inspect migrations
- inspect changed files
- inspect environment configuration
- inspect secrets handling
- inspect generated artifacts
- inspect database changes
- inspect RLS changes

Do not leave:

- debug endpoints
- test bypasses
- hardcoded test accounts
- secrets
- console spam
- temporary Admin backdoors
- disabled security policies
- temporary payment bypasses

---

# 109. FINAL DATABASE MIGRATION REVIEW

If fixes require migrations:

Verify:

- migration ordering
- idempotency where appropriate
- rollback implications
- indexes
- constraints
- RLS
- production safety
- data migration behavior

Do not manually mutate the production database as a substitute for a proper migration unless explicitly required by the deployment architecture.

---

# 110. FINAL SECURITY SECRET REVIEW

Search repository and build output for accidental exposure of:

- service-role keys
- private keys
- webhook secrets
- payment secrets
- database credentials
- Admin credentials
- test bypass tokens

Client bundles must not contain server-only secrets.

---

# 111. FINAL CLEAN BUILD

The application must:

- build successfully
- start successfully
- load correctly
- authenticate
- route correctly
- connect to backend
- access Supabase
- execute critical workflows

---

# 112. FINAL USER JOURNEY REPLAY

Run these from a clean synthetic account:

```text
Signup
→ Onboarding
→ Feed
→ Post
→ Comment
→ Follow
→ Discover Project
→ Purchase
→ Library
→ Use Project
→ Gift
→ Wallet
→ Withdrawal
→ Notifications
→ Messaging
→ Logout
→ Login
→ Password reset
→ Return
```

Not every account needs every action.

The purpose is to validate that the major systems feel like one coherent application.

---

# 113. THE “MERCILESS USER” RULE

Whenever Claude encounters:

- a button
- a link
- a form
- a mutation
- a permission
- a loading state
- an empty state
- an error
- a financial action
- a deep link

ask:

> **What happens if I do the wrong thing here?**

Then test it.

---

# 114. THE “REAL USER” RULE

Also ask:

> **What happens if I do the normal thing here?**

The app must not become so hardened against abuse that ordinary use becomes painful.

Security and usability must coexist.

---

# 115. THE “SILENT FAILURE” RULE

Prioritize failures that can silently corrupt:

- money
- access
- attribution
- ownership
- social state
- analytics used for financial decisions

A visible crash is often easier to catch than silent corruption.

---

# 116. THE “THREE LAYERS” RULE

Every important finding should be considered at three layers:

### User layer
What does the user experience?

### Application layer
What does the frontend/backend do?

### Data layer
What is actually stored?

A bug is fully understood only when the relationship between these layers is understood.

---

# 117. DO NOT TRUST THE UI

If the UI says:

> “Payment successful”

verify the payment.

If the UI says:

> “Gift sent”

verify the ledger.

If the UI says:

> “Project available”

verify entitlement.

If the UI says:

> “Withdrawal requested”

verify the withdrawal state.

If the UI says:

> “Comment posted”

verify the database.

---

# 118. DO NOT TRUST THE DATABASE ALONE

Also verify the UI.

A database record existing does not mean:

- user can reach it
- correct user can see it
- UI displays it
- navigation works
- permissions are correct

---

# 119. FINAL PRODUCT COHERENCE TEST

After all technical testing, Claude should spend time simply using Akọ.

Do not inspect code.

Pretend you are a person discovering the app for the first time.

Ask:

> Does this feel like one product?

Check transitions between:

- Feed
- Projects
- Library
- Profiles
- Messaging
- Wallet
- Notifications
- Admin where applicable

Find places where the application feels stitched together.

---

# 120. FINAL QUESTION

At the end, Claude must answer:

> **Would I personally be comfortable letting the first 100 real Akọ users use this tomorrow?**

The answer must be based on the evidence collected.

If no:

> Explain exactly why.

If yes:

> Explain exactly what was tested and what residual risks remain.

---

# 121. DO NOT CLAIM COVERAGE YOU DID NOT ACHIEVE

If a test was not possible because:

- provider sandbox unavailable
- browser automation unavailable
- native build unavailable
- environment unavailable
- permission unavailable

state:

```text
NOT TESTED
Reason:
Risk:
Recommended next step:
```

Never mark it PASS.

---

# 122. FINAL OUTPUTS

Claude must finish with:

### A. Working repository

with fixes implemented where appropriate.

### B. Final findings/remediation MD

```text
AKO_FINAL_PRE_LAUNCH_FINDINGS_AND_REMEDIATION.md
```

### C. Test evidence

Where appropriate and safe:

- screenshots
- logs
- test IDs
- scenario results
- database references
- reproduction records

### D. Launch verdict

Explicit:

```text
GO
CONDITIONAL GO
NO-GO
```

---

# 123. FINAL INSTRUCTION TO CLAUDE

This is the final pre-launch assurance exercise.

Do not treat this document as a list of boxes to tick.

**Think. Explore. Break things. Trace things.**

Read the existing repository first.

Understand the architecture.

Understand the Supabase database.

Understand the existing Admin system.

Understand the current Feed.

Understand Projects.

Understand Wallet.

Understand Gifts.

Understand Payouts.

Understand Promotion.

Understand Give Back.

Understand Affiliate attribution.

Understand the Personal Project Library.

Understand the onboarding system.

Understand navigation.

Then create your synthetic population.

Then use the application.

Then deliberately try to break it.

When something fails, reproduce it.

When it reproduces, trace it.

When you find the root cause, determine whether it is isolated or systemic.

When it is systemic, fix the architecture rather than patching one symptom.

When you fix something, rerun the test.

When you cannot fix something safely, document it.

When you do not know, say you do not know.

When you could not test something, say **NOT TESTED**.

Never manufacture a PASS.

Never hide a failure.

Never weaken security just to make a test pass.

Never use real money.

Never touch real user data.

Never expose secrets.

Never leave test backdoors behind.

---

# 124. THE FINAL STANDARD

The standard is not:

> **“Claude reviewed the code.”**

The standard is:

> **“A controlled population of 100+ synthetic users actually used Akọ across its major journeys, the UI and backend were exercised together, failure cases and adversarial behavior were tested, financial and authorization invariants were checked, defects were reproduced and traced to root causes, fixes were regression-tested, and the remaining risks were documented.”**

That is the bar.

---

# 125. AKỌ MVP LAUNCH GATE

The MVP should launch only after this process produces a defensible answer to:

### Can people sign up?

### Can they log in?

### Can they recover access?

### Can they delete their account safely?

### Can they discover and use the Feed?

### Can they post?

### Can people meaningfully respond?

### Can they follow and discover one another?

### Can they message?

### Can creators create Projects when eligible?

### Can users purchase/access Projects?

### Can acquired Projects be found afterward?

### Can Courses, Rooms, Meetings, Events and Files work end-to-end?

### Can money enter the system safely?

### Can money move between wallets safely?

### Can gifts work safely?

### Can money leave the system safely?

### Can payouts reconcile?

### Can promotions work safely?

### Can Give Back work without corrupting accounting?

### Can affiliate attribution survive real journeys?

### Can deletion, blocking and moderation remain coherent?

### Can 100+ users interact without obvious systemic failures?

### Can a malicious client fail to bypass server authority?

### Can the application recover from retries, refreshes and concurrency?

### Can the user move through the product without dead ends?

### Does the product still feel like one coherent Akọ?

If the answer to any critical question is no, the report must say so clearly.

---

# 126. FINAL PRINCIPLE

**Do not launch because the code looks finished.**

Launch because the system has been **used, attacked, stressed, traced, reconciled, repaired, and tested again.**

Akọ's first users should discover the product.

They should not be the people who discover its most obvious bugs.

## This is the final gate.

**Crawl it.**

**Use it.**

**Break it.**

**Understand it.**

**Fix it.**

**Test it again.**

**Then decide whether Akọ is ready.**
