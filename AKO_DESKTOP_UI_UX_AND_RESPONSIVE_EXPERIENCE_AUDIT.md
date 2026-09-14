# AKỌ — Desktop UI/UX & Responsive Experience Audit / Upgrade Specification

## Mission

Transform Akọ's current mobile-first web application into a **first-class desktop social product**.

The current application was designed mobile-first. On desktop, the app can remain concentrated in the center while large areas of the viewport are unused, and mobile bottom navigation does not exploit desktop space. This document is an **audit-and-upgrade specification**, not a blind rebuild.

> **Same Akọ. Different expression.**

> **Desktop is not a larger mobile screen.**

Claude must inspect the repository, understand the existing frontend, backend, routes, database relationships, permissions and product priorities, then design a desktop experience that feels intentionally designed for desktop.

Goals:
- simple
- premium
- spacious
- fast
- familiar
- unmistakably Akọ
- useful at large viewport sizes
- coherent with mobile without being a stretched copy

---

# 1. Research benchmark: Instagram Desktop

Claude MUST research current Instagram web/desktop UX before implementation. Instagram has deliberately moved core navigation such as Home, Search, Messages and Notifications into a persistent side pane to make better use of large screens.

Research:
- persistent left navigation
- icon + label navigation
- active and hover states
- search placement
- Explore/discovery access
- Messages and Notifications access
- Create access
- Profile/account access
- secondary settings
- collapsible/compact navigation behavior
- how the main content remains the visual focus
- how large-screen layouts avoid simply stretching mobile UI

Sources:
- Meta/Instagram web updates: https://about.fb.com/news/2022/11/instagram-web-updates/
- Instagram feed controls: https://about.fb.com/news/2022/03/two-new-ways-to-control-what-you-see-on-instagram/
- Instagram messaging: https://about.fb.com/news/2022/03/introducing-new-instagram-messaging-features/

**Benchmark the interaction logic, not the pixels. Do not copy Instagram.**

---

# 2. Research benchmark: TikTok Desktop

Claude MUST also research TikTok's desktop experience. TikTok's February 2025 desktop redesign introduced a modular layout, repositioned navigation, refreshed For You, Explore, immersive desktop viewing and desktop-specific functionality.

Research:
- persistent vertical navigation
- moving controls into a left-side navigation system
- modular desktop layouts
- content immersion
- larger content presentation
- desktop-specific affordances
- reducing distraction around the main content

Sources:
- TikTok Newsroom: https://newsroom.tiktok.com/new-features-bring-tiktok-magic-to-desktop
- TechCrunch: https://techcrunch.com/2025/02/27/in-challenge-to-youtube-tiktok-revamps-its-desktop-platform/

Again: **study why the system works, not how to clone it.**

---

# 3. The actual problem

Do not treat the problem as merely "empty space."

The deeper problem is that Akọ's information architecture was built around mobile constraints:

```text
mobile:
limited width → bottom navigation → one major surface → secondary functions behind taps

desktop:
large viewport → persistent navigation → multiple regions → more visible secondary functions
```

Desktop should exploit the second model.

---

# 4. First rule: repository reconnaissance

Before implementation Claude MUST inspect:
- frontend
- backend
- routes
- layouts
- navigation
- components
- Tailwind/CSS/design tokens
- responsive utilities
- Supabase queries
- RPCs/Edge Functions
- RLS policies
- authentication
- Feed
- For You
- Following
- Top Discussions
- Discover/Search
- Profiles
- Pages
- Messages
- Notifications
- Projects
- Books
- Courses
- Rooms
- Gigs
- portfolio relationships
- Library/access
- Saved
- Wallet
- Gifts
- Earnings
- Withdrawals
- collaboration
- affiliate systems
- promotions
- Give Back
- Admin
- settings
- deep links
- existing desktop behavior

The repository is the source of truth. Preserve stronger existing implementations.

---

# 5. Desktop navigation spine

The desktop version should replace the mobile bottom navigation with a persistent sidebar.

Conceptually:

```text
┌───────────────────────────────────────────────────────────────┐
│ AKỌ                                                           │
│                                                               │
│ SIDEBAR       MAIN CONTENT                    CONTEXT         │
│                                                               │
│ Feed          feed / page / workspace          optional       │
│ Discover                                                   │
│ Messages                                                   │
│ Notifications                                             │
│                                                               │
│ Create                                                        │
│                                                               │
│ Your Akọ                                                      │
│ Library                                                        │
│ Wallet                                                         │
│                                                               │
│ Profile                                                        │
│ More                                                           │
└───────────────────────────────────────────────────────────────┘
```

This is a hypothesis, not a fixed menu. Claude must derive the actual menu from the repository.

---

# 6. Build the navigation inventory first

Create an internal inventory:

| Route | Purpose | Mobile entry | Desktop entry | Frequency | Importance | Desktop location |
|---|---|---|---|---|---|---|

Inventory every real route, including hidden/nested/protected/deep-link routes.

Do not create navigation from memory.

---

# 7. Sidebar information architecture

The sidebar should expose Akọ's depth without becoming a list of every route.

Potential hierarchy:

```text
AKỌ

Feed
Discover
Messages
Notifications

Create

Your Akọ
  Profile
  Library
  Saved
  Gigs

Money
  Wallet
  Earnings
  Withdrawals

More
  Settings
  Help
```

This is illustrative only. Use the actual repository.

Primary navigation = high-frequency destinations.

Create = actions users perform.

Your Akọ = user's own world/work.

Money = financial/work surfaces where appropriate.

More = low-frequency utility destinations.

Do not hide important features under More merely to make the sidebar look clean.

---

# 8. Sidebar hierarchy and interaction

Requirements:
- persistent on desktop
- visually quiet
- clear active state
- clear hover state
- icon + label when expanded
- accessible labels when collapsed
- optional collapsed state if it genuinely improves the product
- tooltips for icon-only state
- keyboard navigation
- no essential feature is hover-only
- no excessive animation
- no giant colored blocks
- no dashboard-like clutter

A sidebar should feel like Akọ's navigation spine, not a generic SaaS template.

---

# 9. Submenus

Desktop should expose functionality that is awkward to reach on mobile.

Potential examples:

```text
Feed
  For You
  Following
  Top Discussions
```

```text
Library
  Books
  Courses
  Rooms
  Meetings
  Events
  Files
```

```text
Wallet
  Overview
  Transactions
  Earnings
  Withdrawals
```

But Claude must inspect actual routes and existing information architecture before deciding.

Do not invent pages that do not exist.
Do not duplicate pages that already exist.

---

# 10. Feed is not being redesigned algorithmically

Akọ Feed currently has:
- For You
- Following
- Top Discussions

Desktop must preserve these distinctions.

Do NOT:
- merge them
- create a fourth feed
- rewrite ranking
- create a desktop algorithm
- create a second recommendation engine
- change Prioritize
- change Contact Graph / Discover Radar

The existing feed system remains authoritative.

Desktop changes presentation and navigation, not feed logic.

---

# 11. Contact Graph / Discover Radar

Akọ's Contact Graph / Discover Radar affects **For You**, not Following or Top Discussions.

Desktop must not accidentally alter this.

The sidebar is navigation.
The Contact Graph is discovery logic.

Keep these concerns separate.

Use the existing Contact Graph specification and current implementation as product context.

---

# 12. Desktop Feed layout

Audit whether Feed should use:

```text
sidebar | feed | optional context rail
```

A right rail is optional. It must earn its place.

Potential legitimate context:
- relevant people
- suggestions
- topics
- related work
- contextual Project information
- useful account information

Do not add a right rail just to fill white space.

A blank region can be better than irrelevant content.

---

# 13. Main content width

Do not use one universal max-width for every page.

Different surfaces have different natural widths.

Feed: focused content width.

Messages: wide multi-pane workspace.

Profile: wider composition.

Library: grid/list width.

Wallet: table/history width.

Admin: full workspace.

Project: content + contextual action area where useful.

The width should follow the task.

---

# 14. Desktop should change composition, not business logic

A desktop page can present the same data differently.

Example:

```text
mobile:
Project → description → price → action → content

desktop:
┌──────────────────────────┬──────────────────┐
│ project/content          │ price/action     │
│ description/media        │ creator/access   │
└──────────────────────────┴──────────────────┘
```

Only do this where the actual Project type benefits from it.

Same backend.
Same permissions.
Same business rules.
Different presentation.

---

# 15. Messaging desktop

Messaging is one of the strongest opportunities for desktop-specific UX.

Audit the existing messaging system and consider:

```text
conversation list | active conversation | optional details
```

Desktop may expose:
- conversation search
- chat list
- messages
- media/context
- shared content
- profile information

But preserve the existing realtime architecture, message states, voice notes, media, privacy and mobile behavior.

Do not create a second messaging system.

Use the existing Akọ Messaging UX audit as related context.

---

# 16. Profile desktop

Akọ profiles are evolving beyond a generic Posts | Projects model.

Current product direction supports dynamic work categories such as:
- Posts
- Books
- Artist
- Film
- Photography
- Design
- Developer
- Performance
- other meaningful work categories

The key distinction is:

> **Role describes how someone contributed. Work type determines the portfolio category.**

A cinematographer may contribute to Film.
A music producer may contribute to Artist/music work.
A photographer may contribute to Photography.
A graphics designer may contribute to Design.

Desktop should make this portfolio model feel intentional, not like a generic Projects tab.

Use the existing Dynamic Profile / Portfolio / Gig specification as product context.

---

# 17. Gigs

One account can own multiple independent Gigs.

Example:
- Music Producer
- Cinematographer
- Movie Director
- Graphics Designer

Each Gig may have its own professional identity, catalogue, FAQ, description, price/services and portfolio.

Desktop should make multiple Gigs easy to understand without collapsing them into one generic professional page.

The Project is the work.
The Gig is the professional/service surface.
The portfolio is the relationship between them.

Do not duplicate Gig architecture.

---

# 18. Library / acquired content

Akọ's existing product principle is:

> **Things you have access to should have a home.**

Desktop should make acquired content easy to return to.

Potential structure:

```text
Your Akọ
  Library
    Books
    Courses
    Rooms
    Meetings
    Events
    Files
```

But inspect the current access/library architecture first. Do not create a second library system.

---

# 19. Wallet / earnings / withdrawals

Desktop is naturally suited to financial management.

Audit existing wallet surfaces and determine how desktop can improve:
- balance clarity
- transactions
- earnings
- gifts
- affiliate earnings
- withdrawals
- pending states
- payout states

Do not change financial authority as part of a visual task.

The backend remains authoritative for balances, transactions, withdrawals and permissions.

---

# 20. Notifications

Audit existing notification types before grouping them.

Desktop may make Notifications a richer activity center, but do not invent categories unsupported by the product.

All notification deep links must continue to resolve correctly.

---

# 21. Discover / Search

Desktop gives discovery more room.

Audit existing:
- Search
- Discover
- people
- Pages
- Projects
- Gigs
- topics
- content

Reuse the existing search/discovery architecture.
Do not create a second search engine.

---

# 22. Create

Desktop should make creation easy without turning the product into a dashboard.

Potential:
- Create Post
- Create Project
- Create Gig

Only expose capabilities actually present and authorized in the repository.

Preserve existing server-side eligibility and permission rules.

The client may explain eligibility.
The server decides eligibility.

---

# 23. Pages

If Pages exist, audit them separately from personal accounts.

Pages may have:
- team members
- posts
- Projects
- followers
- organizational identity
- collaborations

Do not assume personal profile UX and Page UX are identical.

---

# 24. Admin

Admin is a separate desktop class.

Use the full viewport where appropriate.

Good desktop admin UX may use:
- tables
- filters
- dense but readable information
- clear destructive actions
- audit context

Preserve:
- RLS
- role checks
- service-role boundaries
- audit trails
- financial controls
- kill switches

Never expose Admin to ordinary users simply because desktop navigation is being redesigned.

---

# 25. Settings

Settings that are buried on mobile can be easier to reach from a desktop account/menu surface.

Audit existing settings before deciding whether to expose them in the sidebar or account menu.

Do not create duplicate settings pages.

---

# 26. Right rail rules

A right rail is allowed only when it improves the task.

It must:
- contain useful context
- avoid duplicate information
- not introduce another recommendation engine
- not distract from the primary task
- disappear or change when the page does not benefit from it

Different pages can have different shells.

---

# 27. Immersive surfaces

Some surfaces should use less chrome:
- image viewer
- slide viewer
- full media
- reading
- focused learning
- selected Project content

Desktop can temporarily reduce navigation chrome when focus is the task.

Do not force the entire sidebar into every immersive experience.

---

# 28. Responsive architecture

Do not implement only "mobile" and "desktop."

Evaluate:
- phone
- large phone
- tablet
- small laptop
- standard desktop
- large desktop
- ultrawide

Choose breakpoints based on actual content needs and existing design tokens, not framework defaults alone.

---

# 29. Mobile must not regress

After desktop implementation, test:
- bottom navigation
- Feed
- composer
- messaging
- Profiles
- Projects
- Gigs
- Wallet
- Library
- Notifications
- modals
- deep links

If components are shared, test both responsive modes explicitly.

---

# 30. Shared architecture vs separate presentation

Prefer:

```text
same data
+ same business logic
+ same backend authority
+ different presentation where necessary
```

It is acceptable to have different mobile/desktop components when composition genuinely differs.

For example:
- MobileProjectCard
- DesktopProjectCard

can share the same data, permissions and action logic.

Do not duplicate business rules.

---

# 31. Design language

Preserve Akọ's established direction:
- clean
- soft
- premium
- lightweight
- green/orange identity
- restrained cultural personality
- subtle motion
- strong typography
- generous spacing

Desktop should become sophisticated through composition, not decoration.

Do not turn the desktop UI into a generic enterprise dashboard.

---

# 32. Cultural identity

Do not cover the interface in cultural patterns.

Akọ's identity already lives in:
- artifacts
- gifts
- illustrations
- naming
- imagery
- product philosophy

Let those elements breathe.

The sidebar should not become a cultural poster.

---

# 33. Header

Claude should decide whether a desktop top header is actually necessary.

Possible legitimate uses:
- contextual page title
- search
- breadcrumbs
- account controls
- page actions

Do not add a persistent header simply because desktop products often have one.

Every permanent UI element must justify its presence.

---

# 34. Browser-native behavior

Desktop users expect:
- Back
- Forward
- Refresh
- New tab
- Copy URL
- Open link in new tab

Do not fight browser conventions.

Important destinations should have real URLs and deep-link correctly.

---

# 35. Deep links

Test links from:
- notifications
- messages
- Feed
- Projects
- Profiles
- Gigs
- collaboration requests

The destination must respect:
- authentication
- permissions
- deleted content
- blocked users
- access relationships

---

# 36. Keyboard UX

Desktop should use the keyboard where it genuinely helps.

Audit:
- Tab
- Enter
- Escape
- arrow keys
- focus management
- modal focus trapping
- composer behavior
- slide navigation
- search focus

Do not invent an enormous shortcut system.

---

# 37. Accessibility

Audit:
- semantic navigation
- keyboard access
- visible focus
- focus order
- labels
- ARIA where required
- contrast
- menus
- dialogs
- collapsible sections
- reduced motion
- disabled states
- errors

Icon-only navigation must remain accessible.

---

# 38. Performance

Desktop must not become a reason to render everything.

Audit:
- sidebar rendering
- route loading
- images
- media
- Feed
- Messages
- Library
- portfolios
- wallet tables
- notifications
- realtime subscriptions

Avoid duplicate subscriptions and unnecessary data fetching.

---

# 39. Backend relationship audit

Claude must understand the actual relationships behind the UI.

Inspect:
- users
- profiles
- Pages
- follows
- posts
- comments/discussions
- Projects
- Project access
- purchases
- Books
- Courses
- Rooms
- Gigs
- portfolio relationships
- collaborations
- music
- wallet
- gifts
- earnings
- withdrawals
- notifications
- messages
- groups
- memberships
- saved content
- affiliates
- promotions
- Give Back

The purpose is not to rebuild the backend.

The purpose is to ensure the desktop UI reflects the real connected product.

---

# 40. Authority map

For major desktop surfaces document:

```text
UI
↓
frontend action
↓
query / mutation / RPC / Edge Function
↓
database
↓
RLS / authorization
```

Desktop must consume existing authority rather than inventing client-side truth.

---

# 41. Security and privacy

Desktop must not expose anything a user is not authorized to see.

Audit:
- RLS
- ownership
- Page membership
- Project access
- wallet permissions
- Admin permissions
- private content
- blocked users
- deleted content
- private Rooms

Hiding a sidebar item is not security.

---

# 42. Navigation graph

Build an internal graph:

```text
Page
↓
entry points
↓
primary actions
↓
secondary actions
↓
exit paths
↓
related surfaces
```

Identify:
- orphan pages
- dead buttons
- duplicate destinations
- contradictory navigation
- unnecessary navigation depth
- mobile-only destinations that deserve desktop exposure

---

# 43. Relationship-aware UX

Akọ is a connected product, not disconnected pages.

Think in relationships:

```text
User
 ↓
Post
 ↓
Discussion
 ↓
Person
 ↓
Chat
 ↓
Project
 ↓
Purchase
 ↓
Library
 ↓
Collaboration
 ↓
Gig
 ↓
Portfolio
 ↓
Wallet
```

Desktop should make legitimate transitions between these surfaces easier.

Examples:
- Project → creator
- creator → relevant work
- collaborator → relevant Gig
- purchase → Library/access
- notification → exact object
- message → related content

Do not create fake relationships just to make navigation look connected.

---

# 44. Do not create a SaaS dashboard

Avoid a desktop full of:
- Overview cards
- Analytics cards
- Quick actions
- Recent activity cards
- empty widgets
- arbitrary statistics

Akọ is a social/creative/economic platform.

The desktop experience should feel like:

> **a sophisticated social environment**

not:

> **a CRM pretending to be a social network.**

---

# 45. Do not fill space for its own sake

Bad:
```text
sidebar + tiny mobile feed + giant blank area
```

Also bad:
```text
sidebar + feed + arbitrary widgets + noise
```

Good:
```text
navigation + appropriately sized content + useful context + intentional whitespace
```

Whitespace is not a bug.

Meaningless UI is.

---

# 46. Desktop signature

The user wants the desktop experience to feel iconic.

Interpret iconic as:
- recognizable
- coherent
- confident
- memorable
- restrained
- easy
- distinctly Akọ

Not:
- excessive animation
- novelty navigation
- giant gradients
- decorative complexity

Claude should explore one or two subtle Akọ-specific interaction/layout signatures only if they emerge naturally from the product.

Do not force a gimmick.

---

# 47. Benchmark without cloning

For every major desktop pattern ask:

### Instagram
- What problem does its sidebar solve?
- What does persistent navigation make easier?
- What does it deliberately keep out of the main content?

### TikTok
- How does its desktop layout increase immersion?
- How does persistent navigation reduce distraction?
- What desktop-specific affordances are worth studying?

Then ask:

> What is the Akọ version of this idea?

Never copy the visual answer directly.

---

# 48. Page-by-page desktop audit

For every major route document:

### Current mobile composition
What exists?

### Current desktop composition
What happens today?

### Problem
What is inefficient?

### Opportunity
What does desktop enable?

### Layout
What should change?

### Navigation
How does the user enter and leave?

### Backend relationships
What data/permissions support it?

### States
Loading, empty, error, success, denied, deleted.

### Responsive behavior
How does it return to mobile?

---

# 49. Feed-specific preservation checklist

Preserve:
- For You
- Following
- Top Discussions
- existing ranking
- existing diversity
- existing repetition rules
- Prioritize
- Contact Graph / Discover Radar
- social signals
- topic relevance
- performance signals

Do not create a desktop ranking system.

---

# 50. Slides and media

Akọ supports slide posts and music as a soundtrack/discovery layer.

Desktop should improve:
- image viewing
- slide navigation
- keyboard controls where useful
- position indicators
- music controls
- attribution
- post actions

Do not introduce video simply because desktop has more space.

---

# 51. Projects

Projects are central to Akọ.

Audit each real Project type for:
- discovery
- details
- creator
- purchase/join
- access
- content
- completion
- saved state
- library relationship
- notifications
- collaboration
- portfolio relationship

Do not force every Project type into one identical desktop template.

---

# 52. Books / Courses / Rooms

### Books
Use desktop width where reading/access benefits from it.

### Courses
Desktop can support lesson navigation + content + progress where the existing architecture supports it.

### Rooms
Desktop may support content/context navigation for announcements, meetings, recordings, assignments and participation where those surfaces exist.

Preserve existing backend state.

---

# 53. Empty, loading and error states

Every desktop page must have intentional:
- loading
- empty
- error
- permission denied
- deleted/unavailable
- success
states.

Do not leave a huge blank viewport while data loads.

Do not use fake setTimeout loading.

---

# 54. Motion

Reuse the existing Akọ motion system.

Good candidates:
- sidebar expand/collapse
- navigation transitions
- hover feedback
- drawers
- dialogs
- successful actions

Core principle:

> **Add life, not noise.**

---

# 55. Analytics

Measure whether desktop actually improves the product.

Useful metrics may include:
- desktop sessions
- navigation success
- route abandonment
- sidebar interactions
- search usage
- Library usage
- Project discovery
- profile exploration
- Gig discovery
- message usage
- creation usage
- wallet usage

Do not collect unnecessary personal data.

---

# 56. User testing

Run task-based tests:

1. Find a person.
2. Switch For You → Following.
3. Find the last conversation.
4. Find a Project.
5. Find something already purchased.
6. Find a professional Gig.
7. Find earnings.
8. Create a post.
9. Open settings.

Measure:
- time
- wrong clicks
- hesitation
- backtracking
- confusion
- completion

---

# 57. Browser matrix

Test:
- Chrome
- Safari
- Firefox
- Edge

Viewports:
- 1280px
- 1440px
- 1536px
- 1920px
- ultrawide

Zoom:
- 80%
- 90%
- 100%
- 110%
- 125%
- 150%

Do not design around one monitor.

---

# 58. Implementation phases

## Phase 1 — Reconnaissance
Read frontend, backend, routes, database relationships and current desktop/mobile behavior.

## Phase 2 — Information architecture
Map sidebar, submenus, account controls and contextual navigation.

## Phase 3 — Desktop shell
Build the responsive desktop shell without changing business logic.

## Phase 4 — Navigation migration
Expose existing destinations through the new desktop IA.

## Phase 5 — Page composition
Upgrade Feed, Messages, Profile, Projects, Library, Gigs, Wallet, Notifications and other major pages individually.

## Phase 6 — Desktop-specific improvements
Add only capabilities genuinely enabled by desktop.

## Phase 7 — Accessibility/performance
Keyboard, focus, responsive behavior, loading, realtime, performance.

## Phase 8 — Regression
Test mobile and existing deep links.

## Phase 9 — User testing
Run real tasks.

## Phase 10 — Final audit
Report what was preserved, changed, intentionally not changed, and what remains.

---

# 59. What Claude MUST NOT do

Do NOT:
- rebuild Akọ from scratch
- replace the mobile UI
- rewrite the Feed algorithm
- create a second recommendation engine
- create a second Contact Graph
- duplicate backend logic
- duplicate wallet logic
- duplicate Project access logic
- duplicate Gig logic
- duplicate messaging
- create fake desktop functionality
- create arbitrary dashboard cards
- add navigation merely to fill space
- copy Instagram
- copy TikTok
- turn Akọ into a SaaS dashboard
- make essential functionality hover-only
- break browser navigation
- break deep links
- bypass RLS
- bypass server permissions
- introduce client-authoritative financial logic
- change product rules merely because desktop exists

---

# 60. What Claude SHOULD do

DO:
- inspect first
- map first
- understand relationships
- understand priorities
- preserve strong work
- reuse existing components
- reuse backend authority
- create a coherent desktop shell
- use viewport space intentionally
- expose useful existing features
- make secondary functionality discoverable
- redesign composition where desktop genuinely benefits
- keep the interface simple
- keep it premium
- keep Akọ recognizable
- make navigation obvious
- make content the focal point
- make legitimate relationships easier to traverse
- test every major route
- test major user journeys
- test mobile after desktop changes

---

# 61. Three levels of desktop change

### Level A — Navigation
Same feature, easier access.

Example:
```text
mobile bottom navigation → desktop sidebar
```

### Level B — Composition
Same feature, better desktop layout.

Example:
```text
mobile Project → desktop Project + contextual action area
```

### Level C — Desktop-native capability
A capability that is genuinely better because of desktop.

Examples:
- multi-pane messaging
- keyboard navigation
- wider library management
- desktop media behavior

Do not create Level C features merely because they are technically possible.

---

# 62. Final quality test

Ask:

> If the Akọ logo disappeared for a moment, would this still feel like Akọ?

> If the colors changed temporarily, would the interaction architecture still feel intentional?

> Can a new user understand the sidebar without a tutorial?

> Does desktop feel substantially better than mobile when using a computer?

> Does it still feel like the same Akọ product?

If not, continue iterating.

---

# 63. Definition of Done

- [ ] Repository inspected before implementation.
- [ ] Frontend routes inventoried.
- [ ] Backend relationships inventoried.
- [ ] Current mobile navigation mapped.
- [ ] Current desktop behavior mapped.
- [ ] Design system mapped.
- [ ] Instagram desktop benchmark researched.
- [ ] TikTok desktop benchmark researched.
- [ ] Benchmark lessons documented without cloning.
- [ ] Desktop IA designed.
- [ ] Persistent desktop sidebar implemented.
- [ ] Sidebar hierarchy is intentional.
- [ ] Primary destinations are easy to reach.
- [ ] Secondary destinations are discoverable.
- [ ] Submenus are used where useful.
- [ ] Sidebar is not a route dump.
- [ ] For You / Following / Top Discussions preserved.
- [ ] Feed algorithm not rewritten.
- [ ] Contact Graph remains For You-only.
- [ ] Prioritize remains intact.
- [ ] Existing social/topic/performance signals remain intact.
- [ ] Mobile bottom navigation remains correct.
- [ ] Desktop is not a stretched mobile UI.
- [ ] Major pages have intentional desktop compositions.
- [ ] Messaging has an appropriate desktop composition.
- [ ] Profile portfolio architecture remains intact.
- [ ] Gigs remain distinct professional identities.
- [ ] Library/access architecture remains coherent.
- [ ] Wallet/earnings/withdrawals remain secure and server-authoritative.
- [ ] Search/Discover architecture reused.
- [ ] Notifications remain coherent.
- [ ] Create flows remain secure.
- [ ] No duplicate business logic.
- [ ] No duplicate recommendation engine.
- [ ] No duplicate relationship graph.
- [ ] No security bypass.
- [ ] Browser Back/Forward works.
- [ ] Deep links work.
- [ ] New-tab behavior works.
- [ ] Keyboard navigation works.
- [ ] Focus management works.
- [ ] Accessibility reviewed.
- [ ] Reduced motion works.
- [ ] Performance reviewed.
- [ ] Realtime subscriptions not duplicated.
- [ ] Large data sets tested.
- [ ] 1280 / 1440 / 1536 / 1920 / ultrawide tested.
- [ ] Browser zoom tested.
- [ ] Chrome / Safari / Firefox / Edge tested.
- [ ] Mobile regression tested.
- [ ] Major user journeys tested.
- [ ] No dead-end pages introduced.
- [ ] No important feature remains unnecessarily hidden.
- [ ] No meaningless UI added to fill space.
- [ ] Desktop feels premium.
- [ ] Desktop feels simple.
- [ ] Desktop feels unmistakably Akọ.
- [ ] Final audit report produced.

---

# 64. FINAL CLAUDE INSTRUCTION

You are acting as a veteran product designer, desktop UX designer, information architect, interaction designer, responsive design specialist, senior frontend engineer, Supabase-aware application architect, accessibility specialist and performance engineer.

You are **not** being asked to build a generic desktop dashboard.

You are being asked to evolve an existing mobile-first social/product platform into a **first-class desktop experience**.

Read the repository first.
Read the frontend.
Read the backend.
Read the database relationships.
Read the current routes.
Read the current navigation.
Read the design system.
Read Feed.
Read messaging.
Read Profiles.
Read Projects.
Read Gigs.
Read Library/access.
Read Wallet.
Read Notifications.
Read Pages.
Understand how the pieces connect.

Then research current Instagram desktop and TikTok desktop experiences.
Learn why their desktop navigation and spatial architecture work.
Do not copy them.

Then design Akọ.

The desktop experience should have a persistent, intelligent navigation spine.
The main content should use the viewport appropriately.
Secondary functionality should become easier to discover.
Different pages should have different desktop compositions when their tasks justify it.

Do not make Akọ look like Instagram on a bigger screen.

Make it feel like:

> **Akọ finally has a desktop home of its own.**

The result should be recognizable, understandable, navigable and memorable.

> **Simple enough to feel obvious.**
> **Deep enough to feel like a real platform.**
> **Distinct enough to feel like Akọ.**

---

# Research references

1. Meta / Instagram — Instagram Web updates: https://about.fb.com/news/2022/11/instagram-web-updates/
2. Meta / Instagram — Feed controls: https://about.fb.com/news/2022/03/two-new-ways-to-control-what-you-see-on-instagram/
3. Meta / Instagram — Messaging: https://about.fb.com/news/2022/03/introducing-new-instagram-messaging-features/
4. TikTok Newsroom — Desktop update: https://newsroom.tiktok.com/new-features-bring-tiktok-magic-to-desktop
5. TechCrunch — TikTok desktop redesign: https://techcrunch.com/2025/02/27/in-challenge-to-youtube-tiktok-revamps-its-desktop-platform/

These are external UX benchmarks. The Akọ repository remains the source of truth for Akọ's implementation, relationships, permissions and product behavior.
