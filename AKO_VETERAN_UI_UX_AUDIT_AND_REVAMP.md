# AKỌ — VETERAN UI/UX AUDIT & PRODUCT EXPERIENCE REVAMP

## Mission

Act as a veteran UI/UX designer, product designer, interaction designer, frontend engineer, and consumer-app builder who has shipped multiple polished, high-retention consumer products.

You are known for creating products that users naturally keep exploring because the experience is effortless, visually coherent, satisfying, fast-feeling, easy to understand, easy to reach, pleasant to scroll, rewarding to interact with, rich without feeling crowded, and simple without feeling empty.

Your task is to evaluate the existing Akọ application against that professional standard, **rate it honestly, and then upgrade it**.

This is an **audit-and-revamp pass**, not a blind redesign.

The application already contains product decisions, business logic, backend systems, visual language, reusable components, and screens that may already be excellent.

Your responsibility is to:
1. Inspect what actually exists.
2. Understand the product intent behind it.
3. Identify what is already strong.
4. Identify what feels weak, awkward, heavy, confusing, inconsistent, dated, difficult to reach, or unnecessarily complicated.
5. Rate the current UI/UX honestly.
6. Upgrade what feels off.
7. Preserve what works.
8. Preserve stronger existing architecture.
9. Test the result.
10. Leave Akọ feeling substantially more polished without turning it into a different product.

The target is not merely: “Does the page work?”
The target is: **“Does this feel like a product designed by people who deeply understand modern consumer-app UX?”**

---

# 1. NON-NEGOTIABLE: INSPECT BEFORE CHANGING

Do not begin by redesigning screens from assumptions.

First inspect the actual repository.

Understand routes, pages, layouts, navigation, reusable components, design tokens, typography, colors, spacing, icons, imagery, animations, sound, modals, drawers, sheets, forms, cards, Feed, Profile, Discover, Search, Messaging, Notifications, Projects, personal access/library, Wallet, Gifting, Onboarding, creation flows, Admin, responsive behavior, loading states, error states, empty states, backend contracts, database interactions, permissions, feature flags, existing motion systems, and accessibility work.

Search the repository rather than assuming a feature lives in one obvious place.

Read existing implementations before replacing anything.

If something is already stronger than your proposed implementation:
**KEEP IT.**

Do not downgrade a working system simply because your preferred implementation is different.

---

# 2. YOUR ROLE

Think simultaneously as a veteran UX designer, veteran product designer, senior frontend engineer, and consumer-product specialist.

Understand hierarchy, information architecture, cognitive load, affordances, thumb reach, progressive disclosure, feedback, flow continuity, retention, accessibility, emotional design, component reuse, responsive layouts, rendering cost, state management, async states, mobile constraints, maintainability, and why excellent consumer products feel obvious, inviting, alive, lightweight, rewarding, and easy to explore.

Do not optimize for novelty.
Optimize for **experience quality**.

---

# 3. “ADDICTIVE” DOES NOT MEAN DARK PATTERNS

The objective is to make Akọ highly engaging because it is genuinely enjoyable to use.

Do NOT introduce deceptive UI, fake notifications, fake scarcity, forced interaction, confusing cancellation, hidden settings, intentionally frustrating exits, notification spam, artificial engagement bait, misleading buttons, or dark patterns.

Increase natural engagement through excellent discovery, useful recommendations, strong content hierarchy, effortless scrolling, meaningful feedback, satisfying interactions, good pacing, visual clarity, fast perceived response, strong content previews, frictionless navigation, easy return paths, curiosity, relevance, and delightful micro-interactions.

The goal is:
> **Make the next interesting thing effortless to reach.**

---

# 4. RATE THE CURRENT UI/UX FIRST

Before implementing substantial changes, produce an internal assessment.

Rate each area from 1–10:

| Area | Score / 10 | Findings |
|---|---:|---|
| Overall visual polish | | |
| Visual hierarchy | | |
| Typography | | |
| Spacing system | | |
| Color usage | | |
| Navigation | | |
| Feed UX | | |
| Feed readability | | |
| Feed scrolling experience | | |
| Post interaction UX | | |
| Comments | | |
| Profiles | | |
| Discover | | |
| Search | | |
| Messaging | | |
| Notifications | | |
| Projects | | |
| Project discovery | | |
| Project creation | | |
| Personal access/library experience | | |
| Wallet | | |
| Gifting | | |
| Onboarding | | |
| Creation flows | | |
| Forms | | |
| Modals/sheets | | |
| Motion | | |
| Sound | | |
| Loading states | | |
| Empty states | | |
| Error states | | |
| Mobile ergonomics | | |
| Accessibility | | |
| Perceived performance | | |
| Design consistency | | |
| Overall UX | | |

Do not inflate scores. A screen that technically works but feels awkward should not receive 9/10.

---

# 5. CLASSIFY FINDINGS

## A — MUST FIX
Problems that meaningfully damage usability, comprehension, accessibility, flow, or trust.

## B — SHOULD UPGRADE
Things that work but feel noticeably below professional product quality.

## C — POLISH
Small improvements that make the product feel premium.

Do not spend hours polishing a C issue while an A issue remains.

---

# 6. THE “SOFT AND LIGHT” STANDARD

Akọ should feel **soft and light**.

This does NOT mean washed out, childish, pale, weak, excessively rounded, overly playful, or empty.

It means low cognitive friction, clean hierarchy, comfortable spacing, calm surfaces, restrained decoration, smooth interaction, clear actions, little visual fighting, good breathing room, and content remaining the hero.

Look for unnecessary borders, excessive shadows, overly heavy cards, excessive gradients, too many competing colors, too many buttons, oversized headings, cramped controls, inconsistent radii, inconsistent spacing, duplicated labels, and visual noise.

Reduce visual weight where appropriate.
Do not flatten everything into sterile minimalism.

---

# 7. PRESERVE AKỌ’S IDENTITY

Preserve Akọ’s existing green/orange identity, logo, cultural visual language, artifacts, iconography, and personality.

The objective is refinement, not erasure.

Akọ should feel contemporary without looking like a clone of another social platform.

---

# 8. INFORMATION HIERARCHY

For every major screen ask:
1. What is this screen for?
2. What should the user understand first?
3. What is the primary action?
4. Can the user identify it within 1–2 seconds?
5. What is secondary?
6. What can safely be hidden until needed?
7. Is anything competing unnecessarily for attention?

If everything is visually important:
**nothing is visually important.**

Fix hierarchy.

---

# 9. MOBILE-FIRST ERGONOMICS

Treat mobile as a first-class experience.

Audit thumb reach, bottom navigation, top navigation, back behavior, tap targets, gesture conflicts, scrolling, sheets, modals, keyboard behavior, text entry, image proportions, full-screen media, Feed controls, comments, gifting, Wallet, and Project purchase flows.

Frequently used actions should be comfortably reachable.

---

# 10. TAP TARGETS

Audit every interactive element.

Look for tiny icons, tightly packed buttons, ambiguous clickable regions, controls requiring precision, and icons with insufficient spacing.

Where appropriate, make the interactive area larger than the visible icon.
Do not make visible icons unnecessarily huge.

---

# 11. NAVIGATION AUDIT

Map how users move through Feed, Discover, Search, Notifications, Messaging, Profile, Projects, Wallet, personal access/library, Settings, onboarding, creation, and checkout.

Look for dead ends, unnecessary navigation depth, duplicated destinations, inconsistent back behavior, unexpected redirects, pages without obvious exits, and actions opening the wrong interaction pattern.

Navigation should feel predictable.

---

# 12. EVERY SCREEN NEEDS A NATURAL RHYTHM

Inspect headers, intros, content, actions, secondary content, whitespace, and next destinations.

Avoid wall-of-text screens, wall-of-buttons screens, accidental giant empty areas, cramped sections, arbitrary spacing, and inconsistent section gaps.

Whitespace is not automatically wasted space.

---

# 13. CRITICAL PROFILE REQUIREMENT — PRESERVE THE INTENTIONAL AD SPACE

## DO NOT REMOVE THE RESERVED PROFILE AD SPACE

On the **user-view Profile page**, there is intentional empty space near the top.

This space is reserved for future advertising.

**It is not a layout defect.**

Do NOT:
- collapse it
- remove it
- fill it with content
- pull profile content upward into it
- label it as wasted space
- redesign it away
- convert it into arbitrary decoration

DO:
- preserve the reserved space
- preserve its general position
- preserve its breathing room
- improve the UI around it
- ensure the profile still looks intentional with the space present
- make the surrounding hierarchy feel designed

This is an architectural product requirement.

The future advertising system will occupy this area later.

**Do not build the ad system during this pass unless separately instructed.**

---

# 14. PROFILE AD-SPACE REGRESSION CHECK

After Profile changes, explicitly verify:
- intentional top space still exists
- its position remains appropriate
- responsive CSS has not collapsed it
- profile content has not invaded it
- it remains suitable for future ad inventory
- the Profile still looks intentional

Check across small mobile, normal mobile, large mobile, tablet, and desktop.

If a breakpoint accidentally removes it:
**FIX IT.**

---

# 15. FEED UX

The Feed is one of Akọ’s most important experiences.

Do not merely make posts prettier. Study the scroll experience.

Ask:
- Does one post flow naturally into the next?
- Is content density comfortable?
- Does the Feed feel repetitive?
- Are actions too visually heavy?
- Are there too many competing controls?
- Are images framed consistently?
- Does text have enough breathing room?
- Can the user understand the author quickly?
- Does scrolling feel smooth?
- Are loading transitions disruptive?
- Are posts visually distinguishable without looking unrelated?

The Feed should create:
> **“Let me see what is next.”**

through quality, curiosity, relevance, and discovery.

---

# 16. CONTENT SHOULD REMAIN THE HERO

Audit reaction bars, metadata, timestamps, labels, badges, buttons, avatars, menus, and dividers.

Ask:
> “If I removed this element, would the user lose meaningful information?”

If not, consider reducing its visual weight.

---

# 17. AKỌ’S ENGAGEMENT SEMANTICS

Respect existing product semantics such as Support, Disagree, Push Back, Repost, Bookmark, Share, Comment, Gift, and Prioritize.

Do not replace these with generic social-media semantics merely because they are familiar.

Improve discoverability, spacing, hierarchy, feedback, active states, loading states, disabled states, and error recovery.

---

# 18. COMMENTS

Audit comments as a conversation interface: nesting, replies, reactions, Support/Disagree/Push Back, bookmark comment, deletion, moderation, loading, pagination, long comments, collapsed comments, and reply composition.

Comments should feel like an extension of the idea.

---

# 19. DISCOVERY

Akọ is fundamentally about discovery.

Inspect Discover, Search, suggested people, topics, Projects, and content discovery.

Do not assume more recommendations are better.

Recommendations should feel useful.

Akọ may recommend people based on what a user can **need**, not merely people who are similar.

Preserve that philosophy.

---

# 20. PROFILE UX

Profiles should quickly answer:
- Who is this?
- What do they care about?
- What do they make?
- What have they said?
- What can I explore?
- What can I do from here?

Audit profile header, bio, posts, Projects, actions, follow state, messaging, navigation, and visual hierarchy.

Do not overload profiles.

And again:
> **The intentional top reserved advertising space must remain.**

---

# 21. PROJECT UX

Audit discovery, cards, detail pages, purchase, join, access, content consumption, creator context, saved state, locked/unlocked states, completion/progress, and errors.

A user should understand:
> What is this?
>
> Why should I care?
>
> What do I get?
>
> What happens if I join/buy?
>
> Where does it live afterward?

Avoid unnecessary friction.

---

# 22. PERSONAL ACCESS / LIBRARY EXPERIENCE

Things users acquire should have a home.

Audit purchased Projects, joined Projects, received access, Courses, Rooms, Meetings, Events, Files, Audio, Video, and saved Projects.

Do not create duplicate systems if one already exists.

The experience should communicate:
> **“When I acquire something on Akọ, Akọ gives it a place in my world.”**

---

# 23. WALLET UX

Money interfaces should feel calm and trustworthy.

Audit balance, earnings, gifts, transactions, withdrawals, minimum withdrawal, payout status, pending states, failures, confirmation, and history.

Do not change financial business logic merely for visual polish.

A prettier wallet that is less secure is a regression.

---

# 24. GIFTING UX

Gifts are culturally distinctive.

Do not make them feel like generic emoji reactions.

Audit gift discovery, artifact selection, value display, confirmation, sending, animation, notification, recipient experience, and wallet relationship.

Preserve existing semantics.

A gift does not automatically mean follow, connection, chat, engagement, or acceptance.

---

# 25. MESSAGING

Audit conversation list, unread states, composer, attachments, gifts, replies, scrolling, keyboard behavior, message states, loading, failures, and empty state.

Make messaging lightweight.

---

# 26. NOTIFICATIONS

Notifications should help users understand:
> “What happened?”
and:
> “What can I do next?”

Inspect grouping, read/unread, timestamps, icons, deep links, gift notifications, Project notifications, social activity, and system notifications.

Meaningful notifications should lead to meaningful context.

---

# 27. ONBOARDING

Akọ onboarding should feel like entering a living community, not filling out a form.

Audit account creation, welcome, interests, suggested people, follow, initial Feed, and first meaningful action.

Reduce unnecessary fields.
Keep education contextual.

---

# 28. CREATION UX

Akọ is for people who have something to say, make, teach, host, or share.

Audit post composer, media upload, Project creation, publishing, validation, drafts, errors, and previews.

Creation should feel inviting.
Use progressive disclosure.

---

# 29. FORMS

Audit fields, labels, defaults, validation, errors, keyboard behavior, scrolling, and save state.

Errors should tell users:
1. what went wrong
2. what to do
3. how to recover

---

# 30. LOADING STATES

Loading should feel intentional.

Audit skeletons, spinners, button loading, Feed loading, image loading, purchases, Wallet actions, and uploads.

Do not fake loading with arbitrary delays.
Loading indicators should reflect actual application state.

---

# 31. EMPTY STATES

An empty screen should not feel like failure.

For each empty state communicate:
- what is empty
- why it may be empty
- what the user can do next

Do not fill every empty state with giant illustrations.

---

# 32. ERROR STATES

Errors should preserve momentum.

Avoid generic failure messages with no recovery.

Where appropriate provide Retry, Go back, Refresh, Edit, or Try again.

Never expose sensitive backend information.

---

# 33. MOTION

Use motion to explain change.

Good motion confirms actions, connects states, provides orientation, makes interactions satisfying, and helps hierarchy.

Bad motion delays actions, constantly animates, distracts, drains battery, creates fatigue, or repeats unnecessarily.

Respect the existing Akọ motion system.
Do not duplicate motion logic.

---

# 34. SOUND

Treat sound as product feedback, not decoration.

Respect mute, device settings, reduced motion/accessibility, deduplication, volume, and context.

Do not add random sounds.
Use existing assets where appropriate.

---

# 35. MICRO-INTERACTIONS

Audit Support, Disagree, Push Back, Repost, Bookmark, Follow, Share, Send, Comment, Gift, Wallet actions, Project actions, Save, and Publish.

Ask:
> “Does the interface acknowledge that I did something?”

Feedback should be proportional.

---

# 36. PERCEIVED PERFORMANCE

Audit first interaction, navigation, Feed scroll, image loading, modal opening, tab switching, form submission, and optimistic interactions.

Avoid layout shifts and unnecessary rerenders.

Do not sacrifice correctness for perceived speed.

---

# 37. ACCESSIBILITY

Audit contrast, font size, focus states, keyboard navigation, semantic controls, labels, screen-reader meaning, reduced motion, touch targets, form errors, and status announcements.

Accessibility is part of premium UX.

---

# 38. RESPONSIVE DESIGN

Inspect small mobile, normal mobile, large mobile, tablet, desktop, and wide desktop.

Do not simply stretch desktop layouts.
Adapt hierarchy appropriately.

---

# 39. VISUAL CONSISTENCY

Inventory buttons, inputs, cards, pills, tabs, avatars, icons, modals, sheets, dropdowns, menus, badges, dividers, typography, spacing, radius, and shadows.

If two patterns serve the same purpose but look different, determine whether the difference is intentional.

If not, consolidate carefully.

---

# 40. ICONOGRAPHY

Icons should feel like one family.

Audit stroke weight, fill style, size, optical alignment, spacing, and active/inactive states.

Do not mix random icon systems without a reason.

---

# 41. TYPOGRAPHY

Audit font, weights, hierarchy, line height, letter spacing, truncation, long names, long post titles, multilingual text, numbers, and currency.

Text should remain comfortable during long sessions.

---

# 42. COLOR

Preserve Akọ’s identity.

Use color intentionally for hierarchy, state, action, emphasis, brand, and meaningful feedback.

Do not turn every component into a colored object.

---

# 43. CARD DESIGN

Cards are a common source of visual heaviness.

Audit borders, radius, shadows, padding, backgrounds, hierarchy, images, metadata, and actions.

Ask:
> “Does this really need to be a card?”

Not everything needs a floating container.

---

# 44. MODALS VS SHEETS VS PAGES

Use the correct interaction pattern.

Modal: focused confirmation/action.
Sheet: contextual options and mobile-friendly controls.
Page: substantial task or content-heavy experience where navigation/history matters.

Do not open a full page for something that should be contextual.

---

# 45. PROGRESSIVE DISCLOSURE

Akọ contains many systems.

Do not expose every option immediately.

Show essential information first.
Expose advanced options only when useful.

This is one of the main ways to make a sophisticated application feel simple.

---

# 46. DO NOT CHANGE BUSINESS SEMANTICS DURING UX POLISH

Preserve established meanings and systems, including Follow behavior, Feed logic, Prioritize, gift behavior, Wallet accounting, Project ownership, Project access, affiliate attribution, payout rules, Give Back, promotion rules, permissions, moderation, security, and privacy.

If UX reveals a deeper product problem, document it.
Do not silently rewrite business logic.

---

# 47. PRESERVE THE FEED ARCHITECTURE

Do not redesign Feed ranking merely because the visual interface is being improved.

Existing systems such as topic relevance, social signals, content performance, Prioritize, diversity, non-dominance, new-user discovery, meaningful activity, and recommendation logic must remain intact unless an actual implementation defect is discovered.

UI improvement is not permission to rewrite the algorithm.

---

# 48. PRESERVE FINANCIAL ARCHITECTURE

Do not weaken server-authoritative balances, immutable ledgers, idempotency, atomicity, Wallet validation, withdrawal controls, webhook verification, payout logic, fraud controls, or authorization.

---

# 49. PRESERVE SECURITY

Do not introduce client-authoritative permissions, exposed secrets, insecure endpoints, bypasses, weaker RLS, insecure storage, or fake security states.

If a UX change requires backend changes, maintain or improve the existing security model.

---

# 50. TEST REAL USER FLOWS

After changes, walk through realistic journeys.

### New user
Create account → onboarding → interests → suggested people → Feed.

### Reader
Feed → open post → comments → return to Feed.

### Creator
Create post → publish → Profile → interact.

### Social user
Discover → follow → Profile → message → return.

### Project user
Discover Project → inspect → buy/join → access → return later.

### Wallet user
Receive earnings → Wallet → withdrawal flow.

### Gift user
Select gift → confirm → send → notification → Wallet state.

### Mobile user
Perform major flows one-handed.

### Error user
Interrupt network → retry → recover.

### Returning user
Leave app → reopen → continue meaningfully.

---

# 51. “NO THINKING REQUIRED” TEST

For every important flow ask:
> Could a first-time user complete this without someone explaining the interface?

If not, identify the underlying reason.
Do not solve every issue with tooltips.
Fix the UX itself.

---

# 52. THREE-SECOND TEST

For major screens, can the user understand within three seconds:
- where they are
- what this page is
- what matters
- what they can do

If not, improve hierarchy.

---

# 53. THUMB TEST

On mobile, pretend the user is holding the phone with one hand.

Can they comfortably navigate, scroll, open comments, react, share, bookmark, gift, message, open Projects, access personal library, and reach Wallet actions without awkward movement?

Improve where appropriate.

---

# 54. “WHY IS THIS HERE?” TEST

For every prominent element:
> Why is this here?

If the answer is weak:
- reduce it
- move it
- hide it behind progressive disclosure
- remove it if genuinely unnecessary

Do not remove required functionality.

---

# 55. “WHY CAN’T I FIND IT?” TEST

For every important feature:
> If I know this feature exists, can I reasonably find it?

If not, improve navigation, labeling, contextual entry points, or search/discovery.

Do not solve everything by adding buttons.

---

# 56. “WHAT HAPPENED?” TEST

After every meaningful action, does the user know what happened?

Examples:
- Follow
- Support
- Disagree
- Push Back
- Bookmark
- Repost
- Send
- Gift
- Buy
- Join
- Publish
- Save
- Withdraw

Provide appropriate feedback.

---

# 57. “WHERE DID IT GO?” TEST

After acquiring or saving something:
> Can the user find it later?

Especially Projects, files, courses, rooms, meetings, events, and saved items.

Do not let successful actions produce orphaned experiences.

---

# 58. NO UNNECESSARY PAGE PROLIFERATION

Before creating a page:
1. Search the repository.
2. Determine whether an existing page can support the need.
3. Determine whether an existing component can support it.
4. Determine whether the current information architecture already has the correct home.

Create a new page only when it genuinely improves the IA.

---

# 59. NO DUPLICATED BUSINESS LOGIC

If an existing helper/service/backend function performs a business operation, reuse it.

Do not create second versions of purchase logic, Wallet calculations, access calculations, notifications, or attribution calculations.

---

# 60. DO NOT FIX WHAT IS NOT BROKEN

If a component is correct, accessible, consistent, performant, visually good, and aligned with product intent:
**leave it alone.**

Do not modify code merely to demonstrate activity.

---

# 61. DO NOT CHASE DESIGN TRENDS

Avoid unnecessary glassmorphism, giant gradients, excessive blur, floating blobs, excessive animations, oversized typography, novelty navigation, gratuitous 3D, or random rounded containers.

Akọ should feel contemporary without looking like a trend experiment.

---

# 62. USE EXISTING DESIGN LANGUAGE AS RAW MATERIAL

Before introducing a new button, card, modal, spacing token, color, radius, icon, or animation, search for an existing equivalent.

Reuse it where appropriate.

If an existing shared pattern is weak, improve the shared primitive instead of patching many screens independently.

---

# 63. COMPONENT-LEVEL IMPROVEMENT

Prefer systemic improvements where appropriate.

If every primary button feels too heavy, improve the shared primary-button component.

If every modal has poor spacing, improve the modal primitive.

But do not force unrelated components into one abstraction simply for theoretical purity.

---

# 64. VISUAL REGRESSION AWARENESS

Before major changes, identify sensitive screens.

After changes inspect:
- Feed
- Profile
- Discover
- Project detail
- Project access/library
- Wallet
- Messaging
- Notifications
- onboarding
- creation

Ensure improvements in one area do not create regressions elsewhere.

---

# 65. ENGAGEMENT LOOP QUALITY

Inspect:

**See → understand → interact → receive feedback → discover something else → continue.**

Make this loop smooth.
Reduce unnecessary interruptions.

---

# 66. SCROLL QUALITY

Audit scroll momentum, layout stability, image loading, sticky headers, action bars, comment expansion, infinite loading, pagination, preserved position, and returning from detail pages.

Where appropriate:
Feed → post → back → Feed
should return to the previous position.

---

# 67. CONTENT PREVIEW QUALITY

Before asking users to open something, show enough context.

Examples:
- Project
- Profile
- Post
- media
- course
- room

The preview should create informed curiosity, not forced clicks.

---

# 68. EMPTY SPACE IS NOT AUTOMATICALLY A PROBLEM

Whitespace can provide hierarchy, rest, focus, rhythm, future inventory, and breathing room.

Always ask whether whitespace is accidental or intentional.

The Profile ad space is a known intentional example.

---

# 69. LONG-SESSION COMFORT

Imagine reading, discovering, messaging, and browsing Projects for an hour.

If the interface becomes tiring, noisy, confusing, or repetitive, improve it.

The target is:
> **quietly compelling.**

---

# 70. USER CONTROL

Preserve mute, back, cancel, close, block, report, delete where permitted, settings, reduced motion, and notification controls.

Do not make users fight the interface.

---

# 71. SOCIAL PRESSURE

Do not create accidental social obligations around gifts, follows, messages, reactions, or invitations.

A gift should not imply that a user must respond unless product rules actually require it.

---

# 72. FINANCIAL TRUST

Money-related screens should feel deliberate.

Use clear amounts, status, confirmations, destinations, dates, and action states.

Do not make financial actions playful to the point of ambiguity.

---

# 73. CULTURAL VISUALS

Preserve Akọ's cultural identity.

Do not remove cultural elements merely because they are unconventional compared with mainstream Western social-app patterns.

At the same time, avoid clutter.

The target is:
> **modern product craft with Akọ's own cultural visual language.**

---

# 74. WORLD-CLASS, NOT GEOGRAPHICALLY SMALL

Akọ may be built in Nigeria, but the UX standard should be world-class.

Do not unnecessarily label the product as “African” where the product does not call for it.

Let cultural identity exist naturally.

---

# 75. TRUST THROUGH DETAIL

Small details create trust:
- stable layout
- clear status
- predictable navigation
- good error handling
- precise currency display
- reliable loading
- consistent controls
- clear confirmations

Polish communicates competence.

---

# 76. DISCOVERY QUALITY

The user should sometimes experience:
> “Oh, I didn't know this existed.”

But discovery should remain relevant.

Improve content previews, topic exploration, creator discovery, Project discovery, social activity, and recommendations.

Do not make discovery an endless catalogue of irrelevant content.

---

# 77. MOTION PERFORMANCE

Animations should be short, purposeful, non-blocking, low-cost, respectful of reduced motion, and free of unnecessary continuous animation.

Do not animate everything.

---

# 78. NETWORK FAILURE

Test slow network, intermittent network, failed requests, retry, duplicate taps, app background/foreground, and refresh during actions.

The UI should remain coherent.

---

# 79. DOUBLE-SUBMIT SAFETY

Especially for gifts, purchases, Wallet actions, Project creation, publishing, and messages.

Do not allow visual redesign to introduce duplicate actions.

---

# 80. AUTHENTICATION FLOWS

Audit sign in, sign up, password reset, session expiration, redirects, deep links, and returning to the intended page.

Authentication should feel integrated into the product.

---

# 81. DEEP LINKS

Important destinations should work when opened directly where supported:
- posts
- profiles
- Projects
- courses
- rooms
- events
- message contexts
- notification destinations

---

# 82. BACK NAVIGATION

Back should be predictable.

Inspect:
- page → page
- modal → close
- sheet → dismiss
- post → Feed
- Project → previous context
- Profile → previous context
- checkout → Project

Do not trap users.

---

# 83. PRESERVE SCROLL CONTEXT

Where appropriate, list → detail → back should return to the prior position.

---

# 84. SEARCH

Search should feel lightweight.

Audit input, results, recent searches, empty state, loading, filtering, navigation, and relevance.

---

# 85. NOTIFICATION → DESTINATION

Meaningful notifications should lead to relevant context.

Comment notification → relevant post/comment.
Project notification → Project.
Message notification → conversation.
Gift notification → relevant notification/profile context as designed.

---

# 86. SHARE EXPERIENCE

Inspect internal and external sharing.

Sharing should clearly communicate what is being shared, where it goes, and success/failure.

Avoid unnecessary steps.

---

# 87. REPOST / FORWARD / BOOKMARK

Keep these distinct where product semantics require it.

Do not collapse everything into “Share” merely because it looks simpler.

---

# 88. ADMIN UX

Audit Admin enough to ensure it remains coherent and usable.

Inspect navigation, forms, tables, statuses, filters, review flows, financial controls, promotion review, Give Back controls, feature flags, and moderation.

Do not sacrifice auditability for aesthetics.

---

# 89. IMPLEMENTATION PRIORITY

## Phase 1 — Critical usability
Fix broken flows, confusing navigation, inaccessible controls, major responsive failures, and serious hierarchy problems.

## Phase 2 — Systemic polish
Improve shared components, typography, spacing, buttons, cards, modals, navigation, and feedback.

## Phase 3 — Core consumer experience
Polish Feed, Profile, Discover, Messaging, Notifications, Projects, personal access/library, Wallet, and Gifting.

## Phase 4 — Micro-interactions
Refine transitions, active states, loading, subtle motion, and success feedback.

## Phase 5 — Regression
Run major journeys again.

---

# 90. BEFORE/AFTER DISCIPLINE

For meaningful changes, record internally:
- Before: what was wrong?
- Why it mattered: what user friction did it create?
- After: what changed?
- Risk: could it affect business logic, navigation, backend, accessibility, mobile, performance, or security?
- Verification: how was it tested?

---

# 91. DO NOT OVER-DESIGN

A veteran designer knows when to stop.

If a screen is already clean:
**do less.**

The goal is not to leave every screen visibly different.
The goal is to leave every screen **better**.

Small changes can dramatically improve perceived quality.

---

# 92. THE “COULD I USE THIS FOR AN HOUR?” TEST

Imagine using Akọ for an hour.

If the interface becomes tiring, noisy, confusing, or repetitive, improve it.

The target is:
> **quietly compelling.**

---

# 93. THE VETERAN PRODUCT STANDARD

Without copying any specific company's design, compare the quality bar against highly polished modern consumer products.

Ask:
- Does this feel intentional?
- Does every interaction have a reason?
- Does hierarchy feel obvious?
- Does it feel fast?
- Does it feel trustworthy?
- Does it feel coherent?
- Does it feel premium?
- Does it feel easy?
- Does it feel alive?
- Does it feel like someone obsessed over the details?

If not, improve it.

---

# 94. DO NOT MAKE AKỌ LOOK LIKE ANOTHER APP

Target:
**world-class craft + Akọ identity.**

Not:
**world-class craft + imitation.**

---

# 95. USER PSYCHOLOGY

Good UX anticipates needs without making users feel controlled.

If the user just bought a Project: show where to access it.

If the user just sent a gift: confirm it.

If the user just published: show the resulting post.

If the user opens a notification: take them to relevant context.

If the user leaves a detail page: return them to where they were.

If the user has nothing saved: explain what saving does.

Reduce unnecessary thinking.

---

# 96. CONTEXTUAL ACTIONS

Put actions where users naturally need them.

Do not create a universal toolbar containing every possible action.

Context should determine visibility.

This keeps screens light.

---

# 97. SECONDARY ACTIONS

Use overflow menus, sheets, and contextual menus for actions that matter but do not deserve permanent visual space.

Do not hide primary actions.

---

# 98. VISUAL WEIGHT

Every element has visual weight through size, color, contrast, boldness, background, border, shadow, animation, and position.

Use the smallest amount of visual weight necessary to communicate importance.

---

# 99. TOUCH + FEEDBACK

When a user taps, there should be an immediate perceptual response.

That may be a state change, subtle animation, icon transition, loading, disabled state, or success state.

Feedback must correspond to real application state.

Never fake financial or backend success.

---

# 100. OPTIMISTIC UI

Where safe and architecturally supported, use optimistic UI for lightweight actions such as Support, Disagree, Push Back, Bookmark, and Follow.

If the server rejects the action, roll back cleanly.

Do not use optimistic UI where temporary incorrect state could cause financial/security problems.

---

# 101. DESTRUCTIVE ACTIONS

Destructive actions should be clearly named, appropriately confirmed, reversible where product semantics allow, not accidentally triggered, and not hidden behind ambiguous icons.

---

# 102. MODERATION STATES

If content is deleted, unavailable, blocked, moderated, or private, the UI should communicate that gracefully.

Do not leave broken cards or confusing blank spaces.

---

# 103. ORPHANED CONTENT

If a saved/shared/reposted/bookmarked item no longer exists, show an intentional unavailable state.

Do not create broken navigation.

---

# 104. NOISE CONTROL

If a screen has many competing elements, reduce noise through hierarchy rather than simply shrinking everything.

Use spacing, grouping, contrast, progressive disclosure, and contextual actions before resorting to tiny text.

---

# 105. DESIGN FOR ATTENTION WITHOUT ABUSING ATTENTION

Good engagement comes from relevance, curiosity, quality, social meaning, useful discovery, and satisfying interaction.

Not interruption, anxiety, artificial urgency, notification abuse, or manipulation.

---

# 106. FUTURE-PROOF THE VISUAL SYSTEM

Create sensible shared patterns that can support real future features.

Do not build speculative systems for features that do not exist.

The goal is enough structure to scale, not an elaborate framework nobody uses.

---

# 107. DO NOT ADD DEPENDENCIES CASUALLY

Before installing a package, ask whether existing code or browser capabilities can solve the problem.

Avoid large dependencies for tiny visual effects.

---

# 108. KEEP THE APP LIGHT

The UI/UX revamp must not make Akọ significantly heavier.

Watch bundle size, images, animation cost, rerenders, DOM complexity, unnecessary dependencies, and expensive effects.

---

# 109. SECURITY AFTER UX CHANGES

If a UI change touches authorization, RLS, server calls, Wallet, Project access, messaging permissions, Profile privacy, or Admin controls, re-test those boundaries.

---

# 110. FINAL UX REPORT

After implementation, produce a report containing:

## A. Initial score
Overall UI/UX rating before changes.

## B. Final score
Overall UI/UX rating after changes.

## C. Score by area
Before → After.

## D. Biggest problems
Most important issues discovered.

## E. Biggest improvements
What changed and why.

## F. Deliberately untouched areas
What was already good or intentionally preserved.

## G. Risks
Anything needing future attention.

## H. Profile advertising space
Explicitly confirm:
> **The intentional top reserved space on the user-view Profile page was preserved for future advertising.**

## I. Regression results
Report tested journeys.

## J. Remaining recommendations
Only meaningful future improvements.

---

# 111. DEFINITION OF DONE

- [ ] Actual repository inspected before redesign.
- [ ] Current UI/UX honestly rated.
- [ ] Major usability issues identified.
- [ ] Visual hierarchy audited.
- [ ] Navigation audited.
- [ ] Mobile ergonomics audited.
- [ ] Feed audited.
- [ ] Profile audited.
- [ ] Discover audited.
- [ ] Search audited.
- [ ] Messaging audited.
- [ ] Notifications audited.
- [ ] Projects audited.
- [ ] Personal access/library audited.
- [ ] Wallet audited.
- [ ] Gifting audited.
- [ ] Onboarding audited.
- [ ] Creation audited.
- [ ] Loading states audited.
- [ ] Empty states audited.
- [ ] Error states audited.
- [ ] Motion audited.
- [ ] Sound audited.
- [ ] Accessibility audited.
- [ ] Responsive behavior audited.
- [ ] Design consistency audited.
- [ ] Shared components improved where appropriate.
- [ ] Unnecessary visual weight reduced.
- [ ] Important actions made easier to reach.
- [ ] Primary actions clarified.
- [ ] Unnecessary friction reduced.
- [ ] Feed scrolling experience improved where needed.
- [ ] Detail-to-list navigation improved where needed.
- [ ] Scroll position preserved where appropriate.
- [ ] No unnecessary page proliferation.
- [ ] No duplicated business logic.
- [ ] Existing stronger architecture preserved.
- [ ] Existing product semantics preserved.
- [ ] Feed algorithm preserved.
- [ ] Financial architecture preserved.
- [ ] Security preserved.
- [ ] **Intentional Profile advertising space preserved.**
- [ ] Major user journeys tested.
- [ ] Mobile journeys tested.
- [ ] Regression review completed.
- [ ] Final UX score produced.
- [ ] Final findings documented.

---

# 112. FINAL INSTRUCTION TO CLAUDE

Do not approach this as:
> “I was given a checklist. I need to modify every item.”

Approach it as:
> **“I have inherited an existing product. I need to understand it deeply, judge it against an elite product-design standard, and make it materially better without destroying what makes it work.”**

Be opinionated.
Be restrained.
Be meticulous.
Be skeptical of unnecessary complexity.
Be ruthless about bad UX.
Be respectful of good existing work.

Think about the user's thumb.
Think about the user's attention.
Think about cognitive load.
Think about emotional response.
Think about what happens after every action.
Think about what happens when something fails.
Think about what happens when the user comes back tomorrow.
Think about what happens when the user uses the app for an hour.
Think about what happens when the user is completely new.
Think about what happens when the user is an experienced creator.
Think about the product as a connected system, not isolated screenshots.

And above all:
> **Make Akọ feel easy.**

The user should not have to admire the UX.
They should simply find themselves using the product.

Scrolling.
Discovering.
Reading.
Reasoning.
Creating.
Connecting.
Building.
Returning.

---

# 113. FINAL PRODUCT STANDARD

The desired result is not:
> “A redesigned Akọ.”

The desired result is:
> **“Akọ, but everything feels more obvious.”**

More:
- polished
- soft
- light
- reachable
- coherent
- responsive
- satisfying
- alive
- comfortable
- trustworthy
- discoverable

while remaining unmistakably Akọ.

### Final test

If the user can accomplish more with less thought, the interface improved.

If it looks prettier but requires more thought, it did not.

If it is more animated but less calm, it did not.

If it is more minimalist but hides useful functionality, it did not.

If it is more “modern” but less Akọ, it did not.

If it is more engaging because the product is easier, clearer, more rewarding, and more enjoyable to explore:

**that is the win.**

---

## FINAL REMINDER

**Inspect first.**

**Rate honestly.**

**Preserve what works.**

**Upgrade what feels off.**

**Do not blindly rebuild.**

**Do not break business logic.**

**Do not weaken security.**

**Do not rewrite the Feed algorithm during a UI/UX pass.**

**Do not remove the intentional Profile advertising space.**

**Do not create unnecessary pages.**

**Do not introduce dark patterns.**

**Do not make the app noisy in the name of engagement.**

**Make the experience effortless.**

**Make it feel premium.**

**Make it feel alive.**

**Make it feel unmistakably Akọ.**
