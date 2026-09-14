# AKỌ CONSTITUTION

Canonical product principles, architecture, priorities and decision authority.

## 1. Purpose

Akọ now has many feature-specific specifications. This document is the canonical product-governance layer that keeps them coherent.

When specifications conflict, Claude must inspect the repository, identify the conflict, preserve stronger existing implementation, apply the newest explicit product decision where known, and never silently invent major behavior.

## 2. Supreme rule

**Inspect first. Preserve what works. Upgrade what is weak. Never rebuild blindly.**

The repository is the implementation source of truth. This Constitution is the product-principles source of truth. Feature MDs describe intended behavior for particular systems.

## 3. What Akọ is

A social/product platform for people who have something to **say, make, teach, host, or share**.

Core loop:

**Say it → discuss it → gather people around it → build it → let people pay to participate.**

The Feed is the social/discovery layer. Projects are the creation/value layer. Akọ connects expression, discussion, discovery, relationships, creation, participation and economic value.

## 4. What Akọ is not

Akọ is not merely a generic social network, Instagram clone, TikTok clone, Spotify clone, marketplace with a feed, or generic creator dashboard.

Akọ may learn from successful products without surrendering its own product logic.

## 5. Identity

Akọ is culturally grounded without needing to be reduced to the label “African.”

Cultural identity should appear through naming, artifacts, illustration, history, creative expression and product philosophy. Do not turn every interface into cultural decoration.

**Cultural identity should feel native, not pasted on.**

## 6. Product feel

Akọ should feel simple, soft, premium, lightweight, intelligent, expressive, calm where appropriate, alive without being noisy, and culturally confident.

**Complex product underneath. Simple experience on top.**

## 7. Core objects

**Account** = person, creator, organization or Page.

**Project** = canonical work, experience, knowledge product, media or other thing being created/distributed.

**Gig** = professional/service identity through which an account presents work, services, catalogue and portfolio.

A Project is not a Gig. A Gig is not a Project. A profile is not a personal library.

## 8. Project is the work

Projects remain canonical. Gigs, portfolios, music catalogue, affiliates, purchases, library/access, posts and notifications may reference Projects.

Do not duplicate the underlying Project merely because another surface displays it.

## 9. Gig is professional identity

One account can have multiple independent Gigs.

Example:

```text
Account
├── Music Producer — EMK Beatz
├── Cinematographer — Emeka Visuals
├── Movie Director — Emeka Obi Films
└── Graphics Designer — Obi Creative
```

Each Gig may have its own professional name, description, services, pricing, FAQ, portfolio and catalogue.

## 10. Role vs work category

Role describes **how someone contributed**. Work category describes **what kind of work exists**.

Cinematographer → Film portfolio.
Photographer → Photography portfolio.
Music Producer → Artist/Music portfolio.
Graphics Designer → Design portfolio.

Do not collapse professional role and portfolio category into the same concept.

## 11. Accepted collaboration

A tagged collaborator does not automatically have accepted professional attribution.

Where collaboration requests exist:

```text
Creator credits collaborator
↓
Collaborator accepts
↓
Akọ establishes accepted contribution
↓
Relevant Gig/portfolio can reference the canonical work
```

Contribution does not transfer ownership.

## 12. Profile

Profile is **social identity + discovery + meaningful body of work**.

It should not be limited to a generic Posts | Projects model. Meaningful work categories may appear dynamically:

```text
Posts | Books
Posts | Artist | Books
Posts | Film | Photography
```

Categories appear because meaningful eligible work exists.

## 13. Profile vs Library

Profile answers: **What does this person create or do?**

Library answers: **What do I have access to?**

**Things users have access to should have a home.**

## 14. Feed

Akọ Feed has:

- For You
- Following
- Top Discussions

These are distinct surfaces. Do not merge them or introduce a fourth feed without explicit product approval.

## 15. For You

For You is the primary discovery environment. Existing interests, social signals, performance, relevance, Contact Graph, Prioritize, freshness, diversity and repetition controls may contribute.

It remains one feed system.

## 16. Following

Following represents the follow relationship.

Contact is not Follow. Purchase is not Follow. Collaboration is not Follow. Gift is not Follow. Chat is not Follow.

Do not mutate the follow graph as a side effect of other relationships.

## 17. Top Discussions

Top Discussions remains its own product surface. Contact Graph / Discover Radar must not redefine it.

## 18. Contact Graph / Discover Radar

Contact Graph represents meaningful relationships already created through Akọ activity.

Known sources include communication/chat, shared Groups/Rooms, shared Project purchase/access, collaboration and Page/team membership. Claude must inspect the repository for other legitimate sources.

The graph is relationship context, not a generic contacts-management product.

## 19. Contact Graph boundary

**Contact Graph / Discover Radar affects For You only.**

Architecture:

```text
Existing Akọ relationships
↓
Contact Graph
↓
Discover Radar
↓
Existing For You pipeline
```

Do not create a second feed algorithm or recommendation engine.

## 20. Contact is not automatic exposure

A contact relationship does not mean “show me everything this person does.”

Content must still pass eligibility, moderation, privacy, blocking, diversity, repetition, freshness and ranking rules.

## 21. Multiple relationship paths

If two users chat, share a Room, bought the same Project and collaborated, these must not become four uncontrolled feed boosts.

If a post qualifies through multiple paths, deduplicate it. Relationship context must not manufacture unlimited reach.

## 22. Prioritize

Prioritize is post-level, not creator-level.

It is not an advertisement, guaranteed engagement, permanent reach or generic follower expansion.

Its intended behavior is content-slot preference: a prioritized post receives preference among opportunities that would otherwise go to that creator's other posts.

## 23. Gift → Prioritize bridge

A gift may create a special For You discovery opportunity for the recipient when the sender has a valid Prioritized post.

It does not create a Follow, chat, connection or obligation.

**A gift opens an opportunity to be seen, not an obligation to connect.**

Safety, privacy, blocking and moderation always override.

## 24. Virality

Virality is post-level.

One viral post does not permanently make every later post from that creator viral. Every post earns its distribution.

## 25. Feed diversity

Akọ should avoid creator domination, topic monotony, repetitive content and viewpoint monoculture.

Diversity should improve discovery, not become random noise.

## 26. Recommendations

Where recommendation systems exist, Akọ should consider useful relationships, not only similarity.

**Recommend people a user may need, not merely people who look like the user.**

Use the actual repository taxonomy rather than hard-coding an enormous future graph.

## 27. Creation

Akọ is for people who have something to say, make, teach, host or share.

Creation should feel inviting and use progressive disclosure.

## 28. Creation eligibility

Everyone can participate. Creation of certain Project types may be progressively earned.

**Everyone can participate. Creation is earned progressively.**

The client can explain eligibility. The server decides eligibility.

## 29. Admin bypass

Any eligibility bypass for testing or operations must be server-side, scoped, auditable, revocable and ideally expiring.

**Bypass is a controlled override, never a backdoor.**

## 30. Economic purpose

Akọ should enable value from knowledge, creativity, skills, contribution, participation and distribution.

Someone does not need to be a celebrity to potentially make money from useful work.

## 31. Wallet

Financial balances are server-authoritative.

The client cannot create money, alter balances, choose arbitrary authoritative values, or bypass payout/eligibility rules.

## 32. Ledger

Every meaningful balance change must be reconstructable.

Every financial mutation needs a traceable source, unique transaction identity and auditability.

## 33. Gifts

A gift is **money wrapped in a cultural object**.

The artifact is the social/identity wrapper; the value is economic.

A gift does not require acceptance and does not automatically create a Follow, connection, chat or engagement.

## 34. Payouts

The intended rhythm is:

```text
Monday → earn
Tuesday → earn
Wednesday → earn
Thursday → earn
Friday → withdraw
Saturday → receive
```

The product should promise only what operations and payment providers can reliably support.

## 35. Affiliate system

Creators create value. Affiliates distribute value. Buyers purchase value. Akọ coordinates attribution and settlement.

An affiliate fork is a **commercial referral instance, not ownership**.

The original creator remains owner.

## 36. Persistent attribution

If a buyer discovers a Project through an affiliate and later purchases directly, the affiliate can still receive commission under the configured attribution window.

Recommended deterministic MVP rule: **first qualifying affiliate referral wins**.

## 37. Give Back

Give Back is an Admin-defined reward pool attached to an approved promotion.

It is not “tap button → guaranteed money.”

It rewards meaningful validated contribution. Internal points/formulas remain protected from farming. Distribution uses the authoritative wallet/ledger.

## 38. Promotion

Promotion uses an existing post for paid distribution.

It must respect content eligibility, moderation, authorization, disclosure and existing Feed infrastructure.

Do not create a parallel feed system.

## 39. Music

Akọ is not building Spotify.

Music is a creative, attribution and discovery layer:

```text
Audio Project
↓
Publish Music
↓
Catalogue
↓
Use in post
↓
Attribution
↓
Artist
↓
Gig/Profile
↓
Projects
```

**Music is atmosphere, attribution and discovery — not the post itself.**

## 40. Free music

Free catalogue usage does not automatically create a financial obligation for Akọ.

Do not create fake royalties or wallet balances for free use.

Paid usage, if introduced, becomes a real transaction through secure financial infrastructure.

## 41. Messaging

Messaging should be familiar and effortless.

**Familiar first, Akọ second.**

Do not compromise privacy/security for convenience. If E2EE is claimed, only claim what the implementation actually guarantees.

## 42. Onboarding

Onboarding should feel like entering a living community, not filling a form.

Core flow:

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
Initial Feed
↓
Main app
```

## 43. Pioneers

Early creators should establish real quality and culture.

Pioneers are not merely influencers. The objective is to make the first ecosystem feel alive with people who genuinely fit Akọ's philosophy.

## 44. Desktop

Desktop is not a stretched mobile interface.

**Same Akọ. Different expression.**

Desktop may use persistent sidebar navigation, wider compositions, multi-column layouts and keyboard interaction. Mobile may use bottom navigation and touch-first layouts.

Product truth remains shared.

## 45. UX

The user should not have to admire the UX.

They should simply find themselves:

**scrolling → discovering → reading → reasoning → creating → connecting → building → returning.**

**Make Akọ feel easy.**

## 46. Motion and sound

Motion should explain change, confirm actions and provide orientation.

Sound is product feedback, not decoration.

**Add life, not noise.**

## 47. Security

Never trust the client for:

- money
- permissions
- eligibility
- prices
- commissions
- contribution splits
- payout destinations
- reward points
- access rights

RLS and server-side authorization remain authoritative.

## 48. No duplicate systems

Before creating a new table, service, graph, recommendation engine, wallet, ledger, Project system, messaging system or Gig system, search the repository.

If an existing system is strong:

**Reuse it.**

## 49. Conflict resolution

When feature MDs conflict:

1. Inspect the repository.
2. Identify the conflicting rules.
3. Check for explicit newer product decisions.
4. Apply constitutional invariants.
5. Preserve stronger existing implementation.
6. Do not silently choose a major product/financial/privacy behavior.
7. Document unresolved conflicts.

## 50. What belongs here

Constitutional rules are durable product truths.

Examples:

- server authority over money;
- Project is canonical work;
- Gig is professional identity;
- Contact Graph affects For You only;
- Contact is not Follow;
- acquired content has a home;
- privacy/safety override discovery;
- mobile must not regress;
- no duplicate business systems;
- inspect before rebuilding.

## 51. What does not belong here

Do not put fragile implementation details here unless they become true product invariants.

Examples:

- CSS pixel values;
- exact component names;
- exact table names;
- temporary reward percentages;
- exact animation durations;
- temporary thresholds;
- provider-specific implementation details.

## 52. Product priority

When priorities conflict:

1. Safety/security
2. Financial integrity
3. Core user journeys
4. Product correctness
5. Navigation/discoverability
6. Performance
7. Accessibility
8. Polish
9. Delight

Never sacrifice the first four for visual novelty.

## 53. Trust

A prettier system that is less secure is a regression.

A smoother purchase that can double-charge is a regression.

A beautiful Feed that violates privacy is a regression.

## 54. The Akọ graph

Think of the product as a connected system:

```text
People
↓
Posts / Discussions / Messages
↓
Discovery / Contact
↓
Projects
↓
Access / Library
↓
Collaboration
↓
Gigs / Portfolio
↓
Money
↓
Wallet / Payout
```

The UI should reveal legitimate relationships without exposing unnecessary complexity.

## 55. The Akọ loop

At the highest level:

**EXPRESS → DISCOVER → REASON → CONNECT → CREATE → PARTICIPATE → VALUE → RETURN**

## 56. The Akọ standard

A feature should be obvious without being simplistic.

A design should be beautiful without being decorative.

A system should be powerful without being complicated.

A recommendation should be useful without feeling forced.

A monetization feature should be valuable without feeling extractive.

A cultural reference should feel native without becoming a costume.

## 57. Final Claude operating mode

You are inheriting a living product, not starting a blank project.

For every major task:

**Inspect → Understand → Map → Verify → Preserve strengths → Identify gaps → Reconcile → Implement surgically → Test → Report.**

Do not treat an MD as a blind checklist.

## 58. Required final report

After substantial work, report:

- what was already good;
- what changed;
- what was deliberately preserved;
- what the repository revealed;
- what conflicts were found;
- what decisions were made;
- what risks remain;
- what was tested;
- what should happen next.

## 59. The one-page Constitution

### AKỌ IS
A social/product platform for people who have something to say, make, teach, host or share.

### THE LOOP
Say → Discuss → Gather → Build → Participate → Value.

### THE OBJECTS
Account → Project → Gig → Portfolio → Access → Wallet.

### THE FEED
For You → Following → Top Discussions.

### THE DISCOVERY RULE
Contact Graph / Discover Radar affects For You only.

### THE CREATOR RULE
Everyone can participate. Creation is earned progressively.

### THE PROFESSIONAL RULE
One account can have many independent Gigs.

### THE PORTFOLIO RULE
Role describes contribution. Work type determines portfolio category.

### THE ACCESS RULE
Things you have access to should have a home.

### THE MONEY RULE
No client creates money. Every balance change is authoritative and auditable.

### THE AFFILIATE RULE
Creators create. Affiliates distribute. Buyers purchase. Akọ coordinates.

### THE GIFT RULE
A gift opens an opportunity to be seen, not an obligation to connect.

### THE MUSIC RULE
Music is atmosphere, attribution and discovery — not the post itself.

### THE UX RULE
Make Akọ easy.

### THE ENGINEERING RULE
Inspect first. Preserve what works. Upgrade what is weak. Never rebuild blindly.

### THE FINAL RULE
**Build Akọ from its own logic. Do not make it smaller by copying someone else's idea of what a platform should be.**

## 60. Final Claude directive

Read this Constitution before implementing any major Akọ feature.

Then read the relevant feature-specific MD.

Then read the repository.

The Constitution tells you **what Akọ must remain**.

The feature MD tells you **what that system is trying to become**.

The repository tells you **what Akọ actually is today**.

Your job is to bring those three together.

> **Understand deeply. Decide carefully. Build surgically. Test honestly. Preserve the soul.**