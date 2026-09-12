# AKỌ — Product, Feed & Promotion Systems Audit Specification

## Purpose

This document consolidates product mechanics, feed philosophy, discovery rules, monetization ideas, creator systems, and algorithmic principles developed in prior Akọ planning.

**Important:** This is an **audit-and-upgrade specification**, not an instruction to rebuild everything from scratch.

Some of these ideas may already be implemented in the current Akọ codebase, and some implementations may be substantially better than the original drafts.

Claude must therefore:

1. Inspect the current implementation first.
2. Map each requirement below to what actually exists.
3. Preserve anything that is already correct and better.
4. Fix incomplete or incorrect implementations.
5. Upgrade systems where the current architecture can support a stronger version.
6. Avoid duplicating existing tables, functions, APIs, or logic.
7. Distinguish between product intent and implementation details that were only examples in these drafts.
8. Test the actual behavior rather than assuming the code matches the specification.

The objective is:

> **Audit → understand → preserve → fix → upgrade → test.**

Do not implement old wording literally if the current implementation has already evolved into a better solution.

---

# 1. AKỌ — Core Identity

**Akọ — “A Reason to Reason.”**

Akọ is a social platform centered around people who either:

- have something valuable to impart, or
- have the intention to learn.

Knowledge, skills, ideas, creativity, experience, and exchange of value are central.

The platform should not be treated as merely another general-purpose social network.

The product philosophy is:

> **People discover ideas, find each other, exchange value, and build influence through what they know and create.**

A broader system loop is:

**Discover → Think → Engage → Connect → Learn → Create → Exchange value → Earn → Give value back.**

---

# 2. Product Architecture — Social Layer + Value Layer

Akọ's feed is the social/discovery layer.

Projects are the mechanism through which ideas, skills, creativity, experiences, and digital goods can become accessible or monetizable.

The product should allow a user to move naturally from:

**post → discussion → connection → project → participation → transaction**

The feed is therefore not necessarily the final destination.

It is a discovery and relationship layer that can lead somewhere.

---

# 3. Topic-Driven Social Feed

Every post should have topic/interest context where appropriate.

The feed can use:

- followed accounts
- followed/interested topics
- engagement history
- demonstrated interests
- post performance
- social activity from meaningful connections
- Prioritize
- other validated relevance signals

The goal is not simply to maximize time spent scrolling.

The core question should be closer to:

> **“What is worth putting in front of this person?”**

rather than:

> **“What keeps this person scrolling?”**

---

# 4. Topics Are Fundamental

A user's topic graph should be an important part of feed relevance.

Example:

A user repeatedly engages with AI-related content.

AI-related posts should become more likely to enter that user's feed.

Another user may consistently engage with nursing content.

Nursing-related content becomes more relevant to that user.

This creates a topic-based social graph rather than relying exclusively on follower relationships.

---

# 5. Following Matters — But It Is Not the Whole Feed

Following someone should naturally make their content eligible for the user's feed.

However, a user should also be able to discover creators through:

- topic relevance
- strong post performance
- meaningful social activity
- Project interactions
- Prioritized posts
- other validated relevance signals

The system should prevent discovery from becoming exclusively:

> “You only see people you already follow.”

A creator should have pathways to reach people outside their existing audience.

---

# 6. Post-Level Distribution

One of Akọ's most important principles:

> **Distribution should be earned at the post level, not permanently inherited by the creator.**

Example:

A creator has 100,000 followers.

They publish:

**Post A → performs extremely well.**

Akọ may distribute Post A widely.

The same creator then publishes:

**Post B.**

Post B should not automatically receive massive distribution merely because the creator's previous post performed well.

Therefore:

> **Viral post ≠ permanently boosted creator.**

A creator's historical reputation can be a useful contextual signal where appropriate, but it must not become an automatic permanent reach multiplier that overwhelms post-level quality.

---

# 7. Small-Creator Breakthrough

Because distribution is associated substantially with individual posts, a creator with 200 followers should have a legitimate path to broad discovery.

If the post demonstrates value/relevance/performance, the system can continue testing it with additional audiences.

This allows influence to be built:

> **one valuable post at a time.**

The feed should avoid becoming a system where the largest accounts automatically dominate distribution.

---

# 8. Content Performance Expansion

A strong-performing post can move beyond the creator's immediate audience.

Conceptually:

```text
Post
 ↓
Initial eligible audience
 ↓
Meaningful engagement / quality signals
 ↓
Performance evaluation
 ↓
Broader audience testing
 ↓
Further evaluation
 ↓
Additional distribution if justified
```

However, distribution should be controlled by a balanced set of signals rather than a single raw engagement metric.

This is particularly important because engagement can be manipulated.

---

# 9. Non-Dominance Rule

### Original product idea

Akọ should have a **non-dominance** rule so that one reaction type cannot completely take over the distribution signal.

The original draft proposed:

- If one reaction reaches **40% of total engagement**, reduce its weight by **20%**.
- At **50%**, reduce its weight by another **20%**, leaving **60%** of its original weight.
- At **60%**, reduce it by another **20%**.
- At **70%**, reduce it by another **20%**.
- At **80%**, it has **no weight**.

Conceptually:

```text
Reaction share of engagement     Relative weight

< 40%                            100%
40%                              80%
50%                              60%
60%                              40%
70%                              20%
80%+                              0%
```

### Audit requirement

Do **not** blindly implement this exact formula without examining the existing algorithm.

The product intention is more important than these exact numbers:

> **A single reaction signal should not become so dominant that it completely determines distribution.**

Claude should determine:

- What exactly counts as a reaction?
- Are Support, Disagree, Push Back, Like, Save, Share, etc. separate signals?
- Is “engagement” total interaction count or weighted interaction value?
- Is the threshold calculated per post?
- Per audience?
- Per time window?
- Per recommendation cohort?
- Does a reaction reaching 40% actually indicate signal dominance or merely reflect the natural nature of the content?
- Could the rule unintentionally punish legitimate posts?
- Does the current algorithm already solve this more effectively?

If the current implementation has a mathematically stronger anti-dominance mechanism, **keep the stronger mechanism** and document that it satisfies the product intent.

Do not introduce arbitrary weight suppression merely because an old draft contains a formula.

---

# 10. Avoid Single-Metric Optimization

Akọ should not let one metric become the entire definition of content quality.

Relevant signals may include:

- Support
- Disagree
- Push Back
- likes/reactions where applicable
- saves
- shares
- comments
- comment engagement
- dwell/reading behavior where available and privacy-appropriate
- topic relevance
- relationship relevance
- negative feedback
- reports/moderation signals
- post freshness
- creator intent through Prioritize

The exact scoring architecture should be determined from the current implementation.

The principle is:

> **No single noisy metric should control the feed.**

---

# 11. Stance-Based Engagement

Akọ should avoid reducing every response to a generic “Comment.”

The intended stance model is:

### Support

> Add to the idea.

### Disagree

> Present an opposing position.

### Push Back

> Challenge an aspect or introduce another angle without necessarily rejecting the entire idea.

The interaction itself should encourage the user to think before responding.

The distinction is important because Akọ is designed around reasoning, not merely reaction volume.

---

# 12. Engagement as a Meaningful Signal

Akọ's engagement model should ideally provide richer information than a generic reaction counter.

A response communicates something about the relationship between the user and the idea.

For example:

```text
Post
 ├── Support
 ├── Disagree
 └── Push Back
```

The feed can potentially use these as richer signals than an undifferentiated “comment.”

However, the algorithm should not assume:

> Disagree = bad post

or:

> Support = good post

A controversial but intellectually valuable post can generate disagreement.

The system should distinguish **engagement type** from **content quality**.

---

# 13. Social Activity as a Feed Signal

A user's own activity is not the only source of relevance.

Meaningful activity from people connected to the user can create discovery opportunities.

A connection may include:

- someone the user follows
- someone who follows the user
- someone they have chatted with
- someone they have interacted with through a Project
- another meaningful Akọ relationship

Example:

```text
You follow Emeka.

Emeka engages with an AI architecture post.

Akọ recognizes:
- your relationship to Emeka
- Emeka's activity
- the post's topic/context

The post may become eligible for your feed.
```

The system is therefore asking two questions:

> **“What does this person tend to care about?”**

and:

> **“What are people meaningfully connected to this person finding interesting?”**

---

# 14. Social Discovery Across Niches

Social relevance can create cross-topic discovery.

Example:

A nurse follows another nurse.

That nurse engages with an entrepreneurship post.

The first nurse may subsequently encounter the entrepreneurship post.

This prevents social relationships from becoming locked inside a single topic.

The user's network can expose them to useful ideas they would not otherwise have searched for.

---

# 15. Four Major Discovery Forces

The intended feed architecture can be understood as four major forces:

### 1. Personal relevance

> “This matches what you tend to care about.”

### 2. Content performance

> “Other people are finding this valuable or engaging.”

### 3. Social relevance

> “Someone meaningfully connected to you is engaging with this.”

### 4. Creator intent

> “This creator has deliberately chosen this post for broader exposure today.”

Prioritize is the mechanism for the fourth category.

---

# 16. Prioritize

A creator can select **one post for the day** to Prioritize.

The Prioritized post receives an opportunity for broad feed exposure.

It can reach people who:

- do not follow the creator
- are not normally in the creator's niche
- would not ordinarily have the post selected for them

The creator is effectively saying:

> **“This is what I want to put forward today.”**

---

# 17. Prioritize Is Not Forced Attention

Prioritize does not guarantee:

- engagement
- likes
- follows
- saves
- shares
- completion/read time

It provides an opportunity to be seen.

The recipient can:

**See → scroll past**

or:

**See → engage**

Therefore:

> **Prioritize = opportunity for distribution, not guaranteed attention.**

---

# 18. Prioritize Breaks Niche Boundaries

Example:

An AI-focused user normally receives mostly AI-related recommendations.

A poet Prioritizes a poem.

That poem may be eligible to reach the AI-focused user even if:

- they do not follow the poet
- poetry is not a dominant topic in their profile
- the user would not normally receive the poet's posts

Likewise, an AI creator can use Prioritize to put an important AI post before people outside their usual audience.

This creates deliberate cross-topic discovery.

---

# 19. Prioritize Is Temporary

The creator selects one post for a day.

The following day, they may select another.

This prevents Prioritize from becoming permanent creator-level distribution privilege.

The creator must repeatedly decide:

> **“Which of my ideas deserves the widest opportunity today?”**

The one-post limit gives the decision meaning.

---

# 20. Algorithm + Prioritize Relationship

Normal feed logic asks:

> **“Who should probably see this?”**

Prioritize allows the creator to ask:

> **“Which of my ideas do I most want people to have the opportunity to see today?”**

The two systems should coexist.

### Algorithmic relevance

**What is likely to matter to you?**

### Creator intent

**What matters most to me today?**

Prioritize should not simply bypass all feed logic forever.

It is a controlled creator lever inside the broader recommendation system.

---

# 21. Account / Page Recommendations Based on Complementary Needs

A major recommendation principle:

> **Do not recommend only people who are doing exactly what the user is doing. Recommend people the user may need.**

Example:

### Music producer

Do not only recommend:

- other music producers

Recommend potential collaborators and ecosystem participants:

- recording artists
- instrumentalists
- vocalists
- record labels
- DJs
- graphic designers
- videographers
- other relevant complementary professionals

### Writer

Do not primarily recommend:

- other writers

Also recommend:

- publishers
- editors
- illustrators
- literary communities
- relevant educators
- other complementary professionals

The recommendation engine should understand **functional relationships**, not merely category similarity.

---

# 22. Complementary Recommendation Model

The recommendation system should eventually distinguish between:

### Same-category relevance

> “You are a music producer, so here are other music producers.”

and:

### Complementary relevance

> “You are a music producer, so here are people who can help you make, distribute, package, perform, publish, or monetize music.”

Akọ should place significant value on the second.

This supports the platform's broader purpose:

> **Find the people you need to build something.**

---

# 23. Recommendation Graph

Where possible, recommendation logic should understand relationships between roles.

Conceptually:

```text
Music Producer
 ├── Recording Artist
 ├── Instrumentalist
 ├── Vocalist
 ├── DJ
 ├── Record Label
 ├── Graphic Designer
 ├── Videographer
 └── Event/Promotion ecosystem
```

```text
Writer
 ├── Publisher
 ├── Editor
 ├── Illustrator
 ├── Designer
 ├── Literary community
 └── Educator
```

This should not be hard-coded as an enormous list if the existing architecture can support a more flexible taxonomy.

Claude should inspect the current interest/category model first.

---

# 24. Projects

Projects are Akọ's built-in mechanism for turning:

- knowledge
- creativity
- experience
- services
- digital goods
- events
- learning

into things other people can access or buy.

Current/established project types from the original product specification include:

1. Event
2. Meeting
3. Room
4. Course
5. Audio
6. Video
7. File

Projects may be free or paid.

### Audit instruction

The current application may have evolved beyond this list.

Claude must inspect the actual Project system and treat the current implementation as authoritative where it is demonstrably better.

Do not remove newer project capabilities merely because this document lists an older set.

---

# 25. Project Access / Delivery

Projects may provide gated access to:

- files
- links
- tickets
- meetings
- rooms
- courses
- audio
- video

Each Project should have appropriate access tracking.

Access must be authorized server-side.

Do not expose paid/private assets merely because a user knows or guesses a URL.

---

# 26. Project Saving

Users should be able to save Projects for later.

This is conceptually similar to saving/bookmarking posts.

Audit the current implementation and ensure:

- save authorization
- uniqueness/idempotency
- correct saved state
- unsave behavior
- feed/project integration

are handled properly.

---

# 27. Events

A creator can sell access to an Event.

The buyer can provide an email address and receive a ticket that can be:

- emailed
- downloaded
- presented for access

The exact ticket implementation should follow the current Project/payment architecture.

---

# 28. Meetings

Creators can sell access to a scheduled live session.

Participants receive:

- event/session information
- countdown where appropriate
- authorized access when the meeting begins

Meeting access should not be granted merely because someone knows the meeting URL.

---

# 29. Rooms

A Room is an ongoing paid group/community/learning environment.

Rooms may contain:

- announcements
- scheduled meetings
- recordings
- assignments
- member participation

Rooms are particularly suitable for structured cohorts and communities.

---

# 30. Courses

Courses provide structured learning through:

- modules
- lessons

Courses should be publishable before becoming purchasable where that workflow exists.

Course content must remain appropriately gated.

---

# 31. File / Media Delivery

Projects can have utility beyond social discovery.

Example:

> A client needs an album delivered.

The creator can upload WAV files and send the client the Akọ Project URL.

This makes Akọ useful as a delivery layer even for someone who is not primarily using it as a social network.

---

# 32. Authentication for Training

Future Akọ-hosted trainings can require students to authenticate on Akọ.

This provides a legitimate pathway for existing learning communities to become Akọ users.

The important product principle is:

> **People should have a reason to use Akọ because something they actually want to do happens there.**

Not merely because they were asked to download another social app.

---

# 33. Gifting

Users can gift other users when they value something they have:

- said
- created
- taught
- shared
- contributed

The gift should be automatically delivered.

There should be no “accept gift” step.

The recipient can receive the gift and decide independently what to do afterward.

This avoids creating unnecessary social obligation.

---

# 34. Gift → Prioritized Content Discovery

An established Akọ mechanic:

If:

```text
A discovers B
↓
A gifts B
```

then B becomes eligible to encounter A's Prioritized post.

This does not require:

- following
- same niche
- profile visits
- mutual connection

The recipient simply receives an opportunity to encounter the sender's Prioritized content.

They can:

- engage
- follow
- save
- share
- scroll past

There is no obligation.

The gift creates a **cross-network discovery opportunity**.

---

# 35. Gifting Philosophy

Gifting is not merely decoration.

A gift can represent:

> **“I value what you contributed.”**

The monetary value and cultural/social wrapper can coexist.

The recipient can subsequently use their Akọ balance according to the wallet rules.

The gift-to-discovery mechanic adds another relationship pathway:

```text
Value recognized
↓
Gift
↓
Relationship signal
↓
Cross-network discovery
```

Any implementation must avoid turning this into forced following or guaranteed exposure.

---

# 36. Advertising User Earnings / Give Back Policy

Akọ's advertising economy has a deliberate **Give Back** component.

The product policy is:

> **50% of advertising money is intended to go back to users.**

This is a policy-level allocation, not a number that should be casually hard-coded into client code.

The **Admin/CEO team controls the operational Give Back amount** for an approved promotion/campaign, subject to the platform's accounting, funding, and policy constraints.

Claude must inspect the current revenue/accounting architecture and determine exactly how the policy allocation and the operational Give Back amount should coexist. If the codebase already has a stronger accounting model, preserve it and map it to this intent rather than replacing it.

## User-facing philosophy

Users should **not** be told:

- which posts are reward-bearing
- which engagement actions have which weights
- the exact point values
- the exact time multiplier
- the exact Give Back calculation
- the ranking/reward formula
- why one user earned more than another on a particular promoted post

The intended user understanding is much simpler:

> **Use Akọ. Engage naturally. You may find money in your wallet.**

The reward system should not present users with an obvious recipe for farming money.

### Important distinction

Keeping the **reward mechanism** secret is a product decision. It must not be implemented by suppressing legally required advertising disclosures. If a jurisdiction, payment partner, app-store policy, advertising rule, or other applicable requirement requires a promoted/sponsored post to be identifiable as advertising, the implementation must support the required disclosure while keeping the internal reward mechanics private.

External native-advertising guidance emphasizes that commercial content must not materially mislead consumers about its commercial nature and that required disclosures should be clear and prominent. citeturn0search0turn0search1

---

# 37. Promotion System — Product Intent

Akọ should eventually allow a user to pay to distribute one of their existing posts to a targeted audience.

The promotion system is **feed distribution**, not a separate creative-ad builder. The user's existing post is the promoted content.

The core flow is:

```text
User post
   ↓
Promote
   ↓
Targeting + budget + duration
   ↓
Optional Project tag
   ↓
Submit for review
   ↓
Admin review
   ↓
Approved / rejected / changes required
   ↓
Campaign becomes eligible to deliver
   ↓
Gradual natural feed distribution
   ↓
Organic engagement can continue normal post distribution
```

Promotion must not bypass the normal content eligibility, safety, moderation, authorization, or feed infrastructure.

---

# 38. Promotion Feature Global Control

Admin must be able to turn the promotion feature globally **ON/OFF**.

When OFF:

- users should not see **Promote** on their posts
- promotion creation routes must not be accessible merely by guessing a URL/API endpoint
- promotion creation APIs must enforce the same feature flag server-side

When ON:

- eligible users can see **Promote**
- server-side eligibility still applies

Do not rely on hiding the button as the security mechanism.

The existing Admin pages/settings must be searched first. If an existing global feature-flag/settings architecture exists, extend it rather than creating a parallel settings system.

---

# 39. Promotion Creation / Targeting

When a user selects **Promote**, they are taken to a dedicated promotion setup page.

The targeting model should be inspired by mature ad platforms while remaining appropriate for Akọ's size and philosophy. Modern ad systems commonly expose campaign controls such as audience demographics, location, audience segments/interests, placement, budget, and campaign settings. citeturn0search2turn0search3turn0search5

Potential Akọ targeting controls include:

- age range
- gender, where product/legal design permits
- locations
- topics/niches/interests
- potentially other Akọ-native audience signals after the basic system is stable

The implementation must not invent a giant targeting taxonomy if Akọ's existing interest/topic model can support it.

### Targeting audit

Claude must inspect:

- current user profile fields
- current interest/topic tables
- location data
- privacy settings
- recommendation/eligibility logic
- existing moderation restrictions

and determine the strongest way to build targeting on top of the existing architecture.

Do not duplicate interest or demographic systems unnecessarily.

---

# 40. Promotion Budget and Duration

The promoter chooses:

- duration
- daily budget

The intended daily budget range is:

> **$1–$50 per day**

The current product concept is that **$1/day should naturally push the post to at least approximately 500 eligible Akọ users that day**, subject to available inventory, audience constraints, safety, and other platform realities.

This should be treated as a product/inventory requirement that Claude must reconcile with the actual active-user base and feed infrastructure rather than as an unsafe client-side promise.

If targeting constraints make the minimum audience impossible, the system needs an explicit, internally consistent behavior rather than silently pretending the campaign can reach an unavailable audience.

The system should distinguish, internally, between:

- eligible audience
- attempted delivery
- delivered impressions
- unique users reached
- frequency
- campaign spend
- remaining budget

The promoter should be able to understand their campaign's basic delivery/budget status without receiving the internal reward formula.

---

# 41. Promotion Delivery

Promoted content should enter the normal feed experience gradually and naturally.

It should not feel like a separate billboard system.

Promotion should create additional distribution opportunity, while normal organic engagement can still cause the post to spread according to Akọ's normal feed rules.

Conceptually:

```text
Paid eligibility
      +
Organic relevance/performance
      ↓
Feed candidate pool
      ↓
Normal ranking / diversity / eligibility
      ↓
User feed
```

Paid promotion should not permanently override the organic ranking system.

### No comment-section promotion

A previous idea mentioned placing promotions in comment sections. **That is explicitly rejected.**

Promoted posts belong in the feed.

Comments can be promoted only in the ordinary sense that good conversation may increase the visibility of the parent post through normal algorithmic behavior; there is no paid comment-section placement in this promotion system.

### No product-specific forced CTA

A promoted post should not automatically display:

- “Message us”
- “DM us”
- “Use this link”
- other forced CTA copy

The creator's own post text/media should carry its intended call to action.

---

# 42. Promotion Review

A submitted promotion does **not** immediately begin delivery.

The campaign enters:

> **IN REVIEW**

Admins receive the promotion for human review.

Admin review should be able to inspect at least:

- promoted post
- creator
- targeting
- budget
- duration
- Project tag, if present
- campaign state
- relevant moderation/safety information
- previous enforcement history where appropriate

Admin can approve, reject, pause, terminate, or otherwise manage the campaign according to the existing administrative architecture.

Search the entire existing Admin surface before adding new review pages. Extend the existing moderation/review system where appropriate.

---

# 43. Promotion Controls After Submission

The promoter should not be able to arbitrarily change the approved targeting/budget configuration after review.

The promoter **can**:

- pause
- terminate
- extend

If an extension changes material campaign parameters, the system should determine whether a new review is required.

All state changes must be server-authorized and auditable.

Suggested state model to audit against existing architecture:

```text
DRAFT
 ↓
IN_REVIEW
 ↓
APPROVED / REJECTED
 ↓
SCHEDULED / ACTIVE
 ↓
PAUSED / TERMINATED / COMPLETED
```

Do not add a new state machine if an existing campaign/workflow state system can safely support it.

---

# 44. Optional Project Tag During Promotion

During promotion setup, the user should be prompted:

> “Do you want to tag a Project?”

This is **optional**.

It must never become a compulsory CTA destination.

If a Project is tagged:

- people can inspect the Project
- people can visit the creator's profile
- people can engage with the post normally

If no Project is tagged, the promotion remains valid.

The promoter's own text/media should carry the intended call to action.

---

# 45. Promotion Reward Pool — Give Back

Admin review includes setting the **Give Back amount** associated with the promotion's reward pool.

The Give Back amount is the money Akọ makes available to users who meaningfully participate in the promoted post.

The exact operational unit must be audited and made explicit:

- per promoted post per day
- per campaign
- per settlement period
- or another existing accounting unit

The product intent strongly points toward a **daily accumulation/settlement model**, because the user should experience earnings as something that can appear in the wallet from ordinary daily participation.

Do not silently assume the accounting unit if the current wallet/revenue architecture has already established one.

---

# 46. Engagement Point Weights

Admin can configure internal point values for engagement types.

Potential engagement types include:

- like
- dislike
- save/bookmark
- share outside Akọ
- repost
- forward inside Akọ
- comment
- Support
- Disagree
- Push Back
- comment replies
- likes on comments
- dislikes on comments
- saves/shares/reposts of comments where supported
- other validated interactions

Admin assigns the internal point value/weight for each event.

Negative values are permitted where product intent requires them. Example:

```text
Like       +X
Dislike    -2
Share      +Y
Comment    +Z
```

The exact values are **not public product rules**. They are internal configuration.

The Admin UI must validate weights safely, prevent accidental malformed values, record who changed a weight, and maintain an audit trail/version history where financially material.

---

# 47. Comment-Level Reward Mechanics

A comment is an economic participation surface, not merely an attachment to the original post.

If User A writes a comment on a promoted post, the comment can accumulate its own internal points.

If User B then interacts with User A's comment:

- a like can add points to A
- a dislike can subtract points from A
- another comment/reply can add points to A according to admin-configured rules
- saves/shares/reposts can add points where those comment actions exist

The system must attribute each event to the correct economic participant.

Example:

```text
Promoted post
   │
   ├── User A comments
   │      ↓
   │   A receives comment points
   │
   ├── User B likes A's comment
   │      ↓
   │   A receives the configured comment-like value
   │
   └── User C replies to A
          ↓
       A receives the configured reply value
```

The parent post creator and commenter should not accidentally receive the same event's reward unless the accounting model explicitly says so.

---

# 48. Time-on-Akọ Factor / Anti-Burst Rewarding

A key new product requirement is that **reward points should have a relationship with the amount of meaningful time a user spends on Akọ**.

Reason:

A user could otherwise attempt to open the app for a few minutes and aggressively generate large numbers of engagements in a short burst, attempting to capture an outsized share of the Give Back pool.

The intended principle is:

> **Meaningful participation over time should be worth more than an extremely compressed burst of activity.**

The exact formula is intentionally not public. Claude must audit and design the strongest version rather than blindly implementing a simple raw multiplication.

Conceptually:

```text
Raw engagement points
          ×
Time / active-session factor
          =
Reward-eligible points
```

However, **raw app-open duration must not be trusted as “time spent.”**

The implementation should investigate a verified concept such as **meaningful active minutes**, using signals like:

- foreground activity
- recent interaction
- scroll/activity cadence
- app visibility
- session continuity
- reasonable inactivity timeout
- server-observable activity where appropriate

Avoid rewarding users simply for leaving Akọ open in the background.

### Diminishing returns

Claude should strongly consider a diminishing-return time factor rather than a linear multiplier.

For example, conceptually:

```text
first meaningful minutes → strong contribution
continued meaningful use → additional contribution
very long sessions → smaller marginal increase
idle/background time → no meaningful increase
```

This is not a prescribed formula. The objective is to prevent:

- burst farming
- idle farming
- artificial session inflation
- unlimited reward scaling from simply leaving the app open

### Per-user normalization

At settlement, the system should calculate each participant's reward-eligible points and compare them against the total eligible points for the relevant Give Back pool.

Conceptually:

```text
User A eligible points
──────────────────────────── × Give Back pool
All eligible users' points
```

Therefore, a user's share depends on both:

1. their own qualified participation
2. everyone else's qualified participation

This prevents the system from promising a fixed cash amount per action.

---

# 49. Reward Calculation Example (Conceptual Only)

This example is for understanding the mechanism, **not a public formula** and not a prescribed production coefficient.

```text
User A raw points = 100
User A verified meaningful time factor = 1.20
User A eligible points = 120

User B raw points = 80
User B verified meaningful time factor = 1.00
User B eligible points = 80

User C raw points = 40
User C verified meaningful time factor = 0.90
User C eligible points = 36

Total eligible points = 236

Give Back pool = $10

A receives: 120 / 236 × $10
B receives: 80 / 236 × $10
C receives: 36 / 236 × $10
```

Production must use sufficiently precise internal arithmetic and only round at a controlled accounting boundary. Do not repeatedly round micro-finances during event accumulation.

---

# 50. Secret Reward Mechanism — Public Simplicity, Internal Auditability

Users should not see the internal recipe.

The user-facing message can remain conceptually simple:

> **Engage on Akọ. Participate. You may earn.**

The internal system, however, must know exactly:

- which events occurred
- who generated them
- which post/comment they affected
- which weight version was active
- whether the event was later invalidated
- what time factor was applied
- what anti-fraud adjustments occurred
- which Give Back pool funded the settlement
- how much each user received

A financial audit must be able to reconstruct a settlement without relying on mutable UI counters.

---

# 51. Promotion Reward Anti-Fraud

This system creates a direct financial incentive to manufacture engagement. It therefore needs stronger anti-abuse controls than ordinary feed ranking.

Audit for:

- self-likes
- self-comments
- self-replies
- multiple accounts controlled by one actor
- coordinated engagement rings
- rapid-fire engagement
- repeated identical comments
- bot activity
- scripted scrolling
- synthetic session time
- background/idle session inflation
- suspicious account clusters
- device/IP/network patterns where legally and technically appropriate
- sudden engagement bursts
- reciprocal engagement farms
- reward manipulation through negative/positive reaction loops
- deleted/hidden content after reward events
- refunds/chargebacks after rewards have been distributed

Do not rely on one anti-fraud rule.

Use layered detection, rate limits, event validation, settlement holds/reversals where necessary, and server-side controls.

---

# 52. Promotion Accounting Integrity

The promotion system is a financial system.

At minimum, the accounting model must reconcile:

```text
Advertiser/promoter funding
        ↓
Promotion spend
        ↓
Platform revenue/accounting
        ↓
Policy allocation / Give Back
        ↓
Eligible engagement pool
        ↓
User allocations
        ↓
Wallet credits
```

Never create user wallet value merely because a client reports an engagement.

All financial effects must be server-authorized and ledger-backed.

The system should support idempotent settlement so retries cannot duplicate wallet credits.

---

# 53. Promotion Disclosure Constraint

Product intent currently says that users should not receive an “AD” badge and may not know that a particular post is sponsored.

This is a **product preference**, not permission to ignore advertising law or platform policy.

Because native ads can resemble ordinary feed content, applicable law may require clear disclosure when failing to identify the commercial nature would materially mislead users. FTC guidance is explicit on this principle. citeturn0search0turn0search1

Therefore the implementation audit must:

1. preserve the desired low-friction visual experience where legally permissible;
2. determine where disclosures are legally/platform required for Akọ's launch markets and payment/ad partners;
3. avoid exposing the internal reward weights merely because a disclosure is required;
4. keep sponsorship metadata internally authoritative;
5. ensure any required disclosure cannot be removed by a client-side request.

Do not solve compliance by silently pretending the campaign is organic.

---

# 54. Share / Repost / Forward / Bookmark Infrastructure

Before Promotion is built, Akọ needs reliable distribution primitives.

Users should be able to:

- share a post outside Akọ
- repost a post
- forward a post into an Akọ chat/group
- bookmark a post
- bookmark/save a comment

These actions are not merely UI buttons. They become inputs to:

- discovery
- feed distribution
- attribution
- notification
- analytics
- promotion rewards
- future creator analytics

Claude must audit the current implementation and avoid creating duplicate interaction systems.

---

# 55. Orphaned Content / Deleted Post and Comment References

If a post or comment is deleted after being:

- bookmarked
- reposted
- shared
- forwarded
- linked externally
- referenced by another surface

those references must not become broken application states or misleading ghost content.

The reference becomes an **orphaned content reference**.

When someone arrives through a URL, bookmark, repost, forward, or another preserved reference, they should receive a subtle message conceptually equivalent to:

> **This content is no longer available.**

The exact UI should fit Akọ's existing design language.

### Important distinction

The system should preserve enough metadata to know that the reference existed without retaining deleted content in a way that violates deletion expectations or privacy rules.

Claude must inspect current deletion semantics, foreign keys, soft deletion, hard deletion, storage cleanup, notifications, caches, and search indexes before choosing the implementation.

---

# 56. Admin Control Over Comment Deletion

Admin needs a control to enable/disable comment deletion.

This control must support appropriate granularity, including **per-user control**, as requested.

The exact meaning must be audited against the current moderation/admin architecture:

- global comment deletion enabled/disabled
- individual user override
- moderator/admin override
- what happens to already-existing comments
- what happens to comment authors when deletion is disabled

Search the entire Admin system first. Extend existing user-control/feature-control infrastructure instead of creating an isolated setting.

Server-side authorization must enforce the setting.

---

# 57. Comment Media

Support, Disagree, and Push Back comments should support media attachments.

Allowed media:

- image
- video

Video limits:

- maximum duration: **90 seconds**
- maximum file size: **100 MB**

Claude must inspect the existing upload/storage/media pipeline before adding another one.

### Per-user Admin control

Admin can search for a user and enable/disable that user's ability to attach media to comments.

When disabled:

- the media upload icon remains visible
- the icon is greyed out
- it is not clickable
- no explanation is shown to the user

Server-side enforcement is mandatory. The greyed-out UI is only a product experience.

The API must reject unauthorized media-comment uploads even if a malicious client bypasses the UI.

---

# 58. Promotion + Comment Media Interaction

A promoted post may contain a normal conversation with Support / Disagree / Push Back comments, including permitted media attachments.

Those comments can participate in the promoted-post engagement economy according to the internal reward configuration.

There is **no paid placement of comments**.

---

# 59. Promotion and Organic Distribution

A promotion buys distribution opportunity. It does not buy permanent algorithmic success.

Once a promoted post receives natural engagement, its organic distribution signals may continue to operate.

Claude must prevent accidental double-counting where paid delivery itself is treated as organic popularity merely because the post received impressions from the promotion.

The ranking system should distinguish, internally, between:

- paid delivery
- organic delivery
- organic engagement generated during/after paid delivery
- engagement attributable to paid exposure

This does not mean organic engagement should be ignored. It means the system must know where signals came from.

---

# 60. Promotion Observability

Admins need internal visibility into campaign behavior.

At minimum, audit whether the system can show:

- campaign state
- spend
- budget remaining
- duration
- target audience
- reach
- impressions
- frequency
- engagement
- Give Back amount
- reward pool consumed
- reward points generated
- suspicious activity
- settlement state
- wallet settlement status

Promoters can receive appropriate campaign-level reporting without seeing the secret engagement weights or reward formula.

---

# 61. Ad Reward / Promotion Audit

Because promotion and user earnings are financially connected, inspect the complete chain:

```text
Promotion created
 ↓
Targeting validated
 ↓
Budget authorized
 ↓
Admin review
 ↓
Promotion approved
 ↓
Delivery
 ↓
Verified engagement events
 ↓
Internal point weights
 ↓
Meaningful-time factor
 ↓
Fraud/risk adjustments
 ↓
Eligible points
 ↓
Give Back pool
 ↓
User share calculation
 ↓
Wallet settlement
 ↓
Ledger/reconciliation
```

Verify:

- revenue source
- promoter funding
- campaign authorization
- daily budget enforcement
- delivery accounting
- engagement event integrity
- point calculation
- comment-level attribution
- time-factor calculation
- anti-fraud
- settlement idempotency
- wallet integration
- reconciliation
- refund/chargeback handling
- deleted-content handling
- admin weight versioning
- audit logs

The secret formula can remain secret from users while remaining completely reconstructable internally.

---

# 62. Earnings Can Circulate Through Gifting

The intended ecosystem loop includes:

```text
Advertiser money
       ↓
User earnings
       ↓
Gifting
       ↓
Other users
       ↓
More participation
```

This creates an internal value circulation mechanism.

The wallet implementation must maintain financial integrity and must never permit client-side creation or inflation of funds.

---

# 63. Product Tagging

Users can tag a product to a post.

This allows a post to naturally lead to a product without the post itself necessarily being an advertisement.

Examples:

- musician → equipment
- author → book
- creator → merchandise
- educator → relevant product
- creator → product they genuinely use

The audit should distinguish between:

- organic product references
- sponsored content
- affiliate relationships
- paid promotion

These should not become indistinguishable to the user where disclosure is required.

---

# 64. Multiple Shareable Project URLs

Every Project should have its own shareable URL.

Examples:

```text
album → Project URL
course → Project URL
event → Project URL
product → Project URL
file → Project URL
```

This allows creators to share individual destinations rather than relying on one generic “link in bio.”

---

# 65. Custom Project URLs

Immediately after creating a Project, the user may be prompted to create a custom, memorable Akọ URL.

Conceptually:

```text
ako.app/project/839472...
```

could become:

```text
ako.app/bootcamp01
```

This is **not** intended to turn Akọ into a general-purpose URL-shortening service.

It is specifically for making an Akọ Project destination:

- short
- memorable
- shareable
- brandable

### Audit requirement

Inspect the current routing implementation.

Check:

- uniqueness
- authorization
- reserved slugs
- slug changes
- redirects
- deleted projects
- case handling
- collisions
- abuse/spoofing
- URL enumeration

---

# 66. Creator Monetization

Akọ gives creators multiple potential monetization pathways:

- Projects
- Courses
- Events
- Meetings
- Rooms
- digital files/media
- gifts
- participation in the advertising reward economy
- affiliate distribution where implemented

The larger principle is:

> **Someone does not need to be a celebrity to potentially make money from knowledge, creativity, skills, or useful contribution.**

---

# 67. Pioneer Creator Ecosystem

Akọ should begin with people who already have things worth contributing.

Potential pioneers include:

- poets
- philosophers
- mentors
- authors
- educators
- designers
- writers
- creators
- knowledgeable specialists
- other people who strongly fit the Akọ philosophy

These people should be treated as **pioneers**, not merely as paid influencers.

The purpose is to establish the quality and culture of the platform.

---

# 68. Organic Seed Communities

Akọ should use real communities and existing relationships to seed the network.

Potential early communities include:

- AI students
- clients
- creators
- authors
- mentors
- educators
- collaborators

The product should ideally give these groups a genuine reason to use Akọ.

For example:

> A training actually happens on Akọ.

That is stronger than simply asking people to sign up to an empty social network.

---

# 69. Pioneer Content Curation

Before broad public distribution, the platform may be seeded with carefully selected creators who embody the Akọ philosophy.

The objective is not to make the feed look artificially busy.

The objective is to make a new user immediately understand:

> **“Ah. This is what people do here.”**

Quality and cultural/product fit matter more than raw signup numbers.

---

# 70. Network Effect Through Meaningful Interactions

A user's discovery pathways can compound.

Potential pathways include:

```text
Topic relevance
       ↓
Personal interest

Social connection
       ↓
Someone you know engages with something

Project interaction
       ↓
You participate in something

Chat
       ↓
You form a relationship

Gift
       ↓
Cross-network discovery

Prioritize
       ↓
Creator-intent discovery

Engagement
       ↓
Post earns further distribution
```

The network effect should emerge from meaningful interactions rather than empty engagement mechanics.

---

# 71. Algorithmic Principles to Preserve

The following principles should be treated as product-level invariants unless the current implementation has a demonstrably stronger interpretation:

### Principle 1 — Post-level distribution

A viral post does not permanently make every future post viral.

### Principle 2 — Topic relevance

What a person cares about matters.

### Principle 3 — Social relevance

What meaningful connections discover can matter.

### Principle 4 — Content performance

Strong posts can earn broader distribution.

### Principle 5 — Creator intent

Prioritize gives the creator controlled editorial agency.

### Principle 6 — No forced attention

Distribution is an opportunity, not a guarantee of engagement.

### Principle 7 — Complementary discovery

Recommend people a user may need, not only people who look like them.

### Principle 8 — No single engagement signal should dominate indefinitely

The non-dominance principle exists to prevent one noisy signal from controlling the system.

### Principle 9 — Reasoning should matter

Akọ should not collapse into a generic engagement-bait machine.

---

# 72. Current Implementation Audit

Claude must create an implementation matrix before making major changes.

Suggested format:

| Feature | Intended Behavior | Current Implementation | Status | Action |
|---|---|---|---|---|
| Topic feed | Topic relevance | Inspect | TBD | Preserve/Fix/Upgrade |
| Post-level distribution | Post earns reach | Inspect | TBD | Preserve/Fix/Upgrade |
| Non-dominance | Prevent one signal dominating | Inspect | TBD | Preserve/Fix/Upgrade |
| Prioritize | One post/day broad opportunity | Inspect | TBD | Preserve/Fix/Upgrade |
| Social discovery | Connected-user activity signal | Inspect | TBD | Preserve/Fix/Upgrade |
| Complementary recommendations | Recommend useful adjacent roles | Inspect | TBD | Preserve/Fix/Upgrade |
| Stance engagement | Support/Disagree/Push Back | Inspect | TBD | Preserve/Fix/Upgrade |
| Projects | Paid/free value delivery | Inspect | TBD | Preserve/Fix/Upgrade |
| Project saving | Save for later | Inspect | TBD | Preserve/Fix/Upgrade |
| Gifting | Automatic value transfer | Inspect | TBD | Preserve/Fix/Upgrade |
| Gift discovery | Recipient eligible for sender Prioritize | Inspect | TBD | Preserve/Fix/Upgrade |
| Ad rewards | User revenue allocation | Inspect | TBD | Preserve/Fix/Upgrade |
| Comment rewards | Valuable conversation can earn | Inspect | TBD | Preserve/Fix/Upgrade |
| Product tagging | Product association | Inspect | TBD | Preserve/Fix/Upgrade |
| Project URLs | Individual shareable destinations | Inspect | TBD | Preserve/Fix/Upgrade |
| Custom URLs | Memorable Project URLs | Inspect | TBD | Preserve/Fix/Upgrade |
| Pioneer onboarding | Curated early ecosystem | Inspect | TBD | Preserve/Fix/Upgrade |

Claude should expand this matrix with every relevant implementation detail discovered in the repository.

---

# 73. Audit Categories

For each system, inspect the appropriate layers.

### Frontend

- UI behavior
- loading states
- error states
- optimistic updates
- navigation
- mobile behavior
- accessibility where relevant

### Backend

- Edge Functions
- API endpoints
- validation
- authorization
- business logic
- transaction handling

### Database

- schema
- foreign keys
- unique constraints
- indexes
- data integrity
- migrations
- triggers where applicable

### RLS

- read policies
- insert policies
- update policies
- delete policies
- creator permissions
- user permissions
- privileged/service-role operations

### Algorithm

- scoring
- ranking
- signal weighting
- candidate generation
- diversity
- freshness
- abuse resistance
- cold start behavior

### Financial systems

- wallet
- ledger
- revenue allocation
- commissions
- payout states
- refunds
- idempotency
- reconciliation

---

# 74. Algorithm Audit Requirements

Claude must not evaluate the feed algorithm solely by reading one scoring function.

Trace the complete pipeline:

```text
Candidate generation
        ↓
Eligibility filtering
        ↓
Relevance scoring
        ↓
Social signals
        ↓
Performance signals
        ↓
Prioritize
        ↓
Diversity / non-dominance
        ↓
Ranking
        ↓
Final feed
```

The actual implementation may differ.

Map the real pipeline before changing it.

Determine:

- where candidates originate
- where topic relevance is applied
- where social signals are applied
- where post performance is measured
- where Prioritize is applied
- where repetition is prevented
- where stale content is removed/downweighted
- how new creators are handled
- how new users are handled
- how a post can escape its creator's immediate network
- how negative signals affect ranking
- whether one creator can dominate a user's feed
- whether one topic can dominate a user's feed
- whether one reaction can dominate the scoring system

---

# 75. Feed Diversity

A feed built only around relevance can become repetitive.

Audit whether the current system provides appropriate diversity across:

- creators
- topics
- content types
- viewpoints
- social connections

Do not introduce arbitrary diversity merely to make the feed random.

The goal is:

> **Relevant without becoming monotonous.**

---

# 76. Creator Saturation

A creator with many posts should not overwhelm a user's feed simply because their content scores well.

Audit whether the system has sensible controls for:

- repeated creator exposure
- repeated post exposure
- repeated topic exposure

This should coexist with post-level distribution.

---

# 77. Cold Start

Audit the feed for:

### New user

A user with no history should still receive a useful first feed.

Possible signals include:

- onboarding interests
- followed users
- suggested users
- curated pioneer content
- broad high-quality content
- Prioritized content where appropriate

### New creator

A creator with no historical performance should still have a path to discovery.

Do not require historical engagement before a post can ever reach anyone.

---

# 78. Recommendation Audit

Inspect the current account/page recommendation system.

Determine whether recommendations are primarily:

- same-category
- topic similarity
- popularity
- social graph
- complementary needs
- editorial curation
- activity-based
- some combination

Then assess whether the system can support:

> **“Who might this user need?”**

rather than only:

> **“Who looks like this user?”**

---

# 79. Product Recommendation Audit

If product tagging exists, inspect:

- who can create tags
- whether product references are authoritative
- whether users can abuse product URLs
- whether product information can be manipulated
- how sponsored/product content is distinguished
- how external links are handled
- whether tagging affects ranking

---

# 80. Project URL Audit

Inspect:

- unique URL generation
- custom slug creation
- slug collision handling
- reserved paths
- authorization
- updates
- redirects
- deletion behavior
- unpublished projects
- URL enumeration
- abuse
- phishing/spoofing possibilities

A custom Project URL must never bypass Project authorization.

---

# 81. Gifting Audit

Inspect the complete flow:

```text
Sender
 ↓
Gift selection
 ↓
Server-side validation
 ↓
Wallet debit
 ↓
Gift record
 ↓
Recipient wallet credit
 ↓
Notification
 ↓
Discovery eligibility
```

Verify:

- atomicity
- idempotency
- balance integrity
- gift value integrity
- recipient authorization
- duplicate prevention
- transaction history
- notification behavior
- gift → Prioritize discovery relationship

No client-side wallet manipulation should be possible.

---

# 82. Gift Discovery Audit

Verify that:

- only valid gifts establish the relationship
- failed/rolled-back gifts do not establish it
- the recipient can become eligible correctly
- following is not required
- same niche is not required
- profile visits are not required
- Prioritize eligibility remains temporary
- the relationship cannot be forged through API manipulation

---

# 83. Ad Reward Audit

Because this is a financial mechanism, inspect it with the same seriousness as the wallet.

Verify:

- ad revenue source
- revenue allocation
- engagement event recording
- anti-fraud controls
- points calculation
- weekly settlement
- wallet integration
- reconciliation
- duplicate event handling
- advertiser/payment failure handling
- user abuse scenarios

The internal formula can remain private from users while remaining fully auditable by the system.

---

# 84. Comment / Conversation Reward Audit

If comment engagement can generate value:

Verify:

- commenter attribution
- original post attribution
- engagement attribution
- duplicate events
- deleted comments
- moderation
- fraudulent engagement
- bot activity
- self-engagement
- coordinated engagement
- payout/reversal handling

The system should not accidentally reward spammy comments merely because they generate many cheap reactions.

---

# 85. Security and Malicious Client Testing

Treat the client as hostile.

Attempt to manipulate:

- post score
- reaction type
- engagement count
- Prioritize state
- Prioritize owner
- attribution
- recommendation data
- Project price
- wallet balances
- gift value
- reward points
- affiliate/commission data if the affiliate system is also present
- Project access
- custom Project URLs

All authoritative values must be server-side.

---

# 86. Performance Audit

Feed systems can become expensive quickly.

Inspect:

- query complexity
- indexes
- N+1 queries
- repeated ranking computation
- unnecessary client fetches
- expensive joins
- caching
- pagination
- infinite scrolling
- feed generation strategy
- materialized/precomputed data where appropriate

The UI should feel lightweight even if the backend machinery is sophisticated.

---

# 87. Observability

For ranking/recommendation systems, internal debugging is important.

Where practical, Akọ should be able to answer:

> **Why did this post appear in this user's feed?**

Potential internal explanation signals:

- topic match
- social connection
- Prioritize
- post performance
- followed creator
- Project relationship
- other approved signal

This does not mean exposing the secret ranking formula to users.

It means giving the engineering team enough observability to debug the system.

---

# 88. Experimentation

If algorithm changes are introduced, avoid making irreversible changes blindly.

Where practical:

- isolate scoring changes
- version algorithms
- log important ranking decisions
- compare before/after behavior
- monitor abuse
- monitor creator distribution
- monitor topic diversity
- monitor engagement quality

The system should be upgradeable without repeatedly rewriting the feed from scratch.

---

# 89. What Claude Must NOT Do

Do not:

- rebuild the entire feed because this document exists
- replace a better current implementation with the older draft
- blindly hard-code the non-dominance percentages
- create duplicate wallet systems
- create duplicate Project systems
- create duplicate recommendation tables without checking the schema
- assume a product idea is already implemented
- assume an old draft is still the final product decision
- expose internal reward formulas unnecessarily
- trust client-side financial values
- make Prioritize a permanent creator boost
- make Prioritize guarantee engagement
- make disagreement automatically count as negative content quality
- make same-category recommendations the only recommendation strategy
- add complexity without demonstrating product value

---

# 90. Required Final Audit Report

At the end of the work, Claude should provide a structured report containing:

## A. Already Correct

Features that already satisfy the intended behavior.

## B. Correct but Better Than Original Draft

Features where the current implementation has evolved into a stronger implementation.

Explain the improvement.

## C. Partially Implemented

Features that exist but have gaps.

Explain exactly what is missing.

## D. Incorrect

Features whose current implementation contradicts the intended product behavior.

Explain the problem.

## E. Missing

Features that have not yet been implemented.

## F. Security Risks

Any exploitable or potentially exploitable weaknesses.

## G. Performance Risks

Any algorithm/database/backend bottlenecks.

## H. Product Decisions Required

Anything that cannot safely be decided from the existing code and this document.

## I. Changes Made

List every meaningful change.

## J. Tests Performed

List:

- automated tests
- manual tests
- adversarial tests
- database/RLS tests
- financial tests
- feed/ranking tests

---

# 91. Promotion / Reward Product Decisions to Preserve

These are the current product decisions captured from the latest requirements and supersede earlier conflicting drafts:

- Promotion is **feed-only**; there is no paid placement inside comment sections.
- Do not add an ordinary visible **AD** badge merely because content is promoted. Required legal/platform disclosures remain a separate compliance question.
- Promotion is globally controlled by Admin.
- Promotion requires human review before delivery.
- Promoters choose targeting, duration, and daily budget within platform limits.
- Promoters can pause, terminate, or extend but cannot freely mutate approved campaign settings.
- Project tagging is optional.
- No forced CTA is inserted by Akọ.
- Give Back is an admin-controlled reward pool associated with approved promotion economics.
- The policy target is that **50% of advertising money goes back to users**, subject to the final accounting model.
- Engagement weights are internal and admin-configurable.
- Positive and negative point values are allowed.
- Comment-level engagement can reward or penalize the commenter according to internal weights.
- Reward-eligible points should incorporate a verified meaningful-time factor so compressed engagement bursts do not automatically dominate.
- The time factor should be abuse-resistant and preferably diminishing-return rather than a naive linear multiplier.
- Users should not be shown the internal reward formula or a list of reward-bearing posts.
- Users should simply understand that meaningful use and engagement on Akọ can result in wallet earnings.
- All reward calculations must remain internally auditable and financially reproducible.

---

# 92. External Promotion Research Reference

The promotion design was checked against current general advertising-platform patterns and native-ad disclosure guidance.

Google Ads documentation demonstrates common campaign controls around audience targeting, demographics, location, and budgets. citeturn0search2turn0search3turn0search5

FTC native-advertising guidance establishes a separate compliance principle: where advertising could be mistaken for independent/non-commercial content, the commercial nature may need clear disclosure. citeturn0search0turn0search1

This research should inform the architecture, but **Akọ's product behavior must remain driven by its own product philosophy and the legal requirements applicable to its actual launch markets and partners.**

---

# 93. Definition of Done

This audit is complete when:

- the current implementation has been inspected
- every major requirement has been mapped
- existing correct implementations have been preserved
- superior existing implementations have not been downgraded
- missing requirements have been identified
- incorrect implementations have been fixed where appropriate
- algorithm behavior has been traced end-to-end
- feed discovery principles have been verified
- Prioritize behavior has been verified
- social discovery has been verified
- complementary recommendations have been evaluated
- Projects have been audited
- gifting has been audited
- ad rewards have been audited where implemented
- promotion creation, review, delivery, pause, termination, and extension have been audited
- promotion targeting and budget enforcement have been audited
- Give Back accounting and settlement have been audited
- engagement weights and comment-level attribution have been audited
- meaningful-time reward factor and anti-burst protections have been audited
- promotion anti-fraud controls have been tested
- share/repost/forward/bookmark primitives have been audited
- deleted-content/orphan-reference behavior has been audited
- comment deletion admin controls have been audited
- comment media permissions and limits have been audited
- product tagging has been audited
- Project URLs have been audited
- RLS has been audited
- financial invariants have been tested
- malicious-client scenarios have been tested
- performance concerns have been identified
- important ranking behavior is observable internally
- the final audit report clearly distinguishes existing, missing, broken, and improved systems

---

# 94. Final Instruction

**Do not treat this document as a checklist to mechanically satisfy.**

Treat it as a record of Akọ's product philosophy and intended mechanics.

The codebase is the current reality.

This document is the intended direction.

Your job is to compare the two.

Where the codebase is already better:

> **Keep it.**

Where the codebase is correct:

> **Don't touch it unnecessarily.**

Where the implementation is incomplete:

> **Finish it.**

Where the implementation is weaker than the intended product:

> **Upgrade it.**

Where the original product idea is ambiguous:

> **Investigate before changing behavior.**

Where an old numerical rule is inferior to a stronger current implementation:

> **Preserve the stronger implementation and explain why.**

And where security, financial integrity, authorization, or data integrity is involved:

> **Prove it. Don't merely assume it.**

The goal is not to make the code look like this document.

The goal is to make the actual Akọ product **faithfully express the product intent, while becoming more robust, secure, scalable, and coherent than the original drafts.**
