# AKỌ — CONTACT GRAPH / DISCOVER RADAR SYSTEM AUDIT & SURGICAL FEED INTEGRATION

## Purpose

Audit the existing Akọ frontend and backend to discover the relationship graph already created by communication, shared contexts, transactions, collaboration, memberships, and other meaningful activity.

Then surgically connect that graph to the existing **For You** feed.

This is **not** a request to redesign Akọ's feed algorithm.

Akọ already has three Feed tabs:

- **For You**
- **Following**
- **Top Discussions**

The **Contact Graph / Discover Radar affects For You only**.

Do not change the intended behavior of Following or Top Discussions.

---

# 1. CORE PRODUCT IDEA

Akọ contains relationships that are not necessarily follows.

Two people can become meaningfully connected because they:

- communicate,
- belong to the same Group/Room,
- buy or access the same Project,
- collaborate on a Project,
- belong to the same Page/team,
- participate in shared experiences,
- work together,
- or interact through other meaningful Akọ systems.

These relationships form a **Contact Graph**.

The Contact Graph becomes part of the user's **Discover Radar**.

The radar answers:

> **Who is meaningfully connected to this person through Akọ?**

It does not mean:

> **Show this person everything those people post.**

Instead, it creates legitimate discovery opportunities inside the existing **For You** system.

### Canonical example

1. Emeka publishes Post X.
2. Uche and Emeka have a meaningful contact relationship.
3. Emeka engages with Post X.
4. Post X may become eligible for Uche's **For You** discovery through the Contact Graph.
5. The existing For You machinery still determines whether and how the post is ultimately shown.

The Contact Graph is therefore a **discovery signal/path**, not a replacement feed algorithm.

---

# 2. NON-NEGOTIABLE: DO NOT REVAMP THE FEED ALGORITHM

Claude must not use this task to redesign, replace, simplify, rewrite, or re-architect the existing feed algorithm.

Do not create a second feed algorithm.

Do not replace existing ranking logic.

Do not change the meaning of:

- For You
- Following
- Top Discussions

Do not move existing feed responsibilities into the Contact Graph.

Do not introduce a fourth feed tab.

Do not turn Contact Graph into a standalone feed.

Do not blindly create a new scoring system.

Do not discard existing feed work because another architecture appears cleaner.

### The goal is surgical integration.

Read the current implementation first.

Identify the smallest correct architectural insertion point where Contact Graph relationships can contribute to **For You**.

Preserve stronger existing implementations.

Upgrade only where necessary.

---

# 3. FEED TAB BOUNDARIES

## For You

This is the **only** feed surface affected by Contact Graph / Discover Radar.

The Contact Graph may introduce legitimate discovery candidates or relationship context into the existing For You machinery.

## Following

Do not alter the intended behavior of Following.

A Contact relationship must **not** become a Follow.

Do not inject Contact Graph logic into Following merely because shared lower-level infrastructure exists.

If shared infrastructure must be refactored, preserve existing Following behavior exactly.

## Top Discussions

Do not alter Top Discussions.

Do not make Contact Graph a new ranking mechanism for Top Discussions.

Do not allow a contact relationship to redefine what qualifies as a Top Discussion.

### Explicit rule

> **Contact Graph / Discover Radar affects For You only.**

---

# 4. INSPECT THE CURRENT CODEBASE FIRST

Before changing code, inspect the complete existing implementation.

Read both:

- frontend
- backend

Trace the actual execution path from:

**user activity → database state → backend query/function → candidate generation → ranking → For You rendering**

Inspect:

- Feed pages
- Feed tabs
- post components
- feed hooks
- feed queries
- Supabase queries
- RPCs
- Edge Functions
- database functions/views
- follows
- messaging
- Projects
- purchases/access
- Groups/Rooms
- Pages
- team membership
- collaborations
- Events
- Meetings
- Courses
- Gigs
- notifications
- shares/reposts
- saves/bookmarks
- recommendations
- existing discovery logic
- candidate generation
- ranking/scoring
- diversity controls
- repetition controls
- blocks/privacy/moderation
- analytics
- feature flags
- Admin controls

Do not infer architecture from filenames alone.

---

# 5. DISCOVER THE CONTACT GRAPH FROM THE EXISTING PRODUCT

Do not assume the full list of contact sources in this document is exhaustive.

The Contact Graph may already exist implicitly across many systems.

Do not search only for a table called `contacts`, `connections`, or `relationships`.

Reconstruct the graph from the actual application architecture.

The purpose is to discover:

> **What existing Akọ relationships should legitimately make one person's activity discoverable to another person through For You?**

---

# 6. KNOWN CONTACT SOURCES TO AUDIT

At minimum investigate:

## 6.1 Communication / Chat

If two users communicate meaningfully through Akọ, investigate whether that establishes a contact relationship.

Example:

Emeka ↔ Uche chat

→ Contact relationship

Then:

Emeka engages with Post X

→ Post X may become eligible for Uche's For You discovery.

Audit:

- what counts as communication,
- whether one message is enough,
- whether both users must communicate,
- deleted messages,
- blocked users,
- old conversations,
- relationship duration,
- recency/decay,
- directional vs mutual semantics.

Do not invent these answers without inspecting the existing product.

---

# 7. SHARED GROUP / ROOM

If two users belong to the same Group/Room, investigate the relationship.

Example:

Emeka + Uche

→ same Room

→ shared context

→ contact relationship candidate.

Audit:

- membership lifecycle,
- active vs former members,
- private Rooms,
- membership duration,
- moderator/admin roles,
- leaving,
- removal,
- Room deletion.

Do not assume every historical membership remains equally relevant.

---

# 8. SHARED PROJECT PURCHASE / ACCESS

If two users legitimately buy or gain access to the same Project, investigate whether this creates contact.

Example:

Emeka buys Project A.

Uche buys Project A.

→ shared Project relationship.

Use authoritative access/purchase state.

Audit:

- paid purchases
- free access
- gifted access
- redeemed access
- Course enrollment
- Room membership
- refunds
- revoked access
- expiration
- cancellations

Do not treat merely viewing a Project as equivalent to purchasing/accessing it unless the existing product intentionally does so.

---

# 9. COLLABORATION

Collaboration is a potentially strong relationship.

Example:

Emeka + Uche collaborate on a Project.

→ professional/work relationship.

Inspect:

- collaboration requests
- accepted/declined states
- contributors
- roles
- ownership
- Gig portfolio relationships

Only an authoritative accepted collaboration should create an accepted collaboration relationship.

A declined or ignored invitation must not create meaningful contact merely because an invitation was sent.

---

# 10. PAGE / TEAM MEMBERSHIP

If users belong to the same Page/team, investigate whether that creates contact.

Example:

Emeka + Uche

→ team members of Page X

→ shared organizational context.

Audit:

- active membership
- historical membership
- roles
- administrators
- editors
- contributors
- revoked membership
- private Pages
- organization boundaries

Do not expose private organizational information through discovery.

---

# 11. DISCOVER OTHER CONTACT SOURCES

This is a core requirement.

Claude must inspect the entire codebase and identify **other existing relationships** that could legitimately contribute to Discover Radar.

Investigate areas such as:

- follows
- mutual follows
- Events
- Meetings
- Courses
- Gigs
- professional work relationships
- shared Projects
- Project participation
- gifting
- affiliate relationships
- shares
- reposts
- saves
- comments
- Support
- Disagree
- Push Back
- meaningful post interactions
- profile interactions
- creator/customer relationships
- Page relationships
- other communication systems
- any relationship represented by existing database entities

These are candidates, not automatic requirements.

### Important

Do not make every interaction a Contact.

For every candidate relationship, determine whether it represents a sufficiently meaningful connection to justify discovery.

---

# 12. CONTACT SOURCE EVALUATION

For every discovered contact source, document:

1. **Relationship name**
2. **Creation event**
3. **Direction** — mutual, directional, creator/participant, organization/member, etc.
4. **Strength/context**
5. **Duration/lifecycle**
6. **Discovery role** — candidate source, signal, context, or other
7. **Content scope**
8. **Privacy implications**
9. **Abuse/manipulation risk**
10. **Existing implementation and authoritative source**

Do not assign arbitrary numerical weights before understanding the existing feed.

---

# 13. CONTACT GRAPH IS NOT THE FOLLOW GRAPH

A Follow is one relationship type.

A Contact is a broader discovery relationship.

Example:

Uche does not follow Emeka.

But they:

- chat,
- share a Room,
- bought the same Project,
- or collaborated.

They may therefore still be connected through Discover Radar.

Conversely:

Uche follows Emeka.

That does not mean Contact Graph should replace Following.

Do not mutate follows as a side effect of creating a Contact.

No automatic:

- follow
- unfollow
- subscription
- notification subscription

should occur.

---

# 14. CONTACT GRAPH IS NOT AUTOMATIC CONTENT EXPOSURE

A contact relationship must not mean:

> "Show me everything this person does."

It means:

> "This person is part of my meaningful Akọ discovery context."

Their content must still pass through the existing For You eligibility/ranking architecture.

Respect existing:

- eligibility
- moderation
- privacy
- blocking
- mute/restriction behavior
- deletion
- diversity
- repetition controls
- performance
- freshness
- Prioritize
- other feed rules

Do not create an unconditional bypass.

---

# 15. EMeka → UCHE CANONICAL TEST

### Initial state

Uche does not follow Emeka.

### Relationship

Emeka and Uche communicate through Akọ.

Therefore:

**Emeka ↔ Uche = Contact**

### Content activity

Emeka engages meaningfully with Post X.

### Discovery

Post X may become eligible for Uche's **For You** feed through Contact Graph.

### It must NOT:

- enter Following because of the contact,
- enter Top Discussions because of the contact,
- guarantee a view,
- guarantee engagement,
- create a follow,
- bypass privacy,
- bypass moderation,
- replace ranking,
- create creator-level permanent reach.

It creates a legitimate **For You discovery pathway**.

---

# 16. MULTIPLE CONTACT PATHS

A user may have several relationship types with another user.

Example:

Emeka and Uche:

- chat,
- share a Room,
- bought the same Project,
- collaborated,
- belong to the same Page team.

Do not blindly multiply these into five independent feed boosts.

Treat them as multiple edges/context between the same pair where appropriate.

If Post X is eligible through multiple contact paths:

- deduplicate the post,
- do not show it multiple times,
- do not accidentally create multiplicative reach.

Inspect existing feed diversity/ranking before determining how multiple edges contribute.

---

# 17. MEANINGFUL CONNECTION OVER RAW ACTIVITY

The purpose is not maximum reach.

The purpose is better discovery.

The central question is:

> **What content from people meaningfully connected to this person might be worth putting in front of them?**

Not:

> **How many ways can we make one person's content appear?**

Audit protection against:

- contact farming
- spam messaging
- Room farming
- fake purchases
- fake collaborations
- Page farming
- engagement rings
- automated activity
- manufactured relationships

Reuse existing anti-abuse infrastructure.

---

# 18. RELATIONSHIP LIFECYCLE

Audit what happens when a relationship changes.

Examples:

### Chat

- conversation deleted
- user blocked
- account deleted

### Room

- user leaves
- membership revoked
- Room deleted

### Project

- purchase refunded
- access revoked
- Project deleted

### Collaboration

- collaboration declined
- collaboration removed
- contributor attribution revoked

### Page

- member removed
- Page deleted
- role changed

The Contact Graph must not retain invalid relationships indefinitely unless that is an intentional product rule.

---

# 19. BLOCKING, PRIVACY AND SAFETY OVERRIDE CONTACT

Contact Graph must never override:

- blocks
- privacy settings
- moderation
- restricted content
- deleted content
- account suspension
- Project access restrictions
- Page privacy
- Room privacy
- content visibility

If Uche blocks Emeka, contact-derived discovery from Emeka must not continue merely because a historical edge exists.

Follow the existing privacy architecture.

---

# 20. EXISTING FOR YOU ARCHITECTURE REMAINS AUTHORITATIVE

Claude must identify where the current For You feed obtains:

- candidates
- eligibility
- scores
- ranking
- diversity
- repetition
- freshness
- social signals
- performance signals
- Prioritize
- other discovery signals

Then determine the least invasive place to introduce Contact Graph.

Possible approaches include:

- adding Contact Graph as a candidate source,
- adding contact-derived candidates to an existing pool,
- adding contact context to an existing score,
- widening existing eligibility,
- another approach that better fits the current codebase.

Choose based on the actual architecture.

Do not prescribe a new architecture simply because it sounds cleaner.

---

# 21. NO SECOND ALGORITHM

There must remain one coherent For You system.

Avoid:

```text
Existing For You algorithm
+
separate Contact algorithm
+
merge results
```

unless the current architecture already works this way and the change is genuinely required.

Prefer integration into the existing candidate/ranking infrastructure.

The Contact Graph is a **relationship signal/path**, not a second recommendation engine.

---

# 22. DO NOT CHANGE FOLLOWING

Following remains Following.

Do not:

- inject contact-derived content into Following,
- change Following ranking,
- redefine Following candidates,
- turn Contact relationships into follows.

If shared infrastructure is refactored, verify behavior remains unchanged.

---

# 23. DO NOT CHANGE TOP DISCUSSIONS

Top Discussions remains Top Discussions.

Do not:

- add Contact Graph ranking,
- change its engagement definition,
- change its candidate generation,
- make contact relationships determine what becomes a Top Discussion.

Contact Graph is **For You-only**.

---

# 24. CONTACT GRAPH AND EXISTING FEED SIGNALS

Inspect the existing feed's:

- topic/interest relevance
- social activity
- performance
- freshness
- diversity
- repetition
- Prioritize
- other ranking signals

Contact Graph should complement these systems.

Do not remove or weaken existing signals.

Do not build a competing formula without evidence that the existing architecture requires it.

---

# 25. CONTACT GRAPH AND PRIORITIZE

Inspect the existing Prioritize implementation.

Contact Graph must not replace Prioritize.

If a Prioritized post is also Contact-derived, preserve existing Prioritize semantics and let the existing feed architecture determine how signals combine.

Do not create a new special-case ranking system unless required.

---

# 26. CONTACT GRAPH AND VIRALITY

Contact Graph must not create creator-level virality.

If one Emeka post performs well, that does not mean all Emeka posts become Contact-distributed.

Keep existing post-level performance behavior.

---

# 27. CONTACT GRAPH AND INTERESTS

Do not replace topics/interests.

Interests answer one kind of question:

> "What does this user tend to care about?"

Contact Graph answers another:

> "What meaningful people around this user are doing something worth discovering?"

Both can coexist inside For You.

---

# 28. CONTACT GRAPH AND DIVERSITY

Contact relationships must not allow one person to dominate the feed.

Respect existing:

- creator caps
- repetition controls
- topic diversity
- candidate deduplication
- content diversity

Do not bypass these protections because a candidate came through Contact Graph.

---

# 29. "WHY DID THIS APPEAR?" INTERNAL OBSERVABILITY

If the existing feed has internal debugging/explanation infrastructure, extend it.

It should be possible internally to determine:

> Post X appeared for Uche because Emeka was connected through [source].

Examples:

- Contact: Chat
- Contact: Shared Room
- Contact: Shared Project
- Contact: Collaboration
- Contact: Page Team
- Contact: Other discovered source

This is primarily for internal debugging/observability.

Do not expose secret ranking formulas to users.

---

# 30. ANALYTICS

Inspect existing feed analytics.

Where useful, distinguish Contact Graph discovery from other discovery pathways.

Potential events:

- contact relationship created
- relationship invalidated
- contact-derived candidate generated
- contact-derived impression
- contact-derived engagement
- candidate filtered by eligibility
- candidate filtered by privacy
- candidate filtered by diversity
- duplicate candidate prevented

Reuse existing analytics patterns.

---

# 31. ABUSE AND MANIPULATION

Audit whether users can deliberately manufacture Contact Graph reach.

Threats include:

### Chat farming

Meaningless messages solely to create contact.

### Room farming

Joining Rooms solely to manufacture edges.

### Purchase farming

Artificial transactions to create shared Project relationships.

### Collaboration farming

Fake collaborations to create professional edges.

### Page farming

Repeatedly adding/removing team members.

### Engagement farming

Low-value activity intended solely to trigger discovery.

Contact Graph should reflect meaningful relationships, not raw activity volume.

---

# 32. TEMPORAL BEHAVIOR

Investigate whether relationships need:

- recency
- decay
- expiration
- active/inactive state

Do not assume every historical relationship should remain equally relevant forever.

Do not invent aggressive decay without understanding the existing product.

Document the chosen behavior.

---

# 33. SERVER AUTHORITATIVE

The client must never decide:

> "I am connected to Emeka, therefore show me his posts."

The server must determine:

- whether the relationship exists,
- whether it is active,
- whether it is usable for discovery,
- whether content is eligible,
- whether privacy permits exposure,
- whether the candidate enters For You.

Never trust client-supplied:

- contact IDs
- relationship strength
- candidate eligibility
- feed scores

---

# 34. RLS / AUTHORIZATION

Audit all relationship sources under Supabase RLS.

A user must not be able to:

- enumerate another user's private contact graph,
- inspect hidden relationships,
- discover private membership,
- manufacture Contact edges,
- modify relationship strength,
- modify discovery eligibility,
- bypass privacy.

Contact Graph can remain an internal discovery concept.

It does not automatically need a user-facing Contacts page.

---

# 35. PRIVACY LEAK ANALYSIS

Shared-context relationships require special care.

If Uche sees a post from Emeka because of a private Room relationship, the system must ensure Uche is already legitimately entitled to know the relevant context.

Audit:

- private Rooms
- private Pages
- private Projects
- hidden teams
- private collaborations
- private chats

Discovery must not become an indirect privacy leak.

---

# 36. PERFORMANCE

Contact Graph must not make For You unnecessarily expensive.

Inspect:

- query complexity
- joins
- N+1 patterns
- RPC performance
- Edge Function latency
- pagination
- caching
- candidate pool size
- relationship lookups
- large Rooms
- large Pages
- users with many Projects
- users with many communications

Do not fetch an entire contact graph into the client.

Do not perform per-post relationship queries when batching or existing abstractions can handle the job.

---

# 37. LARGE-GRAPH BEHAVIOR

Test extreme cases:

- user belongs to 100+ Rooms
- user has thousands of Project relationships
- user has thousands of communication relationships
- Page has thousands of team members
- creator has a huge audience
- one user has many relationship edges

Do not allow unbounded candidate explosion.

---

# 38. MULTI-EDGE DEDUPLICATION

If the same post is discovered through multiple contact paths:

Example:

Emeka is both:

- Uche's chat contact,
- Room member,
- Project collaborator.

Post X qualifies through all three.

The final feed must not show Post X three times.

Deduplicate candidates before rendering.

---

# 39. PROJECT ECOSYSTEM AUDIT

Because Projects are central to Akọ, inspect every Project relationship:

- creator
- buyer
- participant
- member
- collaborator
- contributor
- affiliate
- attendee
- course student
- Room member
- Meeting participant
- Event participant

Determine which relationships create meaningful person-to-person discovery context.

Do not treat all Project relationships as equivalent.

---

# 40. GIG / PROFESSIONAL WORK RELATIONSHIPS

Inspect the Gig architecture.

Accepted professional work relationships may be meaningful discovery context.

Examples:

- photographer + cinematographer
- music producer + singer
- editor + director
- designer + client

But do not create Contact edges merely because two Gigs exist.

Use authoritative work/collaboration relationships.

---

# 41. PAGES AND USERS

Audit both:

- person accounts
- Pages

A Page may contain:

- followers
- team members
- Projects
- posts
- collaborators
- customers
- members

Determine which user/Page relationships can legitimately influence For You.

Do not assume user-to-user and user-to-Page relationships have identical semantics.

---

# 42. NO USER-FACING CONTACT MANAGEMENT BY DEFAULT

Do not automatically create a Contacts page.

The term **Contact Graph / Discover Radar** describes an internal product system unless the existing UX clearly calls for user-facing management.

The intended user experience is primarily:

> **Better discovery in For You.**

---

# 43. FUTURE-PROOF THE GRAPH

Future Akọ features may create new meaningful relationships.

The architecture should allow new relationship sources to be added without rebuilding the Feed.

Conceptually:

```text
Existing Akọ relationships
        ↓
Contact Graph
        ↓
Discover Radar
        ↓
Existing For You pipeline
```

Do not hard-code the entire system around only today's examples.

---

# 44. IMPLEMENTATION PHASES

## Phase 1 — Reconnaissance

Read frontend and backend.

Map:

- Feed
- For You
- Following
- Top Discussions
- relationship systems

## Phase 2 — Relationship inventory

Create an internal inventory of every discovered contact source.

For each:

- source
- creation event
- authority
- lifecycle
- privacy
- meaningfulness
- abuse risk
- current implementation
- recommended discovery role

## Phase 3 — Architecture decision

Choose the least invasive integration point.

## Phase 4 — Backend

Implement authoritative relationship derivation/reuse.

Secure it with existing authorization/RLS patterns.

## Phase 5 — For You integration

Connect Contact Graph to the existing For You pathway.

Do not rewrite the algorithm.

## Phase 6 — Frontend

Only make frontend changes required to support the behavior.

Do not redesign Feed UI.

Do not change tabs.

## Phase 7 — Testing

Test creation, invalidation, discovery, privacy, deduplication, performance and abuse.

## Phase 8 — Final audit

Document exactly what was discovered and changed.

---

# 45. REQUIRED TEST MATRIX

## Communication

- two users chat
- one engages with a post
- other becomes eligible for contact-derived For You discovery
- no Follow mutation

## Shared Room

- both join Room
- activity creates appropriate discovery context
- leaving/removal handled correctly

## Shared Project

- both legitimately gain access
- activity creates appropriate discovery context
- refund/revocation handled

## Collaboration

- requested
- declined
- accepted
- accepted collaboration creates appropriate relationship
- revoked collaboration handled

## Page team

- both become team members
- appropriate discovery context
- removed member handled

## Multiple edges

- same pair has several relationship sources
- no duplicate post
- no artificial multiplicative reach

## Following

Verify Contact Graph does not alter Following.

## Top Discussions

Verify Contact Graph does not alter Top Discussions.

## Privacy

Private relationships do not leak.

## Blocking

Blocked relationships cannot continue contact-derived discovery.

## Performance

Large graphs do not create candidate explosions or N+1 queries.

## Client manipulation

Attempt to forge:

- contact relationships
- relationship strength
- candidate eligibility
- feed scores

Server must reject unauthorized manipulation.

---

# 46. REGRESSION TESTS

Verify existing:

- For You
- Following
- Top Discussions
- pagination
- refresh
- infinite scrolling
- loading states
- empty states
- error states
- deleted posts
- blocked users
- moderated posts
- Prioritize
- social activity signals
- interest signals
- diversity
- repetition controls

No unrelated Feed regression is acceptable.

---

# 47. DEFINITION OF DONE

- [ ] Frontend Feed architecture inspected.
- [ ] Backend Feed architecture inspected.
- [ ] For You traced end-to-end.
- [ ] Following understood and behaviorally preserved.
- [ ] Top Discussions understood and behaviorally preserved.
- [ ] Existing relationship sources inventoried.
- [ ] Chat audited.
- [ ] Shared Group/Room audited.
- [ ] Shared Project purchase/access audited.
- [ ] Collaboration audited.
- [ ] Page/team membership audited.
- [ ] Additional contact sources discovered from the actual codebase.
- [ ] Every proposed source evaluated for meaningfulness.
- [ ] Existing authoritative relationship data reused where possible.
- [ ] No unnecessary duplicate relationship system created.
- [ ] Contact Graph is server-authoritative.
- [ ] RLS/privacy/security audited.
- [ ] Relationship lifecycle handled.
- [ ] Contact candidates deduplicated.
- [ ] Contact relationships cannot manufacture uncontrolled reach.
- [ ] Existing diversity/repetition protections remain active.
- [ ] Existing Prioritize behavior remains intact.
- [ ] Existing interest/social/performance signals remain intact.
- [ ] Contact Graph affects **For You only**.
- [ ] Following unchanged.
- [ ] Top Discussions unchanged.
- [ ] Feed UI not unnecessarily redesigned.
- [ ] No second feed algorithm introduced.
- [ ] No second recommendation engine introduced.
- [ ] Performance tested.
- [ ] Concurrency/lifecycle edge cases tested.
- [ ] Malicious client manipulation tested.
- [ ] Regression tests pass.
- [ ] Final report explains exactly where Contact Graph was integrated and why.

---

# 48. FINAL CLAUDE INSTRUCTION

You are **not** being asked to redesign Akọ's Feed.

You are being asked to discover the relationship graph that already exists inside Akọ and make the existing **For You** feed intelligently aware of it.

Read the repository first.

Read the frontend.

Read the backend.

Trace the existing Feed architecture.

Trace For You.

Trace Following.

Trace Top Discussions.

Discover the relationship sources already represented by the application.

Start with:

- communication,
- shared Groups/Rooms,
- shared Project purchases/access,
- collaborations,
- Page/team membership,

then discover other legitimate sources from the actual codebase.

Do not assume this list is complete.

Do not assume every interaction should become a Contact.

Do not build a generic contact system just because the concept is called Contact Graph.

Do not rewrite the Feed algorithm.

Do not create a new ranking engine.

Do not change Following.

Do not change Top Discussions.

Do not redesign the Feed.

Find the **smallest, cleanest, safest architectural point** where Contact Graph / Discover Radar can be introduced into the existing **For You** pipeline.

Preserve what is already good.

If the existing implementation is stronger than a proposed change, keep it.

If an existing relationship system can be reused, reuse it.

If a new abstraction is genuinely required, introduce only what is necessary.

The intended product behavior is:

> **Akọ knows who a user is meaningfully connected to through the things they do on Akọ. The For You feed can use those relationships to discover relevant activity from those people.**

The Contact Graph is the relationship context.

The Discover Radar is the discovery mechanism.

**For You remains the feed.**

And the central rule is:

> **Surgically add the radar. Do not rebuild the machine.**
