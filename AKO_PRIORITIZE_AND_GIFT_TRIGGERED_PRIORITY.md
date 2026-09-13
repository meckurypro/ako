# AKỌ — Prioritize + Gift-Triggered Priority Delivery

## Purpose

This document defines the product behavior and implementation rules for Akọ's **Prioritize** feature and the additional **Gift → Prioritized Post** discovery mechanism.

This is an **audit-and-upgrade specification**, not a blind rebuild instruction.

Claude must first inspect the existing Akọ repository, database schema, feed/candidate-generation logic, ranking logic, gifting/wallet logic, notifications, post engagement system, and any existing Prioritize implementation.

**Do not rebuild working systems blindly. Preserve existing stronger architecture. Upgrade only what is missing, incorrect, inconsistent, insecure, or weaker than the behavior defined here.**

---

# 1. Core Product Principle

Prioritize does **not** primarily mean:

> "Push this post to people who do not follow me."

It means:

> **"Of the opportunities my content already has to appear in a person's feed, I prefer this particular post to occupy that opportunity instead of my other posts."**

Prioritize is therefore **content-slot preference / substitution**.

The creator is choosing which of their posts should receive preference when their content is eligible to occupy a feed opportunity.

---

# 2. Example: Creator With Multiple Posts

Suppose a creator is a nurse and has four posts:

1. Nursing
2. Diabetes
3. Primary Healthcare
4. AI

Normally, different people may encounter different posts according to Akọ's existing relevance, social, performance, freshness, diversity, and other ranking rules.

The creator then chooses:

> **AI → Prioritize**

The system should not simply create a new audience for the AI post.

Instead, when this creator's content would otherwise occupy a feed opportunity, the prioritized AI post receives preference over the creator's other eligible posts.

Conceptually:

```text
NORMAL

Feed opportunity
      ↓
Creator's eligible content
      ↓
Nursing / Diabetes / Primary Healthcare / AI
      ↓
Normal ranking selects one
```

With Prioritize:

```text
FEED OPPORTUNITY

Creator's eligible content
      ↓
Prioritized post receives preference
      ↓
AI post occupies the opportunity
```

The other posts are not deleted, permanently demoted, or made unavailable. They simply do not get that particular opportunity when the prioritized post occupies it.

---

# 3. Prioritize Is Post-Level, Not Creator-Level

Prioritize belongs to a **specific post**.

It must not become:

> "Boost this creator."

It must remain:

> "Prefer this post over my other posts for the relevant feed opportunities."

If Creator A prioritizes Post A:

- Post A receives the preference.
- Creator A's other posts do not automatically receive it.
- Creator A's account does not receive a permanent ranking boost.
- Prioritize does not permanently alter creator authority or reputation.
- The effect is temporary and tied to the active Prioritize period.

---

# 4. One Prioritized Post Per Creator Per Day

A creator may select one post as their Prioritized post for the applicable day.

The server must enforce this.

A creator must not be able to have multiple simultaneously active Prioritized posts unless the existing product architecture explicitly supports a different rule.

If a creator changes their selection, the server must maintain a coherent state and prevent conflicting active Prioritize records.

---

# 5. Prioritize Does Not Mean Forced Engagement

Prioritize is an **opportunity**, not an instruction to engage.

A person who encounters a prioritized post:

- does not have to like it;
- does not have to Support it;
- does not have to Disagree;
- does not have to Push Back;
- does not have to comment;
- does not have to follow the creator;
- does not have to visit the creator's profile.

The recipient remains completely free to ignore the content.

---

# 6. Normal Feed Logic Still Matters

Prioritize must not destroy Akọ's existing feed architecture.

Claude must inspect the current candidate-generation and ranking pipeline before implementation.

Conceptually:

```text
Candidate generation
        ↓
Eligibility filtering
        ↓
Normal relevance / social / performance signals
        ↓
Creator's Prioritize preference
        ↓
Diversity / repetition / freshness / safety rules
        ↓
Final feed
```

Prioritize is a **preference within the creator's available content opportunities**, not a license to bypass every feed rule.

Existing stronger safeguards should remain intact.

---

# 7. Slot Substitution

The central implementation concept is **slot substitution**.

Suppose a person would normally receive one piece of content from Creator A.

Without Prioritize:

```text
Slot 1 → Nursing
```

With AI prioritized:

```text
Slot 1 → AI
```

The system is effectively saying:

> "Creator A has an opportunity here. Creator A has indicated that AI is the post they prefer to occupy it."

This should not be implemented as an uncontrolled global boost.

---

# 8. Repeated Opportunities

A prioritized post may receive multiple opportunities to appear to the same person, subject to normal feed experience and repetition controls.

These opportunities should be **spaced over time**.

Do not show the same prioritized post repeatedly and immediately in consecutive feed positions simply because it is prioritized.

For example:

```text
Morning
→ prioritized post appears

Several hours later
→ prioritized post may become eligible again

Later
→ prioritized post may become eligible again
```

The exact spacing should be derived from the existing feed architecture and tuned through real product behavior.

---

# 9. Gift → Prioritized Post Discovery

A second feature sits on top of Prioritize.

Suppose:

> **Creator A gifts Creator B.**

Creator B receives the normal gift notification.

For example:

> 🎁 Creator A sent you a gift.

The gift may be a cultural artifact such as Free, Masquerade, Cowrie, Beads, or another Akọ gift.

The gift also creates a **temporary content-discovery relationship**.

---

# 10. The Gift Does Not Create Social Access

The gift must **not** automatically:

- make B follow A;
- make A follow B;
- create a friendship;
- create a connection;
- expose private content;
- force a profile visit;
- force a chat;
- force engagement;
- alter B's explicit follow graph.

The recipient simply receives the gift.

The additional effect is feed discovery of the giver's Prioritized post.

> **Gift recognition is not social permission.**

---

# 11. Gift → Prioritized Post Rule

When Creator A gifts Creator B:

```text
A gifts B
   ↓
B receives gift notification
   ↓
System checks:
Does A currently have an active Prioritized post?
   ↓
NO → Nothing extra happens
   ↓
YES → A's Prioritized post becomes eligible for B's feed
```

This eligibility exists **regardless of B's normal relationship with A**.

B may:

- follow nobody;
- not follow A;
- follow completely different people;
- have completely different interests;
- have no meaningful engagement history with A.

The gift-triggered discovery mechanism can still make A's active Prioritized post eligible for B.

---

# 12. No Prioritized Post = No Extra Delivery

If A gifts B but A does not have an active Prioritized post:

```text
Gift
 ↓
Gift notification
 ↓
No active Prioritized post
 ↓
No special feed delivery
 ↓
Normal feed continues
```

Do not substitute another ordinary post from A.

The special bridge applies specifically to the **Prioritized post**.

---

# 13. Maximum Three Gift-Triggered Opportunities Per Day

The gift-triggered Prioritized delivery has a maximum of:

> **3 delivery opportunities per recipient per day.**

This is **three**, not thirty.

The number should be implemented server-side.

It is up to three opportunities to deliver the content into the recipient's feed. It is not three guaranteed views.

---

# 14. Three Opportunities Are Spaced

The three opportunities should not be delivered as:

```text
Post
Post
Post
```

within minutes.

Instead:

```text
Opportunity 1
      ↓
time passes
      ↓
Opportunity 2
      ↓
time passes
      ↓
Opportunity 3
```

Use appropriate spacing based on the existing feed/session architecture.

The goal is to give the recipient repeated opportunity without turning the feature into spam.

---

# 15. Engagement Ends Gift-Triggered Delivery

If B engages with A's Prioritized post through the gift-triggered mechanism, the special repeated delivery should stop.

Example:

```text
A gifts B
      ↓
Opportunity 1
      ↓
B engages
      ↓
No Opportunity 2
No Opportunity 3
```

The recipient has now responded to the content.

There is no reason for the gift-triggered delivery mechanism to keep repeatedly presenting the same post.

---

# 16. No Engagement Allows Another Opportunity

If B does not engage:

```text
Opportunity 1
      ↓
No engagement
      ↓
Later...
      ↓
Opportunity 2
      ↓
No engagement
      ↓
Later...
      ↓
Opportunity 3
```

After the third opportunity without engagement:

```text
Gift-triggered delivery ends for that day.
```

Normal feed behavior remains unaffected.

---

# 17. What Counts as Engagement

Claude must inspect the existing Akọ engagement model rather than inventing a parallel engagement system.

The engagement condition should use the product's existing meaningful post-interaction state.

Potential qualifying actions include the existing:

- Support
- Disagree
- Push Back
- Comment
- other existing meaningful post engagement

The implementation must use the strongest existing engagement semantics and must not create fake engagement records merely to stop delivery.

If there is an existing definition of "meaningful engagement," reuse it.

---

# 18. Do Not Confuse This With Normal Feed Ranking

The gift-triggered mechanism is different from ordinary feed recommendation.

Normal feed:

> "What content should this person probably see?"

Gift-triggered Priority:

> **"This person received a gift from this creator, and that creator currently has a post they explicitly prioritized. Give the recipient an opportunity to encounter that post."**

The gift relationship should not permanently become a generic social-relevance boost.

---

# 19. Conceptual Feed Example

Creator A:

```text
Post 1 → Nursing
Post 2 → Diabetes
Post 3 → Primary Healthcare
Post 4 → AI ← PRIORITIZED
```

Creator A gifts Creator B.

B:

```text
Does not follow A
Does not normally engage with A
May not follow anybody
Has unrelated interests
```

Still:

```text
A gifts B
      ↓
B gets notification
      ↓
A has AI prioritized
      ↓
AI becomes eligible for B
      ↓
Opportunity 1
      ↓
No engagement
      ↓
Later: Opportunity 2
      ↓
No engagement
      ↓
Later: Opportunity 3
      ↓
Stop special delivery
```

If B engages at Opportunity 1:

```text
Opportunity 1
      ↓
B engages
      ↓
Special gift-triggered delivery ends
```

---

# 20. Important: This Does Not Mean Three Guaranteed Views

The product must distinguish:

- delivery opportunity;
- feed insertion;
- impression;
- actual viewport visibility;
- engagement.

Do not blindly label the three opportunities as "three views."

A person may not actually see every feed item.

Preserve accurate analytics.

---

# 21. Gift Relationship State

Claude should inspect the existing gift transaction schema.

If necessary, introduce a server-side relationship/event representing:

```text
giver
recipient
gift transaction
gift timestamp
prioritized-post eligibility
opportunity count
last opportunity timestamp
engagement termination state
daily reset / applicable day
```

Do not duplicate wallet/gift transaction systems unnecessarily.

The existing immutable gift transaction should remain authoritative for the fact that the gift occurred.

---

# 22. Eligibility Must Be Server-Side

The client must never be trusted to determine:

- that a gift occurred;
- who gifted whom;
- whether the giver has a Prioritized post;
- whether the recipient has already received an opportunity;
- how many opportunities remain;
- whether the recipient engaged;
- whether the special delivery has ended.

The server/database/feed service must determine eligibility.

A malicious client must not be able to request another creator's prioritized post merely by claiming a gift relationship.

---

# 23. Prevent Client Manipulation

Test attempts to:

- increment opportunity count from the client;
- reset opportunity count;
- replay a gift event;
- fabricate a gift relationship;
- change giver/recipient IDs;
- inject another creator's prioritized post;
- bypass the three-opportunity limit;
- trigger the same opportunity repeatedly;
- mark a post as engaged without genuine engagement;
- delete/recreate records to reset delivery;
- exploit timezone/day-boundary behavior.

All such controls must be server authoritative.

---

# 24. Idempotency

Gift-triggered delivery must be idempotent.

The same gift must not create multiple independent gift-to-priority relationships because of:

- duplicate requests;
- retries;
- webhook replay;
- mobile retry;
- network failure;
- refresh;
- concurrent sessions.

Use stable identifiers and appropriate unique constraints/idempotency keys.

---

# 25. Concurrency

Test:

- recipient opens multiple feed sessions;
- multiple devices;
- rapid refresh;
- concurrent feed requests;
- concurrent engagement;
- simultaneous opportunity allocation.

The system must not accidentally deliver more than the configured maximum because two requests race each other.

Opportunity state must be updated atomically or otherwise protected against race conditions.

---

# 26. Daily Boundary

The three-opportunity rule is daily.

Claude must inspect the application's existing timezone conventions.

Do not create an inconsistent second definition of "day."

Determine:

- which timezone controls the daily window;
- how server timestamps are stored;
- how resets are calculated;
- how daylight-saving/timezone edge cases are handled where relevant;
- what happens when the Prioritized post changes during the day.

The final implementation must be deterministic and testable.

---

# 27. Changing the Prioritized Post

Claude must inspect existing Prioritize behavior and establish a consistent state transition.

At minimum, prevent a recipient from receiving uncontrolled additional opportunities merely because the creator repeatedly changes which post is prioritized.

Example abuse to prevent:

```text
Prioritize Post A
→ recipient receives 3 opportunities

Unprioritize A
→ Prioritize B

Unprioritize B
→ Prioritize C

...
```

The implementation should ensure the creator cannot manufacture unlimited gift-triggered distribution by cycling posts.

If the product deliberately treats each newly prioritized post as a new campaign, that must be an explicit product rule with appropriate limits.

Do not assume.

---

# 28. Deleted or Unavailable Prioritized Post

If the Prioritized post is deleted, unpublished, moderated, restricted, or otherwise unavailable:

```text
Gift relationship remains a historical fact
BUT
special delivery stops
```

Do not serve deleted/unavailable content.

Existing Akọ orphaned-content behavior remains authoritative.

---

# 29. Blocking, Privacy, and Safety

Blocking and privacy/safety rules take precedence.

If B blocks A, the gift-triggered mechanism must not bypass that restriction.

The same applies to moderation, account status, content visibility, and other hard eligibility rules.

Prioritize is not a permission bypass.

---

# 30. Suspended Creator

If A becomes suspended, restricted, or otherwise ineligible to distribute content:

- do not deliver the prioritized post through the gift bridge;
- preserve the historical gift record;
- allow moderation/security rules to take precedence.

---

# 31. Reversed Gifts

Claude must inspect the existing gift/wallet/refund/chargeback architecture.

If a completed gift is later reversed due to fraud, refund, chargeback, or another authoritative reversal:

- determine whether future gift-triggered opportunities should stop;
- never create new opportunities from a reversed transaction;
- preserve the accounting record;
- prevent replay from restoring eligibility.

Align the final rule with the existing financial architecture.

---

# 32. Feed Architecture Recommendation

Do not implement this as an uncontrolled "boost score."

Prefer an explicit concept such as:

```text
GIFT_PRIORITY_ELIGIBILITY
```

or an equivalent internal candidate-generation/eligibility mechanism.

Conceptually:

```text
Normal candidate pool
        +
Gift-triggered prioritized candidates
        ↓
Eligibility validation
        ↓
Feed ranking / placement
        ↓
Diversity + repetition controls
        ↓
Feed
```

The exact architecture must follow the existing Akọ codebase.

If the current implementation already has a stronger equivalent, preserve it.

---

# 33. Avoid Duplicate Feed Items

The same prioritized post may become eligible through:

1. normal feed ranking;
2. Prioritize;
3. gift-triggered priority.

The feed must not accidentally render duplicate copies of the same post in one feed response.

Use canonical post identity and merge/dedupe candidates before final ranking.

---

# 34. Reciprocal Gifts

Consider:

```text
A gifts B
B gifts A
```

Both may have Prioritized posts.

Each gift creates its own legitimate relationship:

```text
A → B
B → A
```

Treat each direction independently.

Each relationship must obey the same daily maximum and engagement termination rules.

Do not let reciprocal gifting multiply opportunities indefinitely.

---

# 35. No Follow Graph Mutation

The gift-to-priority mechanism must not insert records into the follow graph.

Do not create:

```text
A follows B
```

or:

```text
B follows A
```

unless the user explicitly chooses to follow.

This is a discovery mechanism, not a follow mechanism.

---

# 36. No Profile Visit Requirement

B should not need to visit A's profile before receiving the prioritized post.

The gift itself is the qualifying event.

---

# 37. No Interest Match Requirement

The gift-triggered post does not require the recipient to have an interest/topic match with the creator.

For example:

```text
B likes cooking
A posts AI
A gifts B
A has AI prioritized
```

The AI post may still become eligible through the gift bridge.

Hard safety, visibility, moderation, account, and other eligibility rules still apply.

---

# 38. No Engagement Requirement Before First Delivery

B does not need to engage with A before receiving the first gift-triggered opportunity.

The gift is sufficient.

---

# 39. Engagement Stops the Special Delivery, Not Necessarily Normal Distribution

If B engages with A's Prioritized post:

```text
Gift-triggered delivery → STOP
```

This does **not** necessarily mean:

```text
Post disappears from all future feed ranking forever.
```

After engagement, the normal Akọ feed system can still determine whether the post remains relevant.

The three-opportunity mechanism is only the special gift-triggered delivery path.

---

# 40. Analytics

Track the feature internally.

Useful events include:

- gift sent;
- gift received;
- gift-triggered priority relationship created;
- opportunity 1 delivered;
- opportunity 2 delivered;
- opportunity 3 delivered;
- opportunity skipped because already engaged;
- engagement terminated delivery;
- unavailable post;
- blocked/restricted candidate;
- daily cap reached.

Analytics should distinguish:

```text
normal impression
vs
prioritize-driven opportunity
vs
gift-triggered priority opportunity
```

Do not expose secret ranking/reward mechanics to users.

---

# 41. Product Analytics Questions

The system should allow Akọ to answer:

- How often does gifting lead to prioritized-post exposure?
- What percentage of recipients engage on opportunity 1?
- How many require opportunity 2?
- How many require opportunity 3?
- How often do all three fail to produce engagement?
- Does gifting lead to meaningful discovery?
- Does the feature create spam complaints?
- Does it produce reciprocal gifting?
- Does it improve creator discovery without forcing follows?
- Does the mechanism disproportionately favor highly active gifters?

---

# 42. Anti-Abuse

The feature creates a potentially valuable distribution channel and therefore must be protected.

Audit for:

- mass gifting;
- bot gifting;
- coordinated gifting rings;
- self-gifting;
- multiple accounts;
- fake recipient accounts;
- gift-and-delete patterns;
- gift-and-prioritize cycling;
- repeated recipient targeting;
- automated feed requests;
- scripted engagement;
- fake engagement designed to manipulate stopping conditions;
- financial abuse through the wallet/gifting system.

Reuse existing fraud infrastructure where possible.

---

# 43. Gift Is Still a Real Financial Transaction

A cultural gift in Akọ may carry monetary value.

Therefore:

> **The gift-triggered discovery mechanism must never interfere with the authoritative wallet/ledger transaction.**

The gift must remain:

- server-authorized;
- atomic;
- ledger-backed;
- idempotent;
- auditable.

The discovery consequence is downstream of the authoritative gift event.

It must never be possible to trigger gift-priority delivery without a valid gift transaction.

---

# 44. Suggested Internal State

Conceptual only. Inspect the existing schema first.

Possible state:

```text
gift_transaction
    id
    giver_id
    recipient_id
    gift_id
    status
    created_at

gift_priority_delivery
    gift_transaction_id
    prioritized_post_id
    recipient_id
    opportunities_used
    last_opportunity_at
    engaged_at
    status
    applicable_day
    created_at
    updated_at
```

Possible status:

```text
ACTIVE
ENGAGED
EXHAUSTED
EXPIRED
INVALIDATED
```

Do not create these exact tables if the existing schema already provides a stronger model.

---

# 45. Opportunity Allocation

An opportunity should be consumed only when the system actually determines that the post is eligible to be delivered.

Do not increment the counter simply because:

- the feed endpoint was called;
- the candidate was generated internally;
- the post was considered by ranking.

The exact definition of delivery/impression should follow the existing analytics/feed architecture.

The system must be consistent.

---

# 46. Feed Request Example

Conceptual:

```text
GET FEED FOR B

1. Generate normal candidates.

2. Identify valid gift relationships involving B.

3. For each valid gift:
      - identify giver A
      - check active Prioritized post
      - check daily opportunities used < 3
      - check recipient has not engaged
      - check post visibility/safety
      - check post still exists
      - check block/privacy/moderation rules

4. Add valid prioritized candidate.

5. Merge and deduplicate candidates.

6. Apply normal feed placement/ranking/diversity/repetition rules.

7. Deliver feed.

8. Record the appropriate delivery/impression state safely.
```

The existing feed architecture may implement this differently. The conceptual requirement is what matters.

---

# 47. Important Ranking Question

Claude must explicitly audit how the gift-triggered candidate interacts with the existing ranking system.

The product intent is:

> **The gift-triggered prioritized post should actually reach the recipient's feed.**

Therefore, simply inserting it into the candidate pool and allowing an unrelated score to bury it may fail the intended feature.

At the same time, hard-forcing it into every feed response can create poor UX.

The implementation must find the correct **eligible feed slot / insertion mechanism** consistent with the current feed system.

Document the final decision after inspecting the current architecture.

---

# 48. Relationship to Normal Prioritize

Think of the system as two layers:

## Layer A — Creator Prioritize

```text
Creator's own content opportunity
        ↓
Prefer selected post
```

## Layer B — Gift Bridge

```text
A gifts B
        ↓
B receives gift
        ↓
A's prioritized post gets special eligibility with B
        ↓
Up to 3 spaced opportunities
        ↓
Engagement stops special delivery
```

Layer B should not rewrite Layer A.

It simply creates a special eligibility path for the recipient.

---

# 49. Relationship to Normal Feed Signals

Akọ's feed can still have:

- topic relevance;
- performance;
- social activity;
- freshness;
- diversity;
- creator intent;
- Prioritize;
- other existing signals.

Gift-triggered Prioritize is an additional **relationship-based eligibility signal**.

It should not permanently change:

- topic affinity;
- follow graph;
- creator reputation;
- user interest profile.

---

# 50. User Experience

The recipient's experience should remain natural.

They see:

```text
Gift notification
```

and later encounter the creator's prioritized content naturally in the feed.

The feed does not need to announce:

> "You are seeing this because Creator A gifted you."

Do not create a loud promotional banner.

The mechanism should feel like:

> **"Someone gave you something, and you happened to encounter something they chose to prioritize today."**

---

# 51. Admin Controls

Claude must inspect existing Admin pages before creating anything new.

Potential controls should be integrated into existing Admin architecture:

- Prioritize enabled/disabled;
- maximum gift-triggered opportunities per day;
- opportunity spacing;
- applicable day/time behavior;
- engagement termination rule;
- fraud limits;
- feature kill switch;
- analytics.

Do not create duplicate Admin systems.

---

# 52. Feature Kill Switch

Because this creates a feed-distribution path, Admin should have a safe server-side kill switch.

If disabled:

```text
Existing gifts → still work normally
Existing notifications → still work
Normal Prioritize → may continue if separately enabled
Gift → Prioritized Post bridge → disabled
```

The exact relationship between switches must be explicit.

A disabled feature must be enforced server-side, not merely hidden from the client.

---

# 53. Security / RLS

Review:

- gift transaction RLS;
- post visibility RLS;
- feed candidate authorization;
- Prioritize mutation authorization;
- recipient-specific delivery state;
- Admin configuration;
- service-role functions;
- SECURITY DEFINER functions;
- wallet/gift authorization.

Do not expose gift-delivery state for arbitrary users.

---

# 54. Tests

At minimum test:

### Basic Prioritize

- creator has four posts;
- creator prioritizes one;
- prioritized post receives preference;
- other posts remain intact.

### Gift bridge

- A gifts B;
- B receives notification;
- A has Prioritized post;
- B becomes eligible.

### No Prioritize

- A gifts B;
- A has no Prioritized post;
- no special delivery occurs.

### Three opportunities

- opportunity 1;
- opportunity 2;
- opportunity 3;
- fourth opportunity blocked.

### Engagement

- engage after opportunity 1 → stop;
- engage after opportunity 2 → stop;
- engage after opportunity 3 → already exhausted.

### No engagement

- no engagement after opportunity 1;
- no engagement after opportunity 2;
- no engagement after opportunity 3;
- delivery exhausted.

### Follow independence

Test:

- B follows A;
- B does not follow A;
- B follows nobody.

All must obey the intended gift bridge.

### Interest independence

Test:

- matching topic;
- unrelated topic.

Gift bridge must not require topic match.

### Safety

Test:

- A blocked by B;
- A suspended;
- post deleted;
- post moderated;
- recipient restricted.

### Concurrency

Test:

- two feed requests;
- two devices;
- refresh loops;
- simultaneous delivery attempts.

### Abuse

Test:

- duplicate gift events;
- replay;
- gift cycling;
- multiple accounts;
- self-gifting;
- automated requests.

---

# 55. Acceptance Criteria

The implementation is correct when:

- [ ] Prioritize is implemented as **preference/substitution among a creator's content opportunities**, not a generic follower-bypass boost.
- [ ] A creator can prioritize the specific post they prefer.
- [ ] Prioritize is post-level.
- [ ] Other creator posts remain intact.
- [ ] Normal feed architecture remains functional.
- [ ] A gift creates the gift notification normally.
- [ ] A gift does not create a follow or connection.
- [ ] A gift does not grant access to private content.
- [ ] If the giver has no active Prioritized post, no special delivery occurs.
- [ ] If the giver has an active Prioritized post, the recipient becomes eligible for it.
- [ ] This can happen even without a follow relationship.
- [ ] This does not require topic/interest matching.
- [ ] The gift-triggered Prioritized post has a maximum of **3 opportunities per recipient per day**.
- [ ] Opportunities are spaced.
- [ ] Engagement ends the special delivery.
- [ ] Three non-engaged opportunities exhaust the special delivery for that day.
- [ ] The three opportunities cannot be reset through client manipulation.
- [ ] Duplicate feed candidates are deduplicated.
- [ ] Deleted/unavailable content is never served.
- [ ] Block/privacy/moderation rules override the gift bridge.
- [ ] Gift/wallet accounting remains authoritative.
- [ ] All state transitions are server-side.
- [ ] Concurrency is safe.
- [ ] Duplicate events are idempotent.
- [ ] Abuse controls exist.
- [ ] Admin can disable the gift-priority bridge server-side.
- [ ] Analytics distinguish normal vs gift-triggered delivery.
- [ ] Existing stronger architecture is preserved.

---

# 56. Final Product Definition

The simplest way to describe the complete feature is:

> **Prioritize lets a creator choose which of their posts should receive preference when their content has an opportunity to appear in someone's feed.**

And the additional bridge is:

> **When Creator A gifts Creator B, B receives the gift normally. If A has a Prioritized post that day, that post also becomes specially eligible for B's feed — regardless of whether B follows A or normally engages with A. B can receive up to three spaced opportunities to encounter it that day. If B engages with it, the gift-triggered delivery stops immediately. If B does not engage, the system may provide the remaining opportunities, up to three total. If A has no Prioritized post, nothing extra happens.**

This is **not forced following**.

It is **not permanent reach expansion**.

It is **not an advertising boost**.

It is a lightweight discovery mechanism connecting:

```text
RECOGNITION
     ↓
Gift
     ↓
CREATOR INTENT
     ↓
Prioritize
     ↓
CONTENT DISCOVERY
     ↓
Optional engagement
```

The core philosophy is:

> **A gift opens an opportunity to be seen, not an obligation to connect.**
