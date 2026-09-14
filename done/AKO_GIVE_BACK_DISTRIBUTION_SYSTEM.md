# AKỌ — GIVE BACK DISTRIBUTION SYSTEM
## Promotion-Based Engagement Rewards & Daily Participant Settlement

**Document type:** Product + Engineering Audit-and-Upgrade Specification  
**Status:** Authoritative product clarification  
**Primary instruction:** Audit the existing Akọ repository first. Preserve stronger existing architecture. Do not rebuild blindly.

---

## 1. Purpose

Give Back is Akọ's mechanism for distributing an **Admin-defined pool of money attached to an approved promotion** among users whose meaningful engagement contributes to the promoted post's activity, discovery, distribution, or conversation.

The system must:

- let Admin decide the Give Back amount for each approved promotion;
- identify qualifying participant activity;
- calculate hidden contribution points;
- prevent repeated reward participation on the same promoted post after the user's reward-eligible day;
- distribute the allocated pool proportionally;
- credit resulting amounts through the authoritative wallet/ledger;
- prevent manipulation, duplicate rewards, self-farming, and coordinated farming;
- maintain a complete audit trail.

The objective is **not** to pay users simply for tapping buttons. It is to share economic value with people whose meaningful participation helps a promoted idea travel and generate activity.

---

## 2. The 50% Rule Is Conceptual Only

Any previous statement that **50% of advertising money goes to users** is a conceptual policy direction, not an implementation rule.

Do **not** hard-code:

- 50%;
- a fixed advertising-revenue percentage;
- a global revenue-to-user formula.

### Current authoritative behavior

**Admin decides what goes into Give Back for each promotion that Admin approves.**

Therefore:

```text
Promotion submitted
    ↓
Admin reviews
    ↓
Admin approves
    ↓
Admin sets Give Back amount
    ↓
Promotion runs
    ↓
Qualifying engagement accumulates
    ↓
Daily points are calculated
    ↓
Give Back pool is distributed
    ↓
Wallets are credited
```

The reward engine must therefore support promotion-specific Give Back amounts.

---

## 3. Core Product Principle

Internally, Give Back should be understood as:

> **A reward pool shared among participants whose meaningful engagement contributes to a promoted post.**

It should **not** be designed as:

> "Perform an action and receive a guaranteed amount of money."

The system should distinguish:

```text
an interaction happened
```

from:

```text
the interaction qualifies as meaningful contribution
```

---

## 4. Terminology

### Promotion
An approved paid/promoted distribution campaign.

### Promoted Post
The post associated with the promotion.

### Give Back Pool
The amount Admin allocates for Give Back for the applicable promotion/reward period.

### Give Back Participant
A user who performs qualifying activity and becomes eligible for the Give Back calculation.

### Contribution Event
A validated action or downstream engagement event that may contribute points.

### Contribution Points
Hidden internal points representing relative contribution.

### Eligible Points
Contribution points remaining after validation, eligibility, duplicate, moderation, and fraud rules.

### Daily Settlement
The backend calculation and distribution process performed at the end of the applicable reward day.

---

## 5. Distribution Formula

The core distribution function is:

```text
User Share =
(User Eligible Points / Total Eligible Points)
× Give Back Pool
```

Example:

```text
Give Back Pool = $100

User A = 10 points
User B = 25 points
User C = 40 points
User D = 25 points

Total = 100 points
```

Result:

```text
A = $10
B = $25
C = $40
D = $25
```

Users do **not** see the points.

The calculation must happen server-side.

The client must never be trusted to submit or determine:

- points;
- reward amount;
- share percentage;
- eligibility;
- reward date;
- participant identity for another user;
- wallet credit.

---

## 6. Give Back Participation Is Per Promoted Post

The reward relationship should be modeled around:

```text
promotion
+
promoted post
+
participant
+
reward-eligible day
```

The implementation must maintain a reliable relationship between:

```text
promotion_id
post_id
user_id
reward_date
```

and enforce uniqueness/idempotency.

---

## 7. Clarified Daily Participation Rule

The authoritative product rule is:

> **If a user engages in a sponsored/promoted post for a day, subsequent days of engagement on that same post earn no Give Back points for that user.**

Interpret this as a **one-time reward-eligible participation period per user per promoted post**, unless the product owner explicitly changes the rule.

Example:

```text
Day 1:
User A qualifies → earns points.

Day 2:
User A interacts normally → no new Give Back points.

Day 3:
User A interacts normally → no new Give Back points.
```

The user is not blocked from interacting later. The restriction applies only to Give Back eligibility.

---

## 8. Establishing the Reward-Eligible Day

The server should establish the participant's first valid reward-eligible day.

Conceptually:

```text
first qualifying event
        ↓
participant becomes eligible
        ↓
reward_date is established
        ↓
qualifying contribution accumulates for that post/day
        ↓
future days produce no Give Back points for that participant/post
```

The client cannot set or alter `reward_date`.

---

## 9. What Can Contribute

Potential contribution sources include:

- Like;
- Dislike, if retained as a meaningful signal;
- Share;
- Repost;
- Save;
- Comment;
- Reply;
- engagement attracted by a user's comment;
- other validated actions that materially contribute to the post's activity/discovery/distribution.

These are **candidate contribution categories**, not instructions to invent nonexistent signals.

First inspect the existing Akọ engagement model and feed algorithm.

---

## 10. Contribution Must Align With the Algorithm

Akọ's Give Back engine should connect to real product signals.

Audit:

```text
User action
    ↓
validated engagement
    ↓
algorithmic signal
    ↓
post activity/distribution
    ↓
Give Back contribution
```

Do not claim that an action "boosted the algorithm" if that action does not actually participate in Akọ's ranking/distribution logic.

The principle is:

> **Reward actions that meaningfully contribute to the promoted post's activity and ability to travel.**

---

## 11. Different Actions Can Have Different Value

The system should support hidden relative contribution values.

Conceptually:

```text
Like       → contribution
Save       → stronger contribution
Share      → stronger contribution
Repost     → stronger contribution
Comment    → stronger contribution
Comment engagement → additional contribution
```

The exact numbers must **not** be hard-coded from this document.

They should be:

- server-side;
- configurable where appropriate;
- auditable;
- versioned;
- resistant to farming;
- hidden from ordinary users.

---

## 12. Comments Carry More Weight

Comments can carry more weight because they can create conversation around the promoted post.

But:

> **A comment should not automatically receive maximum value merely because it exists.**

A comment that attracts meaningful engagement can be more valuable than an isolated comment.

Example:

```text
User A comments.
    ↓
User B replies.
    ↓
User C likes the comment.
    ↓
User D shares the post after reading the discussion.
```

This represents a richer contribution chain than:

```text
User A comments.
Nobody interacts with it.
```

---

## 13. Comment Downstream Engagement

The reward engine should be capable of recognizing meaningful activity attracted by a user's contribution.

Possible signals:

- likes on comment;
- replies;
- meaningful replies;
- shares;
- reposts;
- saves;
- other supported downstream activity.

Avoid recursive or unlimited multiplication.

A downstream event must have a defined attribution path.

---

## 14. Avoid Double Counting

The same underlying event must not generate multiple reward records simply because it appears in several analytics layers.

For example:

```text
one share event
```

must not accidentally become:

```text
share point
+
algorithm point
+
analytics point
+
engagement point
```

unless the product explicitly defines those as separate economic contributions.

The contribution engine needs a clear source-of-truth event model.

---

## 15. Unique Actions

A participant can earn additional contribution from unique qualifying actions.

Example:

```text
Comment
+
Share
+
Save
+
Repost
```

may each contribute according to their validated value.

But repeated toggling must not farm points:

```text
like
→ unlike
→ like
→ unlike
→ like
```

Likewise:

```text
share
→ delete
→ share
→ delete
→ share
```

must not create unlimited reward events.

Use unique event IDs, state transitions, idempotency keys, and/or existing engagement constraints.

---

## 16. Contribution Is Event-Based, Not Client-Point-Based

The client submits authenticated actions.

The server determines:

```text
Was the action valid?
Was the user eligible?
Is it unique?
Was it already processed?
Does it qualify?
What contribution does it produce?
Did it generate downstream value?
```

Only then should an internal contribution record exist.

The client should never maintain authoritative points.

---

## 17. No Reward for Mere Impression

Seeing a promoted post does not automatically make a user a Give Back participant.

Therefore:

```text
impression ≠ reward
```

unless a future product decision explicitly adds an impression-based reward.

---

## 18. No Equal-Split Model

Give Back is not:

```text
$100 / number of participants
```

It is proportional:

```text
participant contribution
÷
total participant contribution
×
pool
```

Therefore, participants can receive different amounts.

---

## 19. No Guaranteed Minimum

Do not promise:

```text
$0.01 per like
$0.10 per share
$1 per comment
```

or any fixed amount.

The final result depends on:

- Admin's Give Back pool;
- eligible participants;
- total eligible points;
- each participant's contribution;
- fraud/quality filtering;
- financial rounding.

---

## 20. Users Must Not See Points

Users should not see:

- exact contribution points;
- point weights;
- participant rankings;
- total points;
- exact formula;
- contribution value of individual actions;
- reward probability;
- hidden reward-bearing status if that is part of the product strategy.

The user experience can simply reveal the resulting wallet/earnings credit.

---

## 21. Do Not Create a Farming Signal

Do not display UI such as:

```text
Like this to earn money.
```

```text
Share this for 5 points.
```

```text
Your comment earned 12 points.
```

```text
This post has Give Back.
```

if the intended product behavior is to keep reward mechanics and reward-bearing status hidden.

The user should interact naturally.

---

## 22. Legal Advertising Disclosure

Keeping the Give Back mechanics private does **not** mean legally required advertising disclosures can be hidden.

If applicable law or platform policy requires a sponsored/promoted post to be identified, that disclosure must remain.

The secret should be:

```text
how reward value is calculated
```

not:

```text
legally required advertising information
```

---

## 23. Give Back Pool

The Admin-approved amount is authoritative.

Do not derive it from:

- client input;
- user engagement;
- impressions;
- frontend state;
- a hard-coded 50% rule.

If a future revenue-sharing policy exists, it should feed the same Give Back pool architecture rather than replacing it.

---

## 24. Recommended Conceptual Data Model

**Audit existing schema first. Do not create duplicates unnecessarily.**

Potential structures:

### `promotions`

```text
id
post_id
status
give_back_amount
give_back_currency
approved_at
starts_at
ends_at
...
```

### `give_back_participants`

```text
id
promotion_id
post_id
user_id
reward_date
first_eligible_at
eligible_points
status
created_at
updated_at
```

If the product rule is one reward period per promoted post:

```text
UNIQUE(promotion_id, post_id, user_id)
```

### `give_back_contribution_events`

```text
id
promotion_id
post_id
user_id
source_type
source_id
event_type
contribution_value
event_date
qualifies
created_at
```

### `give_back_daily_settlements`

```text
id
promotion_id
post_id
settlement_date
give_back_pool
total_eligible_points
participant_count
status
calculated_at
completed_at
```

### `give_back_distributions`

```text
id
settlement_id
promotion_id
post_id
user_id
eligible_points
total_eligible_points
allocated_amount
wallet_transaction_id
status
created_at
```

These are conceptual only. Reuse stronger existing architecture.

---

## 25. Daily Settlement

At the end of the reward day:

```text
1. Finalize the eligible event window.
2. Resolve qualifying contribution events.
3. Resolve supported downstream engagement.
4. Remove invalid/duplicate/fraudulent events.
5. Calculate participant points.
6. Calculate total eligible points.
7. Load authoritative Give Back pool.
8. Calculate proportional allocations.
9. Apply deterministic monetary rounding.
10. Create wallet ledger credits.
11. Mark the settlement complete.
12. Make the result idempotent.
```

---

## 26. Zero Participants

If:

```text
total eligible points = 0
```

the system must not divide by zero.

The pool must enter an explicit accounting state such as:

```text
UNALLOCATED
```

or another deliberately defined policy.

Do not:

- randomly distribute it;
- silently destroy it;
- silently credit the promoter;
- fabricate a participant.

---

## 27. Money Precision

Use the existing authoritative financial representation.

Prefer:

- integer minor units where appropriate;
- decimal-safe arithmetic;
- deterministic rounding;
- controlled rounding boundaries.

Never use unsafe floating-point arithmetic for final wallet credits.

---

## 28. Remainder Handling

Proportional distribution can produce fractions smaller than the wallet's monetary precision.

Define a deterministic remainder policy.

At settlement:

```text
pool
=
sum of participant allocations
+
approved remainder handling
```

No unexplained missing money.

No unexplained created money.

---

## 29. Wallet Integration

Give Back must use Akọ's existing authoritative wallet/ledger.

Do not create a second balance.

Conceptually:

```text
Give Back settlement
        ↓
distribution record
        ↓
wallet ledger transaction
        ↓
available balance
```

Every credit must be traceable to:

```text
promotion
post
settlement date
participant
eligible points
allocated amount
```

---

## 30. No Direct Client Credit

The client must never be able to submit:

```text
creditWallet(amount)
```

or an equivalent Give Back credit request.

The backend creates the authoritative wallet transaction.

---

## 31. Idempotent Settlement

If the settlement worker runs twice:

```text
Run 1 → settles
Run 2 → detects existing settlement
```

Run 2 must not pay again.

Use:

- unique settlement IDs;
- unique distribution IDs;
- idempotency keys;
- database constraints;
- atomic state transitions;
- existing ledger safeguards.

---

## 32. Partial Failure

If 900 of 1,000 participant credits succeed and the process fails:

The system must know exactly which 900 were already credited.

A retry should process only the remaining valid distributions.

Never blindly rerun the entire payout.

---

## 33. Concurrency

Test:

- two identical engagement events arriving simultaneously;
- engagement arriving during settlement;
- two settlement workers starting simultaneously;
- duplicate event delivery;
- Admin changing promotion state while settlement runs.

The final accounting state must remain correct.

---

## 34. Anti-Farming

Give Back must not incentivize:

- spam comments;
- indiscriminate likes;
- repeated shares;
- artificial reposts;
- rage bait;
- harassment;
- coordinated engagement;
- bot activity;
- self-engagement.

Use the strongest existing Akọ anti-abuse infrastructure.

Possible controls include:

- velocity limits;
- duplicate detection;
- diminishing returns;
- account quality;
- session quality;
- device signals;
- coordinated-account detection;
- self-interaction exclusion;
- suspicious cluster detection.

Do not over-engineer if existing systems already solve these problems.

---

## 35. Self-Engagement

Audit and prevent reward farming through:

- self-like;
- self-comment;
- self-reply;
- self-share;
- self-save;
- self-repost;
- alternate accounts;
- creator-controlled accounts.

The client must not be able to bypass these rules.

---

## 36. Coordinated Engagement

The system should detect obvious coordinated extraction.

Example:

```text
10 accounts
→ repeatedly interact with one another
→ target the same promoted posts
→ manufacture engagement
→ extract Give Back
```

Suspicious events should be invalidatable without necessarily assuming that every associated account must immediately be banned.

Use proportionate abuse handling.

---

## 37. Moderation and Reversals

Before settlement, invalid activity should be removed from eligible contribution.

After settlement, a correction must use a controlled reversal/adjustment transaction.

Do not silently edit historical financial records.

Prefer:

```text
original transaction
+
reversal/adjustment
```

rather than mutating history.

---

## 38. Reward Configuration Versioning

If contribution weights are configurable, record a configuration/version identifier with the settlement.

This ensures:

```text
Yesterday's settlement
```

can still be reconstructed even if Admin changes weights tomorrow.

---

## 39. Promotion Configuration Snapshot

Settlement should reference the authoritative promotion configuration applicable to that reward period.

Do not calculate historical money using mutable frontend state.

---

## 40. Admin Experience

Give Back belongs inside the existing Promotion Review/Admin architecture.

Do not create a duplicate Admin system.

During review, Admin should be able to see/set appropriate promotion controls, including:

```text
Promotion
Post
Targeting
Budget
Duration
Review status
Give Back amount
```

The exact UI must be audited against the existing Admin pages.

---

## 41. Admin Contribution Weights

Where supported by the current product architecture, Admin may configure relative contribution weights for categories such as:

```text
Like
Dislike
Save
Share
Repost
Comment
Comment engagement
Reply
Other validated contribution
```

Do not create a configuration UI for signals that do not actually exist.

---

## 42. Hidden Weight Configuration

Exact weights remain internal.

Example conceptual configuration:

```text
LIKE = hidden value
SAVE = hidden value
SHARE = hidden value
REPOST = hidden value
COMMENT = hidden value
COMMENT_ENGAGEMENT = hidden value
```

These numbers are deliberately not specified here.

Claude must inspect existing implementation and determine sensible architecture.

---

## 43. Negative Signals

If the product uses negative engagement signals, do not automatically make every negative signal reduce a user's wallet earnings.

First determine whether the signal should:

- affect contribution;
- affect post ranking;
- affect reward eligibility;
- have no economic effect.

If negative points are used, define:

- whether participant points can go below zero;
- whether negative points only reduce that day's contribution;
- whether money can ever be clawed back before settlement;
- reversal rules;
- abuse protections.

Do not allow an accidental negative-value bug to create negative wallet balances.

---

## 44. Reward Caps

Consider whether a single participant should be able to consume an unreasonable percentage of a pool.

If caps are introduced, they must be:

- server-side;
- configurable;
- auditable;
- consistently applied;
- difficult to circumvent.

Do not introduce arbitrary caps without analyzing real engagement distributions.

---

## 45. Participant Concentration Monitoring

Monitor cases where one participant receives an unusually large share of a Give Back pool.

A large share is not automatically fraudulent.

It should instead be an internal monitoring signal.

---

## 46. Give Back Kill Switch

Admin should have a server-enforced emergency mechanism to disable Give Back distribution if an exploit is discovered.

It must be:

- restricted to authorized Admins;
- auditable;
- server-side;
- reversible;
- explicit about active/unsettled promotions;
- incapable of deleting historical accounting.

---

## 47. Promotion Pause and Termination

If a promotion pauses:

- no new eligible activity should accrue while inactive;
- already-settled rewards remain settled;
- resume behavior must be explicit.

If a promotion terminates:

- future activity stops qualifying;
- settled days remain settled;
- unsettled activity follows explicit policy;
- accounting history is preserved.

---

## 48. Give Back Amount Changes

Do not casually alter an already-settled pool.

Any Admin change must be:

- authorized;
- server-side;
- auditable;
- reflected in accounting;
- protected against retroactive manipulation.

---

## 49. Blocked/Restricted Accounts

Audit how Give Back interacts with:

- blocked accounts;
- suspended accounts;
- deleted accounts;
- restricted accounts;
- moderated accounts.

Normal safety and access rules must remain authoritative.

---

## 50. Give Back Does Not Create Social Relationships

Give Back must not:

- follow a user;
- create a follower relationship;
- create a chat;
- unlock private content;
- change the social graph.

It is an economic distribution mechanism.

---

## 51. Relationship With the Feed Algorithm

The responsibilities remain separate:

```text
Feed algorithm → decides distribution
Give Back → economically allocates a reward pool
```

They can share validated signals.

Give Back should not become a replacement feed-ranking engine.

---

## 52. Give Back Does Not Guarantee Distribution

A qualifying contribution can earn reward value without guaranteeing:

```text
a specific number of impressions
```

or a deterministic algorithmic boost.

Give Back rewards qualifying contribution signals; it does not promise a particular distribution outcome.

---

## 53. Multi-Day Promotions

The product clarification establishes that:

- points are calculated at the end of the day;
- the allocated Give Back amount is shared among that day's eligible participants;
- a participant who has already had a reward-eligible day for the same promoted post receives no new Give Back points on subsequent days.

The implementation must explicitly model the relationship between:

```text
promotion-level Give Back configuration
```

and:

```text
daily settlement pool
```

Do not silently assume whether an Admin-entered amount is:

- a daily pool;
- a total campaign pool;
- another defined accounting unit.

The Admin UI and database model must make this explicit.

---

## 54. Strong Recommended Interpretation

For the current clarified behavior, target:

```text
ONE reward-eligible participation period
PER user
PER promoted post
```

not:

```text
one reward every day for the same user/post
```

unless the product owner explicitly changes the rule.

---

## 55. Internal Explainability

Even though users do not see points, Admin/support/engineering must be able to answer:

> Why did this participant receive this amount?

The system should reconstruct:

```text
participant
→ qualifying events
→ eligible points
→ total eligible points
→ Give Back pool
→ calculated allocation
→ wallet transaction
```

---

## 56. Settlement Snapshot

At settlement time, preserve enough information to reproduce the calculation.

Do not depend on today's mutable configuration to explain yesterday's payout.

Store or reference:

- settlement date;
- promotion;
- post;
- Give Back pool;
- configuration version;
- participant points;
- total points;
- allocations;
- wallet transaction IDs;
- settlement status.

---

## 57. Internal Admin Reporting

Admin should be able to inspect:

```text
Promotion
→ Give Back pool
→ eligible participant count
→ total eligible points
→ distribution total
→ remainder
→ settlement status
→ failed distributions
→ reversals
```

This should integrate into existing Admin pages.

---

## 58. User Wallet Presentation

A successful credit can appear as a simple wallet/earnings entry such as:

```text
Give Back
```

or:

```text
Give Back — Promotion
```

The user does not need the hidden point calculation.

The purpose is clarity about the **money received**, not exposure of the secret reward engine.

---

## 59. Notifications

If the existing notification architecture supports wallet/earnings notifications, a Give Back credit may generate a simple notification.

Example:

```text
You received a Give Back reward.
```

Do not expose the hidden point mechanics.

---

## 60. Analytics

Track internally:

- promotion impressions;
- eligible participants;
- contribution events;
- eligible points;
- invalidated events;
- fraud-filtered events;
- total eligible points;
- Give Back pool;
- distributions;
- total distributed;
- remainder;
- failed credits;
- reversals.

Do not expose internal analytics to ordinary users.

---

## 61. Performance

Give Back must not make Feed or Comments slow.

Prefer:

```text
engagement event
→ lightweight validation/record
→ asynchronous aggregation
→ daily settlement
```

rather than recalculating the entire reward pool synchronously on every tap.

Use existing infrastructure if it is stronger.

---

## 62. Financial Source of Truth

Caches, counters, analytics tables, and frontend state must never become the final financial source of truth.

Final settlement must use authoritative records.

---

## 63. No Fake Reward State

Do not animate a fake point counter or display fake money while the backend is still determining eligibility.

If money is displayed as earned, the backend must have an authoritative corresponding state.

---

## 64. Time-on-App Interaction

A previous Akọ concept discussed verified meaningful time as a quality/context multiplier.

If that concept remains in the product, keep it architecturally separate from the core Give Back contribution-event model.

Possible future model:

```text
validated contribution points
×
verified meaningful-time factor
=
reward-eligible points
```

Do not implement this automatically unless the current product explicitly requires it.

The clarified core Give Back model is:

```text
meaningful contribution
→ hidden points
→ proportional distribution
```

---

## 65. V1 vs Future

Do not over-engineer the first version.

### V1

Implement:

```text
validated contribution categories
+
hidden points
+
one reward-eligible period per user/post
+
daily calculation
+
proportional distribution
+
wallet ledger credit
+
idempotency
+
basic anti-farming
```

### V2

Add stronger downstream engagement attribution.

### V3+

Introduce more sophisticated quality/value models using real production data.

The underlying architecture should support evolution without rebuilding the wallet.

---

## 66. Test Matrix

### Basic distribution

- one participant;
- two participants;
- many participants;
- equal points;
- unequal points.

### Contribution events

- like;
- dislike;
- save;
- share;
- repost;
- comment;
- reply;
- comment engagement.

### Uniqueness

- repeated like;
- unlike/re-like;
- repeated share;
- repeated repost;
- duplicate API request;
- duplicate event delivery.

### Daily rule

- user qualifies Day 1;
- user interacts Day 2;
- no Give Back points Day 2;
- normal social interaction still works Day 2;
- user cannot reset reward eligibility by deleting/recreating engagement.

### Financial

- tiny pool;
- large pool;
- fractional shares;
- rounding;
- remainder;
- zero participants;
- failed wallet credit;
- retry.

### Security

- forged points;
- forged amount;
- forged participant;
- forged promotion;
- unauthorized Admin;
- replayed event.

### Concurrency

- simultaneous engagement;
- simultaneous settlement;
- engagement during settlement;
- duplicate worker execution.

### Abuse

- self-engagement;
- bot-like bursts;
- coordinated accounts;
- reciprocal farming;
- repeated account clusters.

---

## 67. Example End-to-End Scenario

Promotion:

```text
Promoted Post = Post #123
Admin Give Back = $100
```

User A:

```text
Like
Comment
Comment attracts genuine replies
```

→ 30 eligible points.

User B:

```text
Share
Save
```

→ 20 eligible points.

User C:

```text
Like
```

→ 5 eligible points.

User D:

```text
Comment
No downstream engagement
```

→ 10 eligible points.

Total:

```text
65 points
```

Distribution:

```text
A = 30 / 65 × $100
B = 20 / 65 × $100
C = 5 / 65 × $100
D = 10 / 65 × $100
```

The point values remain hidden from users.

---

## 68. Example of the Daily Rule

Promotion runs for three days.

User A qualifies on Day 1:

```text
Day 1 → qualifying activity → points
Day 2 → normal interaction → 0 Give Back points
Day 3 → normal interaction → 0 Give Back points
```

User B first qualifies on Day 2:

```text
Day 1 → no reward participation
Day 2 → qualifying activity → points
Day 3 → normal interaction → 0 Give Back points
```

The server enforces this.

---

## 69. Security Audit Requirements

Attempt to manipulate:

```text
points
reward amount
promotion ID
user ID
event type
reward date
wallet amount
settlement status
```

through direct API calls.

Verify that all financial and eligibility decisions remain server-authoritative.

Test:

- RLS;
- RPC permissions;
- Edge Functions;
- service-role boundaries;
- authentication;
- authorization;
- replay protection;
- idempotency;
- concurrency;
- ledger integrity.

---

## 70. Repository Audit Requirements

Before changing code, Claude must inspect:

- promotion implementation;
- Admin review;
- promotion state machine;
- Feed ranking;
- reactions;
- comments;
- comment replies;
- saves;
- shares;
- reposts;
- engagement tables;
- wallet;
- ledger;
- existing reward systems;
- Supabase functions/RPCs;
- scheduled jobs;
- RLS;
- fraud/abuse systems;
- notifications;
- analytics.

Do not build parallel versions of existing functionality.

---

## 71. Preserve Stronger Architecture

If the repository already contains:

- a stronger wallet ledger;
- stronger idempotency;
- stronger RLS;
- an existing reward engine;
- a better promotion state machine;
- existing settlement infrastructure;

preserve it.

This document defines **product behavior**, not permission to replace good infrastructure.

---

## 72. Definition of Done

- [ ] The conceptual 50% rule is NOT hard-coded.
- [ ] Admin controls the Give Back amount for approved promotions.
- [ ] Give Back amount is server-authoritative.
- [ ] Users become participants through qualifying contribution.
- [ ] Contribution events are validated server-side.
- [ ] Different actions can have different hidden contribution values.
- [ ] Comments can carry greater weight.
- [ ] Downstream comment engagement can contribute where supported.
- [ ] Repeated identical actions cannot farm unlimited points.
- [ ] Users cannot manipulate points.
- [ ] Users cannot manipulate reward amounts.
- [ ] Users cannot manipulate reward dates.
- [ ] One reward-eligible period per user/promoted post is enforced.
- [ ] Subsequent-day interaction does not create additional Give Back points for that user/post.
- [ ] Normal social interaction remains available.
- [ ] Points remain hidden.
- [ ] Exact weights remain hidden.
- [ ] Daily settlement exists.
- [ ] Give Back is distributed proportionally.
- [ ] Zero-point settlements are handled explicitly.
- [ ] Money calculations are precise.
- [ ] Rounding is deterministic.
- [ ] Residual funds are accounted for.
- [ ] Wallet credits use the authoritative ledger.
- [ ] Settlement is idempotent.
- [ ] Duplicate credits are impossible.
- [ ] Concurrent settlement is safe.
- [ ] Failed distributions can resume safely.
- [ ] Self-farming is blocked.
- [ ] Coordinated farming is addressed.
- [ ] Moderation can invalidate/reverse qualifying contribution.
- [ ] Historical settlements remain auditable.
- [ ] Configuration versions are preserved.
- [ ] Admin can inspect settlement results.
- [ ] Give Back does not create social relationships.
- [ ] Give Back does not replace the feed algorithm.
- [ ] Feed performance is not degraded.
- [ ] Direct malicious API tests pass.
- [ ] RLS/security boundaries are verified.
- [ ] Wallet invariants remain intact.
- [ ] End-to-end Promotion → Engagement → Settlement → Wallet works.
- [ ] Android APK testing covers the complete flow.

---

# 73. Final Instruction to Claude

**Read the existing Akọ repository first. Do not implement this document as a blind checklist.**

Trace the current system and determine:

1. what Give Back already does;
2. how promotions are created and approved;
3. where Admin controls currently live;
4. how engagement events are stored;
5. which engagement signals actually influence Feed;
6. how comments and downstream engagement are represented;
7. how wallet balances and ledger transactions work;
8. how scheduled settlement functions work;
9. how RLS protects financial records;
10. what anti-fraud infrastructure already exists.

Then:

- preserve strong existing implementations;
- correct behavior that conflicts with this clarified model;
- avoid duplicate systems;
- use the existing wallet/ledger as financial authority;
- keep points and formulas server-side;
- make settlement deterministic and idempotent;
- enforce the one-time reward-eligible participation rule;
- make Admin's Give Back amount authoritative;
- do not hard-code the conceptual 50%;
- connect contribution logic to real Akọ engagement/algorithm signals;
- do not reward meaningless button spam;
- do not expose secret point mechanics;
- do not fake financial state;
- do not weaken security;
- do not make Feed slower;
- do not add complexity merely because it is possible.

The desired separation is:

```text
USER SEES:
participation + eventual earnings

SYSTEM SEES:
validated contribution

ADMIN DEFINES:
Give Back pool

BACKEND CALCULATES:
distribution

WALLET RECORDS:
money
```

**The user sees participation.  
The system sees contribution.  
The Admin defines the pool.  
The backend calculates the distribution.  
The wallet records the money.**

That separation should remain clear throughout the architecture.
