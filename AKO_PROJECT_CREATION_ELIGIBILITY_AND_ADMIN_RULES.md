# AKỌ — Project Creation Eligibility, Milestones & Admin-Gated Access Audit Specification

## 1. Purpose

Akọ should allow users to **use, buy, join, view, consume, or participate in Projects broadly**, while making the ability to **create certain Project types** something users earn through meaningful participation and maturity on the platform.

A user may be fully allowed to discover, buy, join, attend, watch, listen to, or discuss a Project without automatically being allowed to create every Project type.

**Creation is gated. Consumption is broadly accessible.**

The system should feel like progression rather than punishment:

> participate → contribute → build trust → unlock more creation capability.

Some eligibility logic already exists in the repository. Some Project types may already have partial gates. Some temporary rules may currently allow everyone to create. **Claude must audit the current implementation first and preserve stronger existing architecture.**

---

## 2. Core Product Rule

### Everyone can use. Not everyone can create everything immediately.

Do not unnecessarily block users from:

- reading
- watching
- listening
- buying
- joining
- attending
- following
- discussing
- saving
- learning

The distinction is specifically between **using a Project** and **creating a Project**.

Creation eligibility can depend on the type, risk, complexity, monetization, and potential reach of the capability.

---

## 3. Audit First — Do Not Blindly Rebuild

Claude MUST inspect the actual repository, database schema, Supabase RPCs, RLS policies, hooks, pages, and existing Admin controls before making changes.

For every existing gate, classify it as:

- Already correct
- Partially correct
- Too permissive
- Too restrictive
- Incorrect
- Duplicated
- Client-only
- Server-only
- Security risk
- Needs product decision
- Can be preserved

If the repository already has a stronger architecture than this specification, **keep the stronger architecture** and adapt the product requirement to it where appropriate.

---

## 4. Existing Page-Creation Requirement

There is already a specific requirement for Page creation.

A user qualifies to create a Page representing an **organization or brand** only if, in the previous 30 days, they have:

1. Created at least **30 posts**, AND
2. Engaged with at least **30 distinct posts**.

This requirement should be audited against the actual schema.

Claude must inspect, at minimum:

- `src/types/database.ts`
- `src/hooks/useReactions.ts`
- `src/hooks/useComments.ts`
- `src/hooks/useBookmarks.ts`
- share/repost hooks and tables if present
- any other relevant engagement tables

before deciding exactly what counts as engagement.

---

## 5. Distinct Engagement Must Be Truly Distinct

If multiple engagement mechanisms are stored in different tables, do not simply add their row counts.

Conceptually:

```sql
SELECT COUNT(DISTINCT post_id)
FROM (
    SELECT post_id FROM <reactions>
    UNION
    SELECT post_id FROM <comments>
    UNION
    SELECT post_id FROM <bookmarks>
    UNION
    SELECT post_id FROM <shares_or_reposts>
) engaged_posts;
```

The actual table and column names MUST come from the repository.

If a user:

```text
likes post A
comments on post A
bookmarks post A
shares post A
```

that should count as **one distinct engaged post** if all those actions qualify.

Claude must explicitly document which actions qualify.

---

## 6. Page Creation RPC

The Page creation boundary must enforce eligibility server-side.

If the repository uses:

```text
public.create_page(...)
```

as a `SECURITY DEFINER` function, Claude should first inspect its current definition using:

```sql
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'create_page'
  AND n.nspname = 'public';
```

If a temporary "anyone can create a page" rule exists, replace only the appropriate eligibility gate.

**Do not touch unrelated logic**, including:

- parent-organization administration checks
- ownership checks
- existing authorization
- existing validation
- transaction behavior
- RLS assumptions

unless the audit discovers an actual security defect that must be addressed.

---

## 7. Clear Eligibility Failures

Users should understand why they are blocked.

Example:

> You need at least 30 posts and 30 distinct engaged posts in the last 30 days to create a Page. You currently have 18 posts and 11 engaged posts.

If only one requirement fails:

> You have enough engagement, but you need 30 posts in the last 30 days. You currently have 22.

Do not expose secret internal fraud/risk formulas.

Do expose meaningful milestone progress.

---

## 8. Creation Is a Capability System

Do not model everything as one boolean:

```text
can_create_projects = true
```

Conceptually, the system should be able to distinguish capabilities such as:

```text
can_create_page
can_create_course
can_create_room
can_create_event
can_create_meeting
can_create_paid_project
```

The actual list MUST match the current repository.

If an existing capability/permission system exists, extend it rather than creating a competing one.

---

## 9. Different Project Types Need Different Gates

Creation should be based on the risk/profile of the capability.

A conceptual matrix:

| Capability | Possible Gate Strength |
|---|---|
| Basic/free Project | Light |
| Meeting | Light–Medium |
| Room | Medium |
| Course | Medium |
| Event | Medium |
| Paid Project | Medium–High |
| Organization/Brand Page | High |
| Higher-impact monetization capabilities | High |

This is not a demand that every type receive these exact gates.

Claude must audit the actual Project model and recommend the smallest sensible rule set.

---

## 10. Realistic Eligibility Signals

Do not make follower count the only qualification.

Claude should evaluate the following possible signals:

### Account age

Example:

- account must be at least X days old.

Useful for preventing throwaway accounts from immediately gaining high-impact creation privileges.

### Posting history

Possible requirements:

- X posts in the last 30 days
- X posts in the last 90 days
- activity across X distinct days
- posts that were not immediately deleted

The goal is sustained participation, not one-day spam.

### Distinct engagement

Possible requirements:

- X distinct posts engaged with
- X discussions participated in
- X meaningful comments/replies

Count distinct posts where appropriate.

### Followers

Possible requirement:

- X followers

But follower count should usually be a supporting signal, not the universal definition of qualification.

### Active days/weeks

Possible requirements:

- X active days
- X active weeks
- sustained activity across multiple weeks

This prevents a user from generating hundreds of actions in a few minutes and immediately looking "mature."

### Profile completion

Where genuinely relevant:

- display name
- profile image
- bio
- creator/category information

Do not require unnecessary personal information.

### Account standing

Potential server-side conditions:

- not suspended
- no serious active restriction
- no relevant unresolved abuse/fraud hold
- no repeated severe spam enforcement

Do not expose internal risk scores.

### Project history

Potential future signals:

- previously created a free Project
- successfully published content
- maintained a Project
- delivered a Project
- hosted a Meeting/Room
- completed a Course

This creates a natural progression:

```text
use Akọ
→ participate
→ create something small
→ demonstrate competence
→ unlock larger capabilities
```

### Project participation

Potential signals:

- joined a Room
- attended a Meeting
- completed a Course
- participated in Project discussions
- purchased a legitimate Project

Do not make spending money the default qualification mechanism.

### Successful transaction history

For high-risk monetization capabilities, existing legitimate transaction history may eventually matter.

Use carefully. A new creator should not be excluded merely because they have never sold before.

---

## 11. Do Not Turn the Gate Into a Spam Machine

A bad rule would teach users:

> "Spam 30 posts and unlock a Page."

Avoid this.

Where possible, combine simple milestones with:

- distinct active days
- account age
- distinct engaged posts
- moderation state
- anti-spam systems
- rate limits

Do not immediately create an opaque "quality score" unless the existing system already has one.

---

## 12. Suggested Progression Model

The platform can conceptually progress users through:

### Stage 0 — Participant

Can broadly:

- browse
- follow
- post
- comment
- react
- save
- join Projects
- purchase Projects

### Stage 1 — Active participant

May unlock selected low-risk/free creation capabilities.

### Stage 2 — Established contributor

May unlock more complex capabilities such as Rooms, Courses, Meetings, or Events depending on Admin configuration.

### Stage 3 — Established creator

May unlock advanced monetized or identity-based capabilities.

### Stage 4 — Advanced capabilities

Future high-impact capabilities may require stronger maturity, good standing, successful Project history, or verification where legitimately necessary.

These stages do **not** require a visible XP/level system.

---

## 13. Gamification Should Be Subtle

The user wants a gamified creation-unlock system.

That does not mean Akọ needs:

- XP
- leaderboards
- streaks
- badges everywhere
- noisy progress animations

The core gamification may simply be:

> **You have not unlocked this yet. Here is what you need to do.**

That is enough to create progression.

---

## 14. Visible Progress

When useful, show progress before the user enters a long creation form.

Example:

```text
CREATE PAGE

Posts
████████░░ 22 / 30

Distinct engaged posts
██████░░░░ 18 / 30

Keep participating to unlock Page creation.
```

The UI should feel like Akọ, not a children's game.

---

## 15. Client-Side Check Is UX Only

Before a user fills out the entire creation form, the frontend should be able to show eligibility/progress.

For example:

> **Page creation isn't unlocked yet.**

Then show the relevant milestones.

But the frontend must NEVER be the authority.

Do not rely on:

```typescript
if (posts >= 30 && engagements >= 30) allowCreate()
```

as the actual security control.

The final creation RPC must independently re-check eligibility.

---

## 16. Structured Eligibility Result

Where practical, expose a structured server result rather than only a string.

Conceptually:

```json
{
  "allowed": false,
  "source": "rules",
  "capability": "create_page",
  "requirements": [
    {
      "key": "posts_30d",
      "required": 30,
      "current": 22,
      "met": false
    },
    {
      "key": "distinct_engaged_posts_30d",
      "required": 30,
      "current": 31,
      "met": true
    }
  ]
}
```

The actual implementation must follow repository conventions.

This lets the frontend display accurate progress without duplicating eligibility logic.

---

## 17. Server-Side Evaluation Flow

Preferred conceptual flow:

```text
User attempts creation
        ↓
Identify capability
        ↓
Load active Admin rule configuration
        ↓
Check authorized Admin override
        ↓
Evaluate server-side eligibility
        ↓
Eligible? ── Yes ──→ Continue creation
    │
    No
    ↓
Return structured failure
```

The client cannot submit:

```text
isEligible = true
postCount = 30
engagementCount = 30
```

and make the server believe it.

---

## 18. Admin-Configurable Rules

Admin must be able to configure creation requirements.

Conceptually:

```text
Capability:
    Create Page

Requirement:
    Posts >= 30

Window:
    Last 30 days

AND

Requirement:
    Distinct engaged posts >= 30

Window:
    Last 30 days
```

The architecture should ideally support:

```text
ALL conditions
ANY condition
```

and, only if genuinely needed:

```text
minimum N of M conditions
```

Do not build an unnecessarily complex generic rules engine if a small structured configuration is sufficient.

---

## 19. Admin-Configurable Inputs

Depending on the capability, Admin may be able to configure:

### Numeric thresholds

- minimum followers
- minimum posts
- minimum distinct engaged posts
- minimum active days
- minimum active weeks
- minimum completed Projects

### Time windows

- last 7 days
- last 30 days
- last 90 days
- account lifetime
- since account creation

### Boolean requirements

- profile complete
- account in good standing
- required setup complete
- other existing platform requirements

### Capability state

- enabled
- disabled
- temporarily disabled
- admin-only
- invite-only
- gated

Use the existing Admin architecture wherever possible.

---

## 20. Admin Rule Auditability

For each capability, Admin should be able to see:

- current rules
- active/inactive status
- recent changes
- who changed them
- when they changed
- optionally how many users are eligible/ineligible

Do not build expensive analytics merely for appearance.

---

## 21. Admin Bypass for Testing

The user intentionally wants Admin to be able to bypass eligibility for selected accounts for testing.

This should exist.

But it must be an **explicit administrative override**, not a hidden backdoor.

Conceptually:

```text
User: test account

Natural eligibility:
FAIL

Admin override:
Create Page = ALLOW

Effective result:
ALLOW
```

The user's actual milestone counts remain unchanged.

---

## 22. Admin Bypass Security

The bypass MUST:

- require genuine Admin authorization
- be enforced server-side
- be impossible for ordinary users to set
- be impossible to activate by manipulating client requests
- be stored explicitly
- be auditable
- identify who granted it
- be revocable
- ideally support expiration

Do not silently convert an override into fake eligibility.

---

## 23. Prefer Scoped Overrides

Avoid a dangerous universal flag such as:

```text
bypass_all_project_rules = true
```

Prefer capability-specific overrides:

```text
bypass_create_page_gate = true
```

or an equivalent structured capability override.

This lets Admin test Page creation without accidentally unlocking every advanced Project capability.

If an existing safe test-mode system already provides this, preserve it.

---

## 24. Optional Override Expiration

Because the bypass exists primarily for testing, consider:

```text
Override expires:
timestamp
```

This prevents forgotten test permissions from becoming permanent production exceptions.

At minimum, support:

- grant time
- granting Admin
- target account
- capability
- current status
- revoke action

---

## 25. Admin Audit Log

Every override should generate an audit record.

Conceptually:

```text
actor_admin_id
target_user_id
capability
action
reason
created_at
expires_at
revoked_at
```

Use the existing Admin/audit system if one exists.

Do not expose internal audit details to ordinary users.

---

## 26. Existing Creators Must Not Be Accidentally Invalidated

Creation eligibility governs **new creation**.

If a user already legitimately owns:

- a Page
- a Course
- a Room
- an Event
- another Project

raising the threshold should not automatically delete or invalidate the existing asset.

New creation attempts can use the new rules.

---

## 27. Admin Rule Changes

When Admin changes a rule, determine whether it applies to:

- future creation attempts
- currently open creation forms
- already-created Projects

Normally:

> rule changes affect future authorization decisions, not existing assets.

Do not silently revoke existing creator rights unless explicitly intended.

---

## 28. Rule Versioning

If the existing Admin architecture supports configuration history, record rule changes.

Example:

```text
Capability: create_page
Old: 20 posts + 20 engagements
New: 30 posts + 30 engagements
Changed by: Admin
Changed at: timestamp
```

This makes production debugging much easier.

---

## 29. Own-Post Engagement Must Be an Explicit Decision

The current Page requirement says:

> engaged with at least 30 distinct posts

It does not fully settle whether engagement with one's own posts counts.

Claude must inspect the current implementation and surface this as a product decision.

For a maturity gate, excluding self-post engagement may be more resistant to farming, but **do not silently change the product requirement**.

---

## 30. Deleted and Moderated Content

Claude must determine how eligibility treats:

- deleted posts
- deleted comments
- moderated/removed content
- spam-removed engagement
- self-deleted content

For trust-building milestones, obviously invalid/abusive activity should not become a permanent unlock mechanism.

Use existing moderation/content-status semantics.

---

## 31. Time Windows

A rule such as:

> 30 posts in the last 30 days

should have an explicit definition.

Normally this means a rolling 30-day window.

Use server/database time.

Do not trust the user's device clock.

---

## 32. Account Age and Sustained Activity

Account age and active days are particularly useful for preventing burst farming.

For example, these are materially different:

```text
300 actions in 20 minutes
```

versus:

```text
meaningful participation across 30 days
```

Akọ should prefer the second pattern for higher-level creation capabilities.

Do not overcomplicate the metric if simple account age + active-day requirements already solve the problem.

---

## 33. Follower Count Is Not Universal Qualification

A writer, teacher, specialist, designer, or new creator may have little following while still being valuable.

Therefore:

> follower count should be one possible signal, not the universal definition of creator qualification.

For Pages/Organizations/Brands it may be useful, but it should be evaluated alongside meaningful participation.

---

## 34. Creation vs Monetization

Consider separating:

```text
Can create
```

from:

```text
Can charge money
```

A user could potentially create a free Course before being allowed to publish a paid Course.

Conceptually:

```text
Create free
→ demonstrate participation
→ build trust
→ unlock paid
```

Only implement this distinction if it fits the current Project architecture.

---

## 35. Page Creation vs Page Identity

Page creation is separate from the existing ability to act as an already-created Page.

Do not let creation eligibility interfere with:

- `switch_active_mode`
- `active_page_id`
- `useActiveIdentity`
- Page ownership
- Page administration
- posting as Page
- existing Page routing

The creation gate applies to the human account attempting to establish the Page.

---

## 36. No Page-Based Self-Qualification

If the user is acting through an existing Page identity, eligibility for creating another Page should not accidentally be calculated from the Page identity.

Unless the product explicitly defines Page-level creation permissions, evaluate the human account's eligibility.

---

## 37. Security Threat Model

Claude must test for:

- direct RPC calls
- manipulated RPC parameters
- fake milestone counts
- fake follower counts
- RLS bypass
- privilege escalation
- Admin override abuse
- stolen Admin session
- concurrent creation
- expired override reuse
- capability crossover
- unauthorized rule changes
- account takeover

---

## 38. Performance

Audit:

- 30-day post counts
- 30-day distinct engagement queries
- indexes
- repeated eligibility checks
- Admin dashboards
- large accounts
- users with very large engagement histories

Do not make every Create screen trigger expensive full-table aggregation if the repository has a scalable alternative.

If optimization is needed, use:

- indexed queries
- cached summaries
- materialized counters
- periodic aggregation

only when justified by actual scale/query plans.

At the creation boundary, stale cache must never become a security bypass.

---

## 39. RLS and SECURITY DEFINER

If eligibility is evaluated in a `SECURITY DEFINER` function:

- use a safe `search_path`
- explicitly authorize the caller
- ensure only the intended user's eligibility is evaluated
- prevent arbitrary user-data extraction
- preserve existing ownership/admin checks
- avoid unsafe dynamic SQL
- verify function grants and ownership

The eligibility system must not become an information-extraction endpoint.

---

## 40. Locked Creation UX

If the user is ineligible, consider showing a discoverable locked capability:

> **Create a Page 🔒**

Tap:

> **Page creation isn't unlocked yet.**

Then show relevant milestones.

This lets users understand that the capability exists and gives them a path toward it.

If the existing UX intentionally hides locked capabilities, preserve that decision.

---

## 41. Connectivity / No Dead Ends

Creation eligibility must work with the broader Akọ connectivity architecture.

A complete flow should be:

```text
Profile / Create
      ↓
Choose Project type
      ↓
Eligibility check
      ↓
Eligible?
   ↙       ↘
 No         Yes
 ↓           ↓
Explain      Creation form
progress     ↓
 ↓           Submit
Exit/return   ↓
             Server eligibility check
                  ↓
             Create Project
                  ↓
             Success
                  ↓
             Project page
                  ↓
             Manage / share / continue
```

No "room without doors."

The locked state itself must have a clear exit.

---

## 42. Admin Testability

Admin should be able to test:

- naturally ineligible
- partially eligible
- naturally eligible
- override allowed
- override revoked
- override expired
- different thresholds

If the repository already has impersonation or test tooling, integrate with it.

Do not create a second parallel testing system unnecessarily.

---

## 43. Boundary Testing

Test exact thresholds:

```text
29 posts → fail
30 posts → pass
31 posts → pass
```

and:

```text
29 distinct engaged posts → fail
30 distinct engaged posts → pass
31 distinct engaged posts → pass
```

Also test:

- exactly at 30-day boundary
- just outside the window
- activity crossing midnight
- deleted content
- duplicate engagement types on one post
- multiple comments on one post
- own-post engagement
- concurrent creation attempts

---

## 44. Engagement Union Testing

If multiple tables contribute engagement, explicitly test:

```text
Like A
Comment A
Bookmark A
Share A
```

Expected:

```text
1 distinct engaged post
```

Then:

```text
Like A
Like B
Comment C
Bookmark D
```

Expected:

```text
4 distinct engaged posts
```

assuming all four actions qualify.

---

## 45. Client UX Testing

Verify:

- users understand why a capability is locked
- progress is accurate
- progress refreshes
- long forms are not shown unnecessarily
- user can leave and return
- no dead-end page
- deep links work
- server denial is rendered gracefully
- Admin override does not expose Admin controls
- server-side result and client progress cannot drift into unsafe authorization

---

## 46. Future Rule Design

The architecture should make it possible to add capabilities such as:

- create Page
- create Course
- create Room
- create Event
- create Meeting
- create paid Project
- publish monetized media
- create advanced organization features

without writing a completely separate permission system each time.

But do not build a giant generic rules engine before the product needs one.

---

## 47. Suggested Initial Product Philosophy

For V1, prefer **small, explainable milestones** over a secret reputation score.

For example:

### Page

Current explicit requirement:

- 30 posts in the last 30 days
- 30 distinct engaged posts in the last 30 days

Potential supporting requirements, only if justified by the existing architecture:

- minimum account age
- good standing

### Other Project types

Use lighter or stronger gates based on:

- risk
- complexity
- monetization
- potential audience impact
- operational burden

Admin controls the actual thresholds.

---

## 48. Do Not Force Every User Through the Same Ladder

A writer, designer, teacher, event organizer, and community builder may use Akọ differently.

The system should ask:

> Has this person demonstrated enough meaningful participation and maturity for this particular capability?

rather than:

> Does this person have enough followers?

This is the deeper rule.

---

## 49. Relationship With Existing Akọ Systems

Eligibility must integrate with existing:

- accounts
- Profiles
- Pages
- Organizations
- Brands
- Posts
- Reactions
- Comments
- Bookmarks
- Shares
- Reposts
- Projects
- Courses
- Rooms
- Meetings
- Events
- Wallet
- Payments
- moderation
- Admin
- analytics where relevant

Inspect these systems before creating duplicate counters, permissions, or trust mechanisms.

---

## 50. Final Audit Report

After repository inspection, Claude must report:

### A. Already implemented correctly

What can remain unchanged.

### B. Partially implemented

What needs completion.

### C. Incorrect

What must be fixed.

### D. Missing

What needs to be added.

### E. Stronger than this specification

What existing implementation should be preserved.

### F. Security risks

Especially client-only gates, RPC authorization, RLS, and Admin bypass.

### G. Performance risks

Especially repeated 30-day aggregation.

### H. Product decisions required

Do not silently decide ambiguous questions such as:

- whether own-post engagement counts
- which engagement types count
- whether followers are required for each capability
- whether account age is required
- whether free and paid creation need separate gates
- which Project types should be considered higher risk

---

## 51. Definition of Done

- [ ] Claude inspected the current repository first.
- [ ] Claude inspected the actual Project types.
- [ ] Claude inspected existing creation permissions.
- [ ] Claude inspected existing Admin configuration.
- [ ] Claude inspected the current `create_page` RPC.
- [ ] Temporary open Page creation is removed where appropriate.
- [ ] Page eligibility is enforced server-side.
- [ ] The 30-post / 30-distinct-engagement Page requirement is correctly represented unless an existing stronger implementation should be preserved.
- [ ] Engagement sources were verified against the actual schema.
- [ ] Distinct-post counting properly deduplicates multiple engagement types.
- [ ] Own-post engagement behavior is explicitly decided.
- [ ] Time-window behavior is explicit.
- [ ] Deleted/moderated content behavior is explicit.
- [ ] Client-side progress exists where useful.
- [ ] Client-side progress is not treated as authorization.
- [ ] Final server-side eligibility is rechecked at creation.
- [ ] Different Project capabilities can have different rules.
- [ ] Admin can configure applicable rules.
- [ ] Admin rule changes are authorized.
- [ ] Admin rule changes are auditable.
- [ ] Admin bypass exists only through authorized server-side controls.
- [ ] Bypass can be scoped to a capability where practical.
- [ ] Bypass does not alter natural eligibility metrics.
- [ ] Bypass can be revoked.
- [ ] Expiry is supported if practical.
- [ ] Missing/corrupt configuration does not accidentally make sensitive creation capabilities public.
- [ ] Milestones cannot be trivially farmed through obvious spam.
- [ ] Direct RPC calls cannot bypass the gate.
- [ ] Client-tampered milestone values cannot bypass the gate.
- [ ] Concurrent requests cannot bypass the gate.
- [ ] Existing Page parent/admin authorization remains intact.
- [ ] Existing Page identity behavior remains intact.
- [ ] Existing stronger architecture is preserved.
- [ ] No unnecessary duplicate permission system was introduced.
- [ ] Eligibility queries are performant.
- [ ] Appropriate indexes exist.
- [ ] Boundary cases are tested.
- [ ] Admin testing/bypass flows work.
- [ ] Locked UX has a clear exit.
- [ ] Eligible users can proceed end-to-end.
- [ ] Ineligible users understand what they need to do.
- [ ] Existing users/projects are not accidentally invalidated by new thresholds.
- [ ] Production observability is sufficient to diagnose eligibility decisions.
- [ ] Final audit report distinguishes implemented, missing, incorrect, stronger, security-risk, performance-risk, and product-decision areas.

---

## 52. Final Instruction to Claude

Do not treat this document as a blind implementation checklist.

Treat it as an **audit-and-upgrade specification**.

First understand what Akọ already has.

Then answer:

> What is already good?

> What is already better than this document?

> What is incomplete?

> What is insecure?

> What is too permissive?

> What is too restrictive?

> What should be configurable by Admin?

> What should remain a product decision?

> What is the smallest architecture that can support this cleanly?

Then implement only the changes justified by that audit.

The core product rule is:

> **Everyone can participate. Creation is earned progressively.**

The core engineering rule is:

> **The client can explain eligibility. The server decides eligibility.**

The Admin testing rule is:

> **Bypass is a controlled override, never a backdoor.**

Akọ should make users feel that they are growing into the ability to build—not that the platform is arbitrarily withholding features.
