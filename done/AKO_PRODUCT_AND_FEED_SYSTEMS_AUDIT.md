# AKỌ — Product & Feed Systems Audit Specification

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

# 36. Advertising User Earnings

Akọ intends to allocate a portion of advertising revenue to users.

The original product concept is:

> **Half of advertising money is allocated to users.**

Users can accumulate earnings through engagement with sponsored content.

The underlying reward formula is intentionally not exposed to users.

Users should know that regular meaningful participation can potentially result in earnings, without being given a simple public recipe for farming the system.

### Audit requirement

Claude must inspect the current implementation before changing anything.

If the current revenue-share architecture differs from this old draft, document the difference and determine whether the current design better satisfies the product goal.

Do not invent financial behavior that isn't already supported by the payment/revenue architecture.

---

# 37. Engagement-Based Reward Pool

For sponsored content, Akọ may internally assign points/value to engagement.

Potential signals include:

- likes
- dislikes
- saves
- shares
- comments
- reactions to comments
- other meaningful interactions

A particularly important concept:

> **Engagement with someone's comment can also benefit the commenter.**

This means a person can contribute economic value through a conversation even if they did not author the original post.

The system therefore potentially rewards:

- original thinkers
- responders
- people who add useful perspectives

not only original posters.

---

# 38. Weekly Reward Distribution

The original concept is:

At the end of each week:

> The money allocated to users is divided according to accumulated internal points.

The exact reward formula remains an Akọ internal mechanism.

Users should not receive a simple public instruction manual for gaming the reward pool.

### Audit requirement

The implementation must still be transparent enough internally to be:

- auditable
- reproducible
- financially reconcilable
- abuse-resistant

“Secret formula” must never mean:

> “Unexplainable code that cannot be audited.”

---

# 39. Earnings Can Circulate Through Gifting

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

# 40. Product Tagging

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

# 41. Multiple Shareable Project URLs

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

# 42. Custom Project URLs

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

# 43. Creator Monetization

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

# 44. Pioneer Creator Ecosystem

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

# 45. Organic Seed Communities

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

# 46. Pioneer Content Curation

Before broad public distribution, the platform may be seeded with carefully selected creators who embody the Akọ philosophy.

The objective is not to make the feed look artificially busy.

The objective is to make a new user immediately understand:

> **“Ah. This is what people do here.”**

Quality and cultural/product fit matter more than raw signup numbers.

---

# 47. Network Effect Through Meaningful Interactions

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

# 48. Algorithmic Principles to Preserve

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

# 49. Current Implementation Audit

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

# 50. Audit Categories

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

# 51. Algorithm Audit Requirements

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

# 52. Feed Diversity

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

# 53. Creator Saturation

A creator with many posts should not overwhelm a user's feed simply because their content scores well.

Audit whether the system has sensible controls for:

- repeated creator exposure
- repeated post exposure
- repeated topic exposure

This should coexist with post-level distribution.

---

# 54. Cold Start

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

# 55. Recommendation Audit

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

# 56. Product Recommendation Audit

If product tagging exists, inspect:

- who can create tags
- whether product references are authoritative
- whether users can abuse product URLs
- whether product information can be manipulated
- how sponsored/product content is distinguished
- how external links are handled
- whether tagging affects ranking

---

# 57. Project URL Audit

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

# 58. Gifting Audit

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

# 59. Gift Discovery Audit

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

# 60. Ad Reward Audit

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

# 61. Comment / Conversation Reward Audit

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

# 62. Security and Malicious Client Testing

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

# 63. Performance Audit

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

# 64. Observability

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

# 65. Experimentation

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

# 66. What Claude Must NOT Do

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

# 67. Required Final Audit Report

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

# 68. Definition of Done

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
- product tagging has been audited
- Project URLs have been audited
- RLS has been audited
- financial invariants have been tested
- malicious-client scenarios have been tested
- performance concerns have been identified
- important ranking behavior is observable internally
- the final audit report clearly distinguishes existing, missing, broken, and improved systems

---

# 69. Final Instruction

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
