# AKỌ — Notification System Audit & Upgrade Specification

## 1. Purpose

This document defines the audit-and-upgrade specification for Akọ's notification system.

This is **not a blind rebuild checklist**.

Claude must first inspect the existing Akọ codebase, database schema, Supabase configuration, Edge Functions, realtime/subscription logic, frontend state management, routing, authentication, messaging, engagement systems, Projects, wallet/gifting, promotions, administration, and any existing notification implementation.

The goal is to make notifications a **complete product-wide system**, not a collection of isolated UI popups.

Claude should approach this as a **systems thinker, product architect, and innovative senior platform engineer**:

> If an important event happens anywhere in Akọ and a user should reasonably know about it, the system should have a deliberate notification path.

At the same time:

> Not every database event should become a notification.

The system must distinguish between:
- events that require notification,
- events that may notify,
- events that should remain silent,
- events that are bundled/digested,
- and events that are operational/admin-only.

The implementation must work across **backend and frontend** and remain reliable as Akọ grows.

---

## 2. Product Principle

Akọ notifications should answer:

> **"What happened that matters to me?"**

Notifications should not become noise.

The system should make important activity discoverable without forcing users to constantly monitor:
- posts,
- comments,
- chats,
- Projects,
- wallet activity,
- promotions,
- follows,
- recommendations,
- administrative announcements,
- or other parts of the app.

The notification system should therefore be:

- event-driven,
- user-aware,
- reliable,
- deduplicated,
- preference-aware,
- real-time where appropriate,
- persistent,
- auditable,
- secure,
- mobile-friendly,
- scalable,
- and extensible.

---

# 3. Audit First

Before changing code, Claude must map the existing system.

Inspect at minimum:

### Frontend
- notification components
- notification bell/icon
- unread badge/count
- notification page
- notification dropdown/popover
- routing
- deep links
- toast/in-app alerts
- realtime subscriptions
- Supabase client usage
- query/mutation hooks
- global state
- cache invalidation
- optimistic updates
- loading/empty/error states
- mobile navigation
- native-app preparation points

### Backend
- database schema
- notification tables
- triggers
- Edge Functions
- server actions
- API endpoints
- messaging functions
- engagement functions
- follow functions
- Project functions
- wallet/gift functions
- promotion functions
- admin functions
- scheduled jobs
- webhook handlers
- realtime publication configuration

### Security
- RLS policies
- authorization checks
- service-role usage
- recipient validation
- actor validation
- tenant/account boundaries
- admin permissions
- notification content exposure
- deep-link authorization

### Existing product systems
Trace all systems capable of generating meaningful user events.

Claude must not assume that because a UI button exists, its notification path exists.

---

# 4. Build an Event Map

Create an internal event inventory for the entire application.

For every meaningful event, answer:

| Question | Required |
|---|---|
| What happened? | Yes |
| Who caused it? | Usually |
| Who should know? | Yes |
| Should the actor receive it? | Usually no |
| Is it immediate? | Decide |
| Should it be persisted? | Decide |
| Should it be realtime? | Decide |
| Can it be bundled? | Decide |
| Does it require preferences? | Decide |
| What destination does it open? | Yes |
| What happens if destination is deleted? | Decide |
| What happens if actor blocks recipient? | Decide |
| What happens if event repeats rapidly? | Decide |
| Does it require auditability? | Decide |

Claude should produce an event matrix from the actual codebase.

Do not invent duplicate event types when the codebase already has an equivalent concept.

---

# 5. Core Notification Categories

At minimum, audit and cover the following categories.

## 5.1 Messages

Notifications should exist for meaningful message events.

Examples:

- new direct message
- new message in a group/chat
- reply to a message
- mention in a message, if supported
- message request, if supported
- unread message reminder, if product logic warrants it
- group invitation
- added to a group
- removed from a group, if user needs to know
- group role changes where relevant
- message-related system events

Do not notify a user for every message when the user is already actively viewing the relevant conversation.

The system should understand **notification suppression while actively engaged**.

Example:

If User A is currently viewing a chat with User B and B sends five messages:

- do not generate five intrusive push notifications;
- the chat should update in realtime;
- the notification center may maintain an appropriate unread/message state.

---

# 6. Engagement Notifications

Audit every engagement type currently supported by Akọ.

Potential events include:

- someone supports your post
- someone disagrees with your post
- someone pushes back on your post
- someone comments on your post
- someone replies to your comment
- someone supports your comment
- someone disagrees with your comment
- someone pushes back on your comment
- someone likes/supports a relevant comment
- someone saves/bookmarks your content where appropriate
- someone shares your post
- someone reposts your post
- someone quotes/references your content if supported
- someone mentions you
- someone follows you
- someone interacts meaningfully with your Project
- someone interacts with a Project you own
- other future engagement types

Claude must inspect the actual engagement model.

Do not create notifications for engagement types that do not exist.

Do not assume all engagement types deserve identical notification behavior.

---

# 7. Comment Notifications

Comments need their own audit.

At minimum:

- new comment on your post
- reply to your comment
- engagement with your comment where product value justifies notification
- mention in a comment
- comment moderation/removal affecting you
- comment deletion where the user needs to understand why a referenced interaction disappeared

Avoid notification spam.

For example, if 15 people comment on a post within a short period, the system should be capable of intelligently bundling:

> "15 people commented on your post."

rather than necessarily producing 15 separate push notifications.

The exact bundling strategy must be determined after auditing current UX.

---

# 8. Follow & Social-Graph Notifications

Audit:

- new follower
- follow-back where relevant
- follow request, if applicable
- accepted follow request, if applicable
- unfollow should normally be silent
- meaningful activity from connected people if product design calls for it

The social activity feed signal and notification system are related but **not identical**.

A person's activity influencing your feed does not automatically mean you need a notification.

---

# 9. Project Notifications

Akọ Projects are a major part of the platform.

Audit notifications for:

- Project purchase
- Project enrollment/access
- Project invitation
- Project update
- new course module/lesson
- new Project content
- event reminder
- meeting reminder
- room announcement
- room activity
- cohort/session changes
- Project owner communication
- access granted
- access revoked where appropriate
- ticket availability/delivery
- saved Project becoming relevant if product supports this
- Project cancellation/postponement
- payment-related Project events
- affiliate-related Project events
- creator/owner receiving meaningful Project activity

Notifications should deep-link directly into the relevant Project or Project section.

---

# 10. Wallet & Gifting Notifications

Financial events must have reliable notification paths.

Audit:

### Gifts
- someone sent you a gift
- gift received
- gift-related wallet update
- gift reversal/refund where applicable

### Wallet
- wallet credit
- wallet debit
- Give Back earnings
- promotional reward earnings
- affiliate commission
- withdrawal requested
- withdrawal approved/processing
- payout completed
- payout failed
- payout reversed
- withdrawal held/reviewed where appropriate
- refund
- chargeback
- other material financial events

Financial notifications should be generated from **server-authoritative financial events**, not from client-side UI assumptions.

A successful-looking frontend mutation must never be the source of truth for:

> "You received $X."

The ledger/wallet transaction must be the source.

---

# 11. Promotion Notifications

Audit the promotion system comprehensively.

Potential notifications:

### Promoter
- promotion submitted
- promotion received by admin
- promotion in review
- promotion approved
- promotion rejected
- promotion paused
- promotion resumed
- promotion terminated
- promotion extended
- promotion completed
- promotion budget/delivery issue
- Give Back settlement where appropriate

### Admin
- new promotion requiring review
- promotion requiring intervention
- suspicious promotion
- payment/delivery issue
- other operational alert

### Participants
Where product rules permit:
- relevant reward/earnings updates
- Give Back settlement

Do not reveal secret reward mechanics merely because a notification exists.

The product can communicate:

> "You received earnings from your activity on Akọ."

without exposing the internal weighting formula unless product/legal requirements require disclosure.

---

# 12. Affiliate Notifications

Audit affiliate forking and persistent attribution.

Potential events:

- affiliate program enabled for Project
- affiliate fork created
- affiliate relationship established
- affiliate sale attributed
- commission pending
- commission settled
- commission reversed
- affiliate program revoked
- creator receives affiliate sale notification
- affiliate receives meaningful sales activity
- payout-related affiliate events

Affiliate notifications must never imply that the affiliate owns the original Project.

---

# 13. Admin Push Notifications

Akọ needs a controlled administrative communication system.

Audit existing Admin pages and infrastructure.

Admin should be able to create product/system notifications such as:

- maintenance announcement
- important product update
- new feature announcement
- service disruption
- scheduled downtime
- policy update
- security notice
- community announcement
- campaign announcement
- operational announcement

Admin should be able to determine:

- audience
- title
- message
- destination/deep link
- delivery timing
- immediate vs scheduled
- in-app only vs push-capable
- whether notification is dismissible
- whether notification should persist
- expiration
- targeting criteria supported by the existing system

Admin messaging must be authorization-protected.

A normal user must never be able to invoke an admin notification path.

---

# 14. Admin Notification Controls

Search the entire Admin area before creating new admin pages.

If an appropriate notification-management section already exists, extend it.

Avoid duplicate admin systems.

Admin controls should be capable of supporting:

- notification creation
- audience selection
- scheduling where appropriate
- cancellation
- preview
- delivery status
- failure visibility
- expiration
- audit trail
- resend where appropriate
- emergency broadcast/kill switch

Any broadcast feature must be rate-limited and abuse-protected.

---

# 15. Notification Types

The architecture should distinguish notification classes.

Suggested conceptual classes:

### Activity
Examples:
- engagement
- follows
- comments
- replies
- mentions

### Messaging
Examples:
- messages
- group activity
- invitations

### Projects
Examples:
- purchases
- updates
- meetings
- courses
- rooms

### Financial
Examples:
- gifts
- wallet
- earnings
- withdrawals
- payouts

### Promotions
Examples:
- review
- approval
- delivery
- settlement

### System
Examples:
- maintenance
- security
- policy
- product announcements

### Social discovery
Examples:
- recommendations or invitations where justified

The exact taxonomy should follow the current product architecture.

---

# 16. Notification Data Model

Audit the current database before adding tables.

A notification record should conceptually contain enough information to support:

- recipient
- notification type
- event identifier
- actor where applicable
- source entity
- source entity type
- destination/deep-link information
- title/body or renderable notification payload
- read/unread state
- created timestamp
- expiration if applicable
- grouping/bundling key
- priority
- delivery channels/status
- metadata required for rendering
- deduplication/idempotency identity

Do not store redundant mutable data unnecessarily.

Where safe, prefer stable entity references and render current entity state rather than duplicating large pieces of content.

However, critical notification/audit records should remain understandable even if the source entity later changes.

Claude must choose the appropriate balance based on the existing architecture.

---

# 17. Event vs Notification

Do not tightly couple every business event to a notification row.

Use a clear conceptual separation:

**Business event**
> Something happened.

**Notification decision**
> Someone should know.

**Delivery**
> Decide how and where to tell them.

This separation makes Akọ easier to scale.

Example:

`comment.created`

may produce:

- notification center item,
- realtime badge update,
- push notification,
- bundled notification,

depending on recipient state and preferences.

---

# 18. Notification Pipeline

Audit whether Akọ needs or already has a pipeline resembling:

```text
Business Event
      ↓
Event Validation
      ↓
Notification Policy
      ↓
Recipient Resolution
      ↓
Preference / Eligibility Check
      ↓
Deduplication
      ↓
Persistence
      ↓
Realtime Delivery
      ↓
Push Delivery
      ↓
Read / Interaction
      ↓
Analytics / Audit
```

Do not force this exact architecture if the existing implementation is stronger.

Claude should preserve or improve the strongest existing architecture.

---

# 19. Backend Must Be the Source of Truth

Notification creation must happen from trusted backend paths for important events.

Do not rely on:

```text
Frontend action → insert notification
```

for authoritative notifications.

Prefer:

```text
Frontend action
      ↓
Backend-authoritative mutation
      ↓
Business event
      ↓
Notification decision
```

Examples:

- successful gift transaction → gift notification
- successful purchase → Project notification
- successful withdrawal request → withdrawal notification
- approved promotion → promotion notification

A malicious client must not be able to manufacture:

- fake gifts,
- fake earnings,
- fake purchases,
- fake admin announcements,
- fake follower notifications,
- fake engagement notifications.

---

# 20. Idempotency

Notification generation must be idempotent.

If the same business event is processed twice, it should not create duplicate notifications unintentionally.

Examples:

- webhook retries
- Edge Function retries
- transaction retries
- realtime reconnects
- queue retries
- scheduled job retries

Use a stable event identity or equivalent idempotency mechanism.

Claude must inspect existing transaction/event IDs before introducing a second identity system.

---

# 21. Duplicate Prevention

The system should defend against duplicate notification creation from:

- frontend and backend both firing
- database triggers plus Edge Functions
- retries
- double-clicks
- repeated webhook delivery
- reconnects
- multiple workers
- scheduled job overlap

One real event should normally produce one logical notification.

Exceptions such as intentional repeated reminders must be explicit.

---

# 22. Read / Unread System

Audit:

- unread count
- mark one as read
- mark all as read
- automatic read behavior
- notification list pagination
- realtime unread count
- synchronization across tabs/devices
- synchronization between web and future native app

Unread state must be server-backed where appropriate.

Do not rely solely on local browser state.

---

# 23. Notification Center

The notification center should support:

- chronological or intelligently grouped activity
- unread state
- clear visual hierarchy
- actor/avatar
- concise event description
- relevant object preview where appropriate
- deep link
- loading state
- empty state
- pagination/infinite loading
- error recovery
- realtime insertion
- read state synchronization

The notification center should feel like a coherent product surface, not a raw database list.

---

# 24. Realtime

Audit Supabase Realtime or the existing realtime architecture.

Notifications that should appear immediately should support realtime behavior.

Examples:

- incoming message indicator
- new engagement
- new follower
- gift received
- important Project update

But realtime must not mean:

> every database change is pushed to every client.

Subscriptions must be scoped securely and efficiently.

---

# 25. Push Notifications

Audit the current web/native readiness.

The architecture should support future native push notifications without requiring a complete redesign.

Potential channels:

- in-app
- web push where supported
- native push
- email where product eventually supports it
- SMS only if explicitly required in the future

Do not assume all channels should be enabled.

Channel delivery should be independent from the core notification event.

---

# 26. Push Token / Device Management

If push notifications are implemented or planned, audit:

- device registration
- token storage
- token rotation
- multiple devices per user
- revoked devices
- logout behavior
- invalid tokens
- provider failures
- duplicate tokens
- notification permissions
- user preferences

A user may have:

- Android phone
- iPhone
- web session
- another logged-in device

The system should understand device-level delivery.

---

# 27. Notification Preferences

Users should have reasonable control over notification noise.

Audit/create preference architecture for categories such as:

- messages
- comments/replies
- follows
- engagement
- Projects
- wallet/financial
- promotions
- system announcements

Critical security/financial notifications may not be fully suppressible.

Preferences should distinguish:

- notification center persistence
- push
- email, if supported

Turning off push should not necessarily delete the underlying notification.

---

# 28. Smart Suppression

Build notification intelligence around user context.

Examples:

### User is currently viewing the chat
Suppress redundant push.

### User has already read the relevant content
Avoid unnecessary push.

### Ten users engage with the same post rapidly
Bundle where appropriate.

### Same person performs repeated low-value actions
Avoid generating ten noisy notifications if product value does not justify them.

### User has muted a conversation
Respect mute settings.

### User blocked the actor
Do not leak activity through notifications.

The exact rules must be derived from the existing product behavior.

---

# 29. Notification Bundling

Support grouping where it improves UX.

Examples:

> "Emeka and 7 others supported your post."

> "5 people commented on your post."

> "3 people started following you."

Bundling should preserve the ability to understand the underlying activity.

Do not bundle events that users reasonably expect individually, especially critical financial/security events.

---

# 30. Notification Priority

Not all notifications are equal.

Conceptual priority levels:

### Critical
- security
- financial failure
- withdrawal/payout state
- account protection

### High
- direct message
- important Project event
- gift

### Normal
- engagement
- follow
- comment

### Low
- recommendation
- informational activity

The actual priority model should be audited rather than blindly hard-coded.

---

# 31. Deep Links

Every notification that represents actionable content should know where it leads.

Examples:

- comment → post/comment
- reply → comment
- message → conversation
- gift → gift/wallet context
- Project purchase → Project
- course update → lesson/module
- meeting reminder → meeting
- promotion review → admin review page
- withdrawal → wallet/withdrawal history

Deep links must be authorization-aware.

A notification must never become a way to bypass:

- private content,
- Project access controls,
- chat permissions,
- admin permissions,
- deleted/private resources.

---

# 32. Deleted / Orphaned Content

Akọ already requires orphan-aware behavior for shared/bookmarked/reposted content.

Apply the same principle to notifications.

If the source content is deleted:

- notification should not crash;
- app should not expose deleted content;
- user may see a subtle unavailable state;
- sensitive deleted content must not remain exposed in notification payloads;
- deep link should safely resolve.

Example:

> "This post is no longer available."

The notification itself may remain for historical context where appropriate.

---

# 33. Privacy & Blocking

Audit interaction between notifications and:

- blocking
- muting
- private accounts
- restricted content
- deleted accounts
- suspended accounts
- removed followers
- chat permissions

If User A blocks User B, B should not be able to continue leaking activity to A through notification paths.

Also inspect the reverse direction.

---

# 34. Security

Treat all notification inputs as hostile.

Verify server-side:

- recipient
- actor
- event
- entity
- notification type
- admin authorization
- destination
- metadata

RLS must prevent:

- reading another user's notifications
- modifying another user's read state
- creating fake notifications
- deleting notifications belonging to another user
- invoking admin broadcast behavior

Service-role operations must remain server-side.

---

# 35. Notification Content Security

Never allow arbitrary user-controlled content to become unsafe notification markup.

Sanitize/escape:

- usernames
- post titles
- Project titles
- comment text
- group names
- admin-entered content

Frontend rendering must not create XSS vulnerabilities.

Push payloads should avoid unnecessary sensitive information.

For example, a lock-screen notification should not expose private financial or private-message content unnecessarily.

---

# 36. Rate Limiting

Notification creation and delivery must be protected from abuse.

Examples:

- malicious user creates thousands of comments
- malicious client attempts notification endpoint spam
- admin accidentally sends enormous broadcast repeatedly
- compromised account triggers excessive messaging
- webhook replay creates notification floods

Rate limiting should exist at the appropriate layers.

---

# 37. Transactional Consistency

Where notification is tied to a critical transaction, audit ordering.

Example:

Gift:

```text
validate gift
→ debit sender
→ credit recipient
→ ledger entry
→ business event
→ notification
```

A notification must not say:

> "You received ₦X"

if the underlying transaction failed.

For critical financial notifications, notification creation should be safely tied to the successful financial state.

If notification delivery fails, the financial transaction must still remain correct.

Notification failure must not corrupt money.

---

# 38. Delivery Failure Handling

A notification may be:

- persisted successfully
- realtime delivery fails
- push delivery fails
- device token invalid
- app offline
- provider unavailable

The notification center should still show the persisted notification once the user returns.

Delivery is not the same thing as existence.

---

# 39. Push Retry Strategy

Audit push provider integration.

Failures should be classified:

- temporary
- permanent
- invalid token
- permission denied
- provider outage
- malformed request

Retry temporary failures appropriately.

Remove or deactivate invalid device tokens.

Do not retry permanently invalid deliveries forever.

---

# 40. Scheduled Notifications

Some events require scheduled delivery.

Examples:

- meeting reminder
- event reminder
- scheduled admin announcement
- Project deadline reminder
- promotion status reminder where justified

Scheduled jobs must be:

- idempotent
- observable
- timezone-aware
- failure-recoverable
- protected from duplicate execution

---

# 41. Timezones

Audit timezone handling.

A user in Nigeria and a user elsewhere should not receive:

> "Your meeting starts in 10 minutes"

based on the wrong timezone.

Store timestamps in a consistent server representation and convert for presentation.

Admin scheduling should make timezone behavior explicit.

---

# 42. Notification Analytics

Create internal observability for:

- notification created
- delivered
- failed
- opened
- clicked
- marked read
- ignored
- push token failure
- bundled
- suppressed
- preference-blocked

Analytics should help answer:

> Are important notifications actually reaching people?

Do not expose internal analytics unnecessarily to users.

---

# 43. Why Was I Notified?

For internal debugging, the system should make it possible to determine:

- what event generated notification
- which rule selected recipient
- which channel was chosen
- whether preferences allowed it
- whether it was suppressed
- whether it was bundled
- whether delivery failed

This should be available to developers/admins without exposing sensitive internals to ordinary users.

---

# 44. Notification Audit Trail

Admin/developer observability should allow investigation of:

> "Why did this user receive this notification?"

and:

> "Why didn't this user receive this notification?"

For critical systems, retain sufficient event identity and processing state.

---

# 45. Admin Broadcast Safety

Admin broadcast is powerful and dangerous.

Require:

- strict admin authorization
- audit log
- clear audience preview
- confirmation for large broadcasts
- rate limiting
- cancellation where technically possible
- delivery metrics
- scheduling safeguards
- content validation

Do not create a "send to everyone" button with no safeguards.

---

# 46. Admin Audience Targeting

Audit existing user segmentation.

Potential audience dimensions:

- all users
- selected users
- user role
- interest/topic
- account type
- Project relationship
- geography where legally/appropriately supported
- active/inactive state
- other existing product segments

Do not build a second segmentation engine if Akọ already has one.

---

# 47. Product Notification Templates

Avoid scattering notification strings throughout the frontend.

Use a coherent notification definition/rendering approach.

For example:

```text
notification_type:
  post_comment

event:
  comment_id

recipient:
  user_id

source:
  post_id

render:
  actor + action + object

destination:
  post/comment route
```

Claude should choose the best implementation based on the current stack.

---

# 48. Localization Readiness

Even if Akọ initially ships in one language, avoid architectures that make localization painful.

Notification content should not require database-wide rewriting when language support is later added.

Keep:

- event meaning
- structured metadata
- presentation text

appropriately separated.

---

# 49. Frontend Performance

Notification UX must remain fast.

Audit:

- unread count query
- notification pagination
- realtime subscriptions
- cache invalidation
- rendering large notification lists
- image/avatar loading
- duplicate fetches
- N+1 queries
- stale state
- mobile performance

Avoid loading the entire notification history just to calculate an unread badge.

---

# 50. Backend Performance

Audit:

- indexes
- notification queries
- recipient filtering
- unread queries
- event processing
- aggregation
- bundling
- scheduled jobs
- push fan-out
- broadcast fan-out

A notification system can become one of the highest-write systems in a social network.

Design for that reality.

---

# 51. Scaling Fan-Out

Do not blindly create millions of notification rows for a single event.

For example, a large admin broadcast may require a different strategy from:

> User A commented on User B's post.

Claude should assess:

- direct per-user notifications
- event-based feeds
- lazy materialization
- batching
- queueing
- fan-out-on-write
- fan-out-on-read
- hybrid approaches

Use the simplest architecture that can safely scale to Akọ's expected growth.

---

# 52. Message Notification Strategy

Messaging can generate extremely high notification volume.

Audit:

- active conversation detection
- unread counts
- notification suppression
- batching
- mute
- group chat
- mentions
- multiple messages
- push behavior
- device handling

The system should make messaging feel alive without becoming irritating.

---

# 53. Engagement Notification Strategy

Engagement should feel rewarding without turning Akọ into a dopamine machine.

Notifications should prioritize:

- meaningful interaction
- replies
- substantial discussion
- meaningful social connection

Do not blindly notify every micro-event if it damages product quality.

Akọ's broader philosophy is:

> What is worth putting in front of this person?

Apply the same philosophy to notifications.

---

# 54. Discovery Notifications

Audit whether notifications can help users discover:

- people relevant to their interests
- Projects
- conversations
- meaningful activity
- recommendations

But do not turn every recommendation into a notification.

Discovery notifications should have a clear reason.

---

# 55. Relationship With Feed

Notification and feed ranking are separate systems but should share event infrastructure where useful.

For example:

```text
Emeka comments on AI post
        ↓
business event
        ├── notification to post owner
        ├── activity signal
        └── feed/social signal
```

Do not implement the same event three separate times.

---

# 56. Relationship With Wallet

Wallet events are authoritative financial events.

Examples:

```text
gift.completed
giveback.settled
affiliate.commission.settled
withdrawal.requested
payout.completed
payout.failed
```

Each may have notification behavior.

The notification system must never become an alternative ledger.

---

# 57. Relationship With Promotion

Promotion events should flow through the same notification architecture.

Example:

```text
promotion.submitted
        ↓
admin review
        ↓
promotion.approved
        ↓
delivery
        ↓
completion
        ↓
reward settlement
```

Each stage should be audited for appropriate notification behavior.

---

# 58. Notification Preferences and Product Philosophy

Do not expose an enormous settings page with dozens of confusing switches.

Start with understandable categories.

Internally, support more granular controls if needed.

The product should feel simple even if the backend is sophisticated.

---

# 59. Notification UI States

Audit every state:

- loading
- empty
- unread
- read
- new realtime item
- deleted source
- blocked actor
- unavailable destination
- failed fetch
- offline
- retry
- pagination end

Do not leave the notification center as an afterthought.

---

# 60. Accessibility

Audit:

- screen-reader labels
- notification badge semantics
- keyboard navigation
- focus management
- color contrast
- motion
- reduced-motion preferences
- meaningful text alternatives

Notification meaning should not depend only on color or animation.

---

# 61. Native App Readiness

The web implementation should not paint Akọ into a corner before native conversion.

Define notification contracts that native clients can consume.

Native should eventually be able to receive:

```text
notification type
event id
actor
entity
destination
payload
priority
timestamp
```

without rebuilding the entire backend.

---

# 62. Cross-Device Consistency

A user may be logged into multiple devices.

Audit:

- read state synchronization
- notification dismissal
- push delivery
- message unread state
- notification badge state
- deep links
- device token lifecycle

Example:

User reads notification on laptop.

Phone should not continue showing an indefinitely stale unread badge.

---

# 63. Offline Behavior

When offline:

- previously loaded notifications remain usable where appropriate;
- notification center can recover when connection returns;
- realtime events should reconcile after reconnect;
- unread counts should not become permanently inconsistent.

Do not trust local optimistic state as permanent truth.

---

# 64. Deleted Account Handling

If an actor deletes/suspends their account:

- notification should not crash;
- actor display should degrade gracefully;
- sensitive information should not leak;
- source content access should obey current authorization.

---

# 65. Notification Lifecycle

Define a lifecycle appropriate to each notification type.

Conceptually:

```text
created
  ↓
eligible
  ↓
persisted
  ↓
delivered
  ↓
read
  ↓
expired/archived
```

Not every notification needs every state.

Critical financial notifications may need stronger retention.

---

# 66. Retention

Audit how long notifications should remain.

Consider:

- storage cost
- user utility
- financial records
- security events
- legal/compliance requirements
- admin announcements
- deleted content

Do not delete critical financial/security history merely because it is old.

---

# 67. Notification Search / Filtering

Not necessarily MVP.

Claude should assess whether Akọ's notification volume will eventually justify:

- filtering
- category tabs
- search
- unread-only
- Project-only
- financial-only

Do not overbuild unless the current product warrants it.

---

# 68. Email Notifications

If email notifications exist or are planned, treat email as another delivery channel.

Do not duplicate business-event logic.

Example:

```text
event
 ↓
notification decision
 ├── in-app
 ├── push
 └── email
```

Channel preferences must be respected.

---

# 69. Security Notifications

Audit important security events:

- new login/device
- password/auth changes
- email changes
- account recovery
- suspicious activity
- sensitive account changes

If the existing authentication system supports these events, notification paths should exist.

Security notifications may have stronger delivery/retention rules than ordinary engagement notifications.

---

# 70. Error Handling

A notification failure should be observable without taking down the underlying feature.

Examples:

- comment succeeds even if push fails
- gift succeeds even if push provider is unavailable
- Project purchase succeeds even if notification delivery is delayed

Persist first where appropriate, then deliver asynchronously.

---

# 71. Testing Strategy

Claude must add or improve tests for:

### Unit
- event → notification mapping
- preference evaluation
- suppression
- bundling
- priority
- deep-link generation
- deduplication

### Integration
- comment → notification
- message → notification
- gift → notification
- purchase → notification
- withdrawal → notification
- promotion → notification
- admin broadcast → notification

### Security
- user cannot read another user's notifications
- user cannot forge notifications
- non-admin cannot broadcast
- blocked users cannot leak notifications
- private resources cannot be opened through notifications

### Reliability
- webhook retry
- duplicate event
- worker retry
- realtime reconnect
- push failure
- invalid token

### Concurrency
- simultaneous engagement
- simultaneous reads
- simultaneous notification processing
- large broadcast

### Frontend
- realtime insertion
- unread badge
- read synchronization
- deep links
- deleted source
- offline/reconnect

---

# 72. Malicious Client Testing

Assume the browser/app is hostile.

Attempt to:

- insert notification rows directly
- change recipient
- change actor
- mark another user's notifications read
- create admin notifications
- alter notification type
- forge financial notification data
- replay events
- trigger notification floods
- bypass blocked-user rules
- open private resources through deep links

All important paths must fail safely.

---

# 73. Observability Dashboard

Admin/developer observability should eventually answer:

- notifications created/minute
- delivery success rate
- push failure rate
- invalid token rate
- unread volume
- read/open rate
- top notification types
- suppression rate
- bundling rate
- failed jobs
- queue backlog if applicable
- broadcast status
- abnormal spikes

Financial/security notifications deserve especially strong monitoring.

---

# 74. Emergency Controls

Audit whether Admin needs:

- global push kill switch
- global non-critical notification kill switch
- notification-type kill switch
- broadcast cancellation
- push-provider disable switch

Do not make financial/security notifications silently disappear through a careless global switch.

Controls should distinguish critical from non-critical communication.

---

# 75. Anti-Spam Philosophy

The objective is not:

> Send more notifications.

The objective is:

> Send the right notification when the user should reasonably know something happened.

Akọ should avoid becoming another app that constantly demands attention.

Notification quality is a product feature.

---

# 76. Innovation Requirement

Claude should not merely reproduce a generic social-media notification system.

After auditing the existing product, identify opportunities to make Akọ's notification system meaningfully better.

Examples worth investigating:

- intelligent bundling
- context-aware suppression
- event-aware notification priority
- relationship-aware notification relevance
- Project lifecycle notifications
- meaningful-conversation notifications
- cross-device synchronization
- notification summaries
- user-controlled quiet periods
- intelligent reminders
- notification explanations
- smart grouping by conversation/Project/topic

Do not implement speculative complexity without evidence.

---

# 77. Quiet Hours

Assess whether users should be able to define quiet periods.

During quiet hours:

- ordinary push notifications may be deferred;
- critical security/financial notifications may still be delivered;
- in-app notifications should remain available.

Timezone handling must be correct.

---

# 78. Notification Digest

Assess whether Akọ should eventually support a digest.

Example:

> "While you were away:
> 4 people supported your post.
> 2 people commented.
> Emeka followed you.
> You received a gift."

This may be especially useful when users generate high notification volume.

Do not force digest behavior on users who prefer realtime activity.

---

# 79. Recommendation Notifications

If recommendation notifications are introduced, they must have a reason.

Bad:

> "You may know Chinedu."

Better:

> "Chinedu is building courses in a topic you follow."

The recommendation should connect to an understandable relevance signal.

---

# 80. Admin Communication vs Product Notifications

Separate:

### Product-generated notification
Triggered by user/system activity.

### Admin communication
Created intentionally by an authorized human/operator.

They may share delivery infrastructure, but their audit trails, permissions, and content workflows should remain distinguishable.

---

# 81. Notification API / Contract

If an internal notification service/function exists or should exist, it should expose a clean contract.

Conceptually:

```text
emitNotificationEvent(event)
resolveRecipients(event)
evaluatePolicy(event, recipient)
createNotification(...)
scheduleDelivery(...)
deliver(...)
```

Claude may choose different names.

The important requirement is that notification logic should not become scattered across dozens of unrelated components.

---

# 82. Avoid Notification Logic in UI Components

Do not do this repeatedly:

```text
onClick:
  perform action
  insert notification
```

The frontend should trigger the actual business action.

The backend should determine whether the resulting event produces a notification.

This prevents:

- fake notifications
- missed notifications from alternate clients
- duplicated notifications
- native/web divergence

---

# 83. Event Coverage Audit

Claude must explicitly identify every meaningful event source in the codebase.

Examples:

- auth
- profiles
- follows
- posts
- comments
- replies
- reactions
- support/disagree/push back
- shares
- reposts
- saves/bookmarks
- mentions
- chats
- groups
- Projects
- purchases
- events
- meetings
- rooms
- courses
- files/media
- gifts
- wallet
- Give Back
- affiliate
- promotions
- withdrawals
- payouts
- admin
- moderation
- security
- system jobs

The final audit must identify:

- covered
- partially covered
- missing
- intentionally silent
- incorrectly implemented

---

# 84. Do Not Over-Notify

For every event, Claude must justify notification behavior.

Use questions such as:

1. Does the recipient reasonably need to know?
2. Does it help them act?
3. Does it strengthen a meaningful relationship?
4. Does it improve discovery?
5. Is it repetitive?
6. Is it already visible elsewhere?
7. Can it be bundled?
8. Is push necessary?
9. Is persistence necessary?

---

# 85. Final Codebase Audit Report

Before finishing, Claude must provide an audit report with:

### Already correct
What the current system already does well.

### Better than this specification
Where current architecture is stronger than the requested baseline.

### Partially implemented
What exists but needs improvement.

### Missing
What does not exist.

### Incorrect
What exists but behaves incorrectly.

### Security risks
Notification-related security problems.

### Reliability risks
Failure/retry/idempotency problems.

### Performance risks
Scaling/query/fan-out problems.

### UX risks
Noise, confusion, missing states.

### Architectural risks
Coupling, duplication, frontend dependence, etc.

### Product opportunities
Innovations worth considering.

---

# 86. Required Implementation Order

Claude should generally work in this order, adjusting when the existing architecture demands it:

1. Audit current codebase.
2. Map business events.
3. Map existing notification infrastructure.
4. Identify gaps.
5. Design/upgrade core notification model.
6. Secure backend creation.
7. Implement event-to-notification pathways.
8. Implement notification center.
9. Implement realtime.
10. Implement unread/read synchronization.
11. Implement push architecture where currently supported.
12. Implement preferences.
13. Implement bundling/suppression.
14. Integrate Projects.
15. Integrate wallet/gifts/payouts.
16. Integrate promotions.
17. Integrate admin broadcasts.
18. Add observability.
19. Add tests.
20. Perform malicious-client/security audit.
21. Perform performance/scalability audit.
22. Perform final end-to-end event coverage audit.

Do not rebuild functioning systems merely because they differ from this document.

---

# 87. Preserve Stronger Existing Infrastructure

If Claude finds that Akọ already has:

- a better event system,
- better realtime architecture,
- better notification schema,
- stronger queueing,
- better push infrastructure,
- better preference handling,
- stronger security,
- better financial event integration,

keep it.

Adapt this specification to the stronger implementation.

Do not downgrade working architecture to match the wording of this document.

---

# 88. Definition of Done

This work is complete only when:

- the existing notification implementation has been fully audited;
- all meaningful business event sources have been mapped;
- notification decisions are backend-authoritative;
- frontend does not manufacture authoritative notifications;
- messages are covered appropriately;
- engagement is covered appropriately;
- comments/replies are covered;
- follows are covered;
- mentions are covered where supported;
- Projects are covered;
- purchases/access/events/meetings/courses/rooms are covered where relevant;
- gifts are covered;
- wallet events are covered;
- Give Back events are covered;
- affiliate events are covered;
- withdrawals/payouts are covered;
- promotions are covered;
- admin push/broadcast notifications are supported where required;
- security events are covered where supported;
- notification preferences exist at an appropriate level;
- notification center is complete;
- unread/read state is reliable;
- realtime behavior is correct;
- push architecture is secure and native-ready where applicable;
- notification delivery failures do not corrupt business transactions;
- duplicate notifications are prevented;
- retry behavior is safe;
- deleted/orphaned content is handled;
- blocking/privacy rules are respected;
- deep links are authorization-safe;
- admin notification controls are secured;
- notification fan-out is scalable;
- notification queries are indexed and performant;
- frontend notification UX is polished;
- mobile/native conversion is not unnecessarily constrained;
- observability exists;
- critical notification paths are tested;
- malicious-client tests pass;
- concurrency/retry tests pass;
- no important event is silently missing without an intentional product decision;
- no notification is being generated merely because a database row changed;
- notification noise is controlled;
- final audit report is produced.

---

# 89. Final Instruction to Claude

**Audit Akọ as it actually exists before changing it.**

Think beyond individual screens and functions.

Trace the system:

```text
User action
   ↓
Frontend
   ↓
Backend mutation
   ↓
Database / business logic
   ↓
Business event
   ↓
Who should know?
   ↓
Notification policy
   ↓
Persistence
   ↓
Realtime
   ↓
Push
   ↓
Notification center
   ↓
Deep link
   ↓
User action
```

Then inspect the reverse failure paths:

```text
What if the event retries?
What if delivery fails?
What if the user is offline?
What if the actor is blocked?
What if the content is deleted?
What if the user is on another device?
What if two workers process the same event?
What if a malicious client calls the endpoint directly?
What if an admin accidentally targets everyone?
What if the system grows 100x?
```

Approach the work as a **systems thinker and innovator**, not as someone filling missing buttons.

The final system should make Akọ feel alive:

- when someone reasons with your idea, you know;
- when someone messages you, you know;
- when someone supports or challenges your contribution, you know;
- when someone buys your Project, you know;
- when someone gifts you, you know;
- when money enters or leaves your wallet, you know;
- when your promotion changes state, you know;
- when Akọ has something important to tell you, you know.

But it should also know when **not** to interrupt you.

**Build the notification system as one coherent platform-wide capability, not a collection of disconnected notifications.**
