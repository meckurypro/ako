# AKỌ — DYNAMIC PROFILE PORTFOLIOS & GIG SYSTEM AUDIT

## Purpose

Evolve Akọ's current **Posts | Projects** profile model into a dynamic portfolio system.

Core model:

- **Account** = the person/page.
- **Project** = the canonical work/content.
- **Gig** = a professional/service identity.
- **Portfolio relationship** = a Gig's relationship to an existing Project.

A profile always has **Posts**. Other tabs appear only when the account has meaningful eligible work in that category.

Examples:

- Books only → `Posts | Books`
- Music + books → `Posts | Artist | Books`
- Film + photography → `Posts | Film | Photography`
- Music + film + development → `Posts | Artist | Film | Developer`

This is an **audit-and-upgrade specification, not a blind rebuild**.

Claude must inspect the existing repository, schema, routes, components, Supabase policies, Project system, collaboration system, and existing Gig implementation first. Preserve stronger existing architecture.

---

# 1. THE FUNDAMENTAL DISTINCTION

Do not collapse these concepts:

### Account
The underlying person or Page.

### Project
The actual work.

Examples: Book, Course, Room, Event, File, Song, Film, etc.

### Gig
A professional/service identity through which a person offers work and presents a portfolio.

A single account can own multiple Gigs.

Example:

- Music Producer — `EMK Beatz`
- Cinematographer — `Emeka Visuals`
- Graphics Designer — `Obi Creative`

### Portfolio
A collection of canonical Projects associated with a Gig.

**Never duplicate a Project merely because it appears in a portfolio.**

---

# 2. DYNAMIC PROFILE TABS

Replace the generic user-facing:

`Posts | Projects`

with:

`Posts | [dynamic work categories]`

Projects remain an internal/product concept, but the profile should expose meaningful destinations.

A tab exists because there is something meaningful to explore.

Never show empty categories.

---

# 3. TAB REPRESENTS THE WORK, NOT NECESSARILY THE JOB TITLE

This is critical.

A **Cinematographer** works on a **Film**.

Therefore:

`Cinematographer → Film`

The person's Gig retains the role:

`Gig: Cinematographer`

The profile portfolio tab is:

`Film`

Likewise:

- Director → Film
- Actor → Film
- Film Producer → Film
- Film Editor → Film
- Photographer → Photography
- Graphics Designer → Design
- Dancer → Performance
- Comedian → Performance
- Music Artist → Artist
- Music Producer → Artist/music work
- Developer → Developer

A role answers **how the person contributed**.

A category answers **what kind of work visitors can explore**.

---

# 4. INITIAL CATEGORY FAMILIES

Audit the existing taxonomy before adding anything. Do not hard-code a second taxonomy if the current one can be extended.

Suggested initial families:

### Artist
Music Artist, Singer, Songwriter, Instrumentalist, Beat Maker, Music Producer, DJ, etc.

### Film
Actor, Cinematographer, Movie Director, Film Producer, Editor/Video Editor, Screenwriter, etc.

### Photography
Photographer, retoucher, photo editor, etc.

### Design
Graphics Designer, Illustrator, UI/UX Designer, Art Director, Fashion Designer, etc.

### Writing
Writer, Author, Poet, Copywriter, Journalist, etc.

### Performance
Dancer, Comedian, Spoken-word performer, Theatre performer, etc.

### Developer
Software Developer, Engineer, App Developer, Web Developer, etc.

### Books
Published Book Projects.

### Courses
Published Course Projects.

### Events
Published Event Projects.

### Rooms
Published Room Projects.

### Files
Relevant File Projects.

This list must remain extensible.

Do not create a generic **Creators** or **Creatives** tab merely because dancers, comedians, designers, etc. are all creative people. The category should describe the work.

---

# 5. ROLE → CATEGORY MAPPING

Create one canonical, extensible mapping:

`professional_role → portfolio_category`

Examples:

- Cinematographer → Film
- Movie Director → Film
- Actor → Film
- Photographer → Photography
- Graphics Designer → Design
- Dancer → Performance
- Comedian → Performance
- Music Artist → Artist
- Music Producer → Artist
- Developer → Developer

Use stable IDs/slugs rather than scattered display strings.

Do not duplicate this mapping across React components, RPCs, and Edge Functions.

---

# 6. EXISTING GIG SYSTEM REMAINS

Do **not** remove the existing Gig Project type.

It still has an important purpose.

A Gig is a professional/service storefront.

Existing pipeline should remain usable:

`Create Gig → select role → title → professional name → description → services → price → FAQ → portfolio`

Audit and preserve existing Gig fields.

A user should be able to create a Gig even before having Akọ work, because they may already have an external professional portfolio.

---

# 7. MANUAL GIG CREATION

The Gig creation UI should give the user an appropriate role selector.

Examples:

- Music Artist
- Singer
- Songwriter
- Instrumentalist
- Beat Maker
- Music Producer
- Cinematographer
- Photographer
- Movie Director
- Editor
- Dancer
- Comedian
- Graphics Designer
- Developer
- etc.

Use the canonical taxonomy.

Do not create a separate hard-coded role list.

---

# 8. PROFESSIONAL NAME

Gig professional name is distinct from:

- profile name
- username

Example:

`Profile: Emeka Obi`
`Username: @emekaobi`
`Music Producer Gig: EMK Beatz`
`Cinematographer Gig: Emeka Visuals`

The professional name can equal the username/profile name, but it must be user-controlled.

Automatic Gig creation must never invent professional names.

---

# 9. GIG PORTFOLIO

A Gig portfolio references canonical Projects:

`Gig → Portfolio relationship → Project`

Do not clone the Project.

Existing manual portfolio attachment remains supported.

Audit current implementation for:

- selecting existing Projects
- ownership/contribution validation
- duplicate prevention
- removal
- permissions
- visibility
- deleted/unpublished Projects

---

# 10. AUTOMATIC GIG CREATION FROM PROJECTS

Creating relevant professional work should be able to trigger an automatic Gig workflow.

Example:

A user creates a Film and identifies their role as:

`Cinematographer`

If they have no Cinematographer Gig:

1. Create a role-specific Gig draft.
2. Associate the Film as portfolio.
3. Mark the Gig incomplete.
4. Prompt the user to complete it.

Only authoritative information should be prefilled:

- role
- qualifying Project

Never fabricate:

- professional name
- bio
- pricing
- services
- FAQ
- experience
- availability

---

# 11. AUTOMATIC GIG CREATION FROM COLLABORATION

This is a major part of the system.

Example:

A Film creator tags:

`Chidi — Cinematographer`

Chidi receives a collaboration request.

### If Chidi accepts

Akọ checks:

`Does Chidi already have a Cinematographer Gig?`

### If YES

Reuse that Gig and associate the Film with its portfolio.

### If NO

Create:

`Cinematographer Gig — Incomplete`

with:

`Portfolio → Film`

Then ask Chidi to complete:

- professional name
- Gig title
- description
- services
- price
- FAQ
- other relevant fields

### If declined or ignored

Do not create an accepted professional portfolio relationship.

Acceptance is the trust boundary.

---

# 12. ONE ACCOUNT, MANY GIGS

Do not create separate accounts for separate professions.

Example:

Account: Emeka

Gigs:

- Music Producer
- Cinematographer
- Movie Director
- Graphics Designer

Work:

- Song A
- Film A
- Film B
- Album Artwork A

Profile can show:

`Posts | Artist | Film | Design`

---

# 13. ONE PROJECT, MANY CONTRIBUTORS

One canonical Film may have:

- Director → Emeka
- Cinematographer → Chidi
- Editor → Ada
- Graphics Designer → Kelechi
- Actor → Tolu

The same Film can appear in the relevant professional portfolios of each contributor after legitimate attribution.

Do not create copies of the Film.

Ownership remains unchanged.

---

# 14. PROFILE CATEGORY GENERATION

Derive available tabs from authoritative eligible content.

Conceptually:

`Posts + categories where user has eligible content`

Examples:

- eligible Book → Books tab
- eligible Film contribution → Film tab
- eligible music work → Artist tab
- eligible Design work → Design tab
- eligible Course → Courses tab

Do not hard-code all possible tabs for every profile.

Do not maintain stale manual tab state unless there is a compelling reason.

---

# 15. WHAT COUNTS AS ELIGIBLE

Claude must inspect current visibility/ownership rules and define eligibility for each Project type.

Consider:

- published
- visible
- not deleted
- not moderated out
- valid ownership
- accepted collaboration
- valid portfolio relationship
- active/eligible Gig where required

Never expose work that the user is not authorized to display.

---

# 16. PROFILE CATEGORY ≠ GIG

A profile category is a discovery surface.

A Gig is a professional/service surface.

Example:

Profile:

`Posts | Film`

Gig:

`Cinematographer — Chidi Visuals`

Gig contains:

- services
- price
- FAQ
- description
- portfolio

The Film tab shows the work.

The Gig explains the professional service and role.

Do not turn every role into a profile tab.

---

# 17. EXAMPLES

## Music producer

Gig:

`Music Producer — EMK Beatz`

Portfolio:

- Song A
- Song B

Profile:

`Posts | Artist`

## Cinematographer

Gig:

`Cinematographer — Chidi Visuals`

Portfolio:

- Film A
- Film B

Profile:

`Posts | Film`

## Dancer

Gig:

`Dancer`

Standalone performance:

`Posts | Performance`

Dance contribution to a film may additionally make:

`Film`

appropriate.

## Comedian

Gig:

`Comedian`

Profile may show:

`Posts | Performance | Events`

## Developer

Gig:

`Developer`

Profile:

`Posts | Developer`

## Multi-disciplinary creator

Gigs:

- Music Producer
- Cinematographer
- Graphics Designer

Profile:

`Posts | Artist | Film | Design`

---

# 18. EXISTING PROJECT PORTFOLIO BEHAVIOR

Preserve existing behavior where sound.

A user can:

- create a Gig
- choose its role
- attach an existing Project
- edit portfolio
- complete FAQ/description/price/etc.

The new automation should extend this pipeline, not replace it.

---

# 19. AUTOMATIC GIG REUSE

Never create a new Gig for every Project.

Before automatic creation:

`Find existing Gig for account + relevant role`

If found:

`reuse`

If not:

`create draft`

Make the operation concurrency-safe.

Two simultaneous collaboration acceptances must not create duplicate Gigs.

---

# 20. IDEMPOTENCY

Audit every mutation for:

- double-click
- retry after network failure
- refresh
- duplicate collaboration events
- duplicate Project events
- simultaneous devices

Must not create:

- duplicate Gigs
- duplicate portfolio relationships
- duplicate notifications

Use appropriate database constraints and/or idempotency mechanisms.

---

# 21. COLLABORATION OWNERSHIP

Collaboration does not transfer Project ownership.

Example:

`Film owner = Emeka`

`Chidi contribution = Cinematographer`

`Chidi portfolio relationship = valid after acceptance`

Never let portfolio association alter canonical ownership.

---

# 22. MUSIC INTEGRATION

For music:

Publisher/primary artist remains the primary discovery destination from Feed.

Collaborators are secondary credits.

After accepted collaboration:

`Artist → Artist Gig → Song`

`Producer → Music Producer Gig → Song`

`Songwriter → relevant Gig → Song`

The canonical song remains one Project/work.

---

# 23. PROFILE → PROJECT → GIG NAVIGATION

Users should be able to move naturally:

`Profile → Film → Film X → Cinematographer: Chidi → Chidi's Gig`

or:

`Profile → Artist → Song X → Producer → Producer Gig`

Avoid circular navigation and duplicate content.

---

# 24. PROJECT DETAIL

Project detail should clearly distinguish:

- owner/publisher
- contributors
- professional roles
- relevant Gigs

Primary creator remains primary.

Collaborators remain collaborators.

Do not visually overload the interface.

Use progressive disclosure where appropriate.

---

# 25. MANUAL PORTFOLIO CLAIMS

Do not allow arbitrary users to claim another creator's work.

If the current system permits portfolio attachment through legitimate contribution, preserve it but validate the relationship.

If current behavior is too permissive, harden it.

---

# 26. AUTOMATIC GIG COMPLETION UX

Automatically created Gigs must clearly be drafts/incomplete.

Example:

> **Complete your Cinematographer Gig**
>
> Your Film has been added to your portfolio.
> Add your professional name, services, pricing, description and FAQ to finish setting up your Gig.

Do not make the generated Gig look professionally complete when it is not.

Do not trap the user.

---

# 27. GIG DELETION

Deleting a Gig must not delete:

- Projects
- Posts
- collaborations
- canonical work

It only affects the Gig and its portfolio presentation.

Audit current behavior.

---

# 28. PROJECT DELETION / UNPUBLISHING

If a Project becomes unavailable publicly, audit how that affects:

- profile category
- Gig portfolio
- Project detail
- collaboration credit

Never leave broken portfolio cards.

Follow existing visibility semantics where possible.

---

# 29. COLLABORATION REVOCATION

Audit what happens when an accepted professional relationship is revoked.

Possible behavior:

- remove portfolio relationship
- archive it
- preserve historical credit

Do not invent behavior without checking current collaboration semantics.

Document the chosen rule.

---

# 30. ROLE-SPECIFIC GIG TEMPLATES

Different roles may eventually need different fields.

Examples:

Music Producer:

- professional name
- services
- pricing
- FAQ

Cinematographer:

- cinematography services
- pricing
- FAQ

Graphics Designer:

- design services
- pricing
- FAQ

Use the existing Gig architecture if it already supports extensibility.

Do not build a giant bespoke form system unnecessarily.

---

# 31. CATEGORY PRESENTATION

Reuse canonical Project cards/components.

Category pages can use appropriate layouts:

- Books → covers
- Artist → artwork/audio metadata
- Film → posters/thumbnails
- Photography → visual grid
- Design → visual portfolio
- Courses → course cards

Do not duplicate Project business logic.

---

# 32. TOO MANY PROFILE TABS

A multidisciplinary user may accumulate many categories.

Audit mobile behavior:

- horizontal scrolling
- overflow
- stable ordering
- touch targets
- responsive layout

Do not let the profile become unusable.

Do not add complexity until the actual UI requires it.

---

# 33. TAB ORDER

Audit the best ordering.

Consider:

- Posts first
- content volume
- recency
- professional importance
- user intent
- stability

Avoid tabs jumping around unnecessarily.

---

# 34. PAGES

Apply the dynamic category principle to Pages where appropriate.

Example:

`Posts | Books | Courses | Events | Artist`

But do not automatically apply personal professional Gig semantics to Pages.

Inspect existing Page architecture first.

---

# 35. ADMIN

If appropriate, Admin should be able to manage:

- active roles
- role/category mappings
- display names
- ordering
- deprecated roles

Admin overrides must remain:

- authorized
- scoped
- auditable
- reversible

Do not create a backdoor.

---

# 36. DATABASE AUDIT

Inspect existing schema before proposing tables.

Possible conceptual relationships include:

- gigs
- roles
- categories
- gig_portfolio_items
- projects
- project_collaborators
- collaboration_requests

These are conceptual only.

Extend the current schema if possible.

Avoid duplicate Gig or Project architectures.

---

# 37. PERFORMANCE

Do not query every possible category independently on every profile load.

Avoid:

`query Books → query Film → query Music → query Design → ...`

Prefer efficient aggregation or existing optimized patterns.

Audit:

- indexes
- query plans
- cache
- pagination
- category derivation
- large portfolios

---

# 38. CACHE CONSISTENCY

Profile categories must eventually update after:

- Project publication
- collaboration acceptance
- Gig creation
- portfolio association
- Project deletion
- Project unpublishing
- collaboration removal

Do not use fake timeouts to simulate updates.

Use the existing data/cache/realtime architecture.

---

# 39. SECURITY

The client must never decide:

- Project ownership
- collaboration acceptance
- valid portfolio attribution
- Gig creation eligibility
- profile category visibility

Server-side/Supabase authorization is authoritative.

Audit RLS, RPCs, Edge Functions, and service-role boundaries.

Test malicious clients directly.

---

# 40. TRANSACTIONAL AUTOMATION

Where dependent mutations happen together, use a safe transactional pattern.

Example:

`Accept collaboration`
→ validate
→ accept
→ find/create Gig
→ attach Project
→ notify

Avoid half-completed states.

If asynchronous processing is required, make it:

- persistent
- retryable
- idempotent
- observable

---

# 41. FAILURE RECOVERY

If collaboration acceptance succeeds but automatic Gig creation fails:

Do not lose the legitimate collaboration.

Separate core relationship state from secondary automation where necessary.

Provide safe retry/recovery.

Do not tell the user everything succeeded if it did not.

---

# 42. NOTIFICATIONS

Automatic Gig creation can generate a clear notification such as:

> Your Cinematographer Gig has been started. Complete your professional profile to finish setting it up.

Do not repeatedly notify for the same event.

Keep collaboration requests separate from Gig-completion notifications.

---

# 43. MIGRATION

Existing Gigs and portfolios must survive migration.

Do not force users to recreate:

- Gigs
- descriptions
- FAQ
- prices
- portfolio
- existing Project references

Existing `Posts | Projects` profiles should be safely migrated to dynamic categories.

Backfill should be:

- idempotent
- observable
- tested
- reversible where practical

---

# 44. GENERIC PROJECT FALLBACK

Audit every existing Project type.

If a type genuinely cannot map to a meaningful profile category, define a deliberate fallback.

Do not keep a generic Projects tab merely because migration is inconvenient.

Do not let a fallback become a dumping ground.

---

# 45. SEARCH & DISCOVERY

Search should distinguish:

- professional role
- work category
- Project

Example:

Searching `cinematographer` can discover people with Cinematographer Gigs.

Exploring `Films` discovers Film work.

Do not collapse role and work category into one concept.

---

# 46. ANALYTICS

Useful events:

- gig_auto_created
- gig_completed
- gig_portfolio_added
- gig_portfolio_removed
- collaboration_accepted
- profile_category_appeared
- profile_category_opened
- project_discovered_from_profile
- gig_opened_from_project

Analytics must never be the authority for permissions or financial state.

---

# 47. ACCESSIBILITY & MOBILE

Audit:

- keyboard navigation
- screen readers
- horizontal tab scrolling
- touch targets
- role labels
- portfolio cards
- completion prompts
- deep links
- Android behavior
- native-app readiness

The data model should survive web → native conversion without architectural redesign.

---

# 48. TEST MATRIX

Test:

### Profiles
- Posts only
- Books
- Artist
- Film
- Photography
- Design
- Performance
- Developer
- multiple categories
- many categories
- Page profiles

### Gigs
- manual creation
- role selection
- professional name
- FAQ
- description
- price
- portfolio attachment
- multiple Gigs

### Automatic Gig
- Project-triggered creation
- existing Gig reuse
- new draft creation
- completion
- retry
- duplicate request
- concurrent requests

### Collaboration
- tag
- notification
- accept
- decline
- accept twice
- two-device acceptance
- portfolio association

### Portfolio
- one Project in multiple portfolios
- duplicate prevention
- removal
- Project deletion
- unpublish
- collaboration revocation

### Security
- unauthorized Gig creation
- unauthorized portfolio insertion
- false Project claims
- fake collaboration acceptance
- client-side role manipulation
- RLS bypass
- RPC abuse
- race conditions

---

# 49. ACCEPTANCE CRITERIA

The implementation is complete when:

- Profiles no longer rely on generic `Posts | Projects` as the primary user-facing model.
- Posts remains the base tab.
- Meaningful work categories appear dynamically.
- Empty categories do not appear.
- One account can own multiple professional Gigs.
- Existing manual Gig creation remains.
- Gig creation includes role selection.
- Existing Project portfolio attachment remains.
- Relevant work can trigger automatic Gig setup.
- Accepted collaboration can trigger automatic Gig setup.
- Existing relevant Gigs are reused.
- Automatic Gigs are clearly incomplete until completed.
- No professional data is fabricated.
- Accepted collaborations can establish portfolio attribution.
- Declined/unaccepted collaborations cannot create accepted portfolio attribution.
- One canonical Project can appear in multiple contributor portfolios.
- Project ownership remains unchanged.
- Role and work category remain distinct.
- Cinematographer → Film works correctly.
- Dancer/Comedian → Performance where appropriate.
- Developer → Developer.
- Music roles → Artist/music work.
- Profile categories derive from authoritative data.
- Existing Gigs and portfolios survive migration.
- No duplicate Project/Gig architecture is introduced.
- RLS/server authorization protects all mutations.
- Automation is idempotent and concurrency-safe.
- Navigation works end-to-end.
- Mobile/native behavior remains coherent.

---

# 50. FINAL CLAUDE INSTRUCTION

**Do not start by coding.**

First inspect the current repository and report:

1. How profile/page tabs currently work.
2. How Project types are represented.
3. How Gigs are represented.
4. How Gig roles/categories are represented.
5. How Gig portfolios currently attach Projects.
6. How collaborations work.
7. What happens when collaboration is accepted.
8. Which Project creation flows contain professional-role information.
9. How profile content is currently derived.
10. Which architecture can be extended.
11. Which RLS/RPC/Edge Function protections already exist.
12. What current implementation is stronger than this specification.

Then classify findings as:

- Already correct
- Partially correct
- Missing
- Incorrect
- Duplicate architecture
- Security risk
- Data-integrity risk
- Performance risk
- UX issue
- Recommended upgrade
- Migration requirement
- Required tests

Only then implement.

Preserve stronger existing work.

Do not rebuild blindly.

Do not create duplicate systems.

Do not weaken security.

Do not fabricate professional information.

Do not make the client authoritative.

The goal is to evolve Akọ's existing system into the cleanest, safest, most coherent implementation of this model.

---

# 51. PRODUCT PRINCIPLES

> **One account. Many professional identities.**

> **The Project is the work. The Gig is the professional storefront.**

> **The role describes how someone contributed. The category describes what kind of work it is.**

> **Accepted contribution creates credible portfolio attribution.**

> **One canonical Project can appear in many professional portfolios without being duplicated.**

> **A profile shows the bodies of work a person actually has.**

> **Automatic creation removes friction without removing user control.**

> **The client can explain the state. The server decides the state.**

> **Profile = discovery. Gig = professional/service surface. Project = work.**

> **Don't force a multidisciplinary person into one identity.**
