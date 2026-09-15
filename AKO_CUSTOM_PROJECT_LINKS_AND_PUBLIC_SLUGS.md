# AKỌ — CUSTOM PROJECT LINKS / PUBLIC PROJECT SLUGS

## Purpose

Akọ Projects should have clean, memorable public links that creators can confidently share with other people.

A Project is something a person can create, publish, sell, share, promote, and build an identity around. Its public URL should therefore feel like an address to a real thing—not a database record.

This is an **audit-and-upgrade instruction for Claude**.

> **Inspect first. Preserve what works. Upgrade what is weak.**

---

# 1. FIRST: READ THE REPOSITORY

Before implementing anything, inspect the entire frontend and backend.

Understand the current architecture for:

- Project IDs
- Project URLs
- Project routing
- Project deep links
- Project sharing
- Feed links to Projects
- Profile and Gig links
- Book, Course, Room, and Event links
- external sharing
- internal navigation
- notifications linking to Projects
- messaging links to Projects
- purchase links
- Project access links
- affiliate links and attribution
- analytics
- SEO/public pages
- deleted, unpublished, private, and draft Projects
- Project ownership
- Project slugs, if any already exist

Determine whether the current Project URL is based on a UUID, database ID, slug, generated token, or another identifier. Do not assume.

---

# 2. CORE ARCHITECTURAL PRINCIPLE

The custom public link must **never become the canonical identity of the Project**.

The Project's internal immutable ID remains authoritative.

Conceptually:

```text
Project
├── immutable internal ID
├── owner
├── content
├── permissions
├── transactions
├── analytics
└── public slug / URL alias
```

If a creator changes:

```text
ako.app/emeka/my-first-book
```

to:

```text
ako.app/emeka/my-first-book-2026
```

the underlying Project remains exactly the same Project.

Purchases, access, affiliate attribution, analytics, ownership, portfolio relationships, comments, engagement, gifts, etc. must remain attached to the canonical Project ID.

---

# 3. CUSTOM SLUG EXPERIENCE

Determine the cleanest UX for allowing a creator to choose a Project link.

The user should be able to:

- choose a slug when appropriate
- see whether it is available
- understand the resulting public link
- change it later
- copy the link
- share the link

Inspect the existing Project creation/editing experience and place this feature where it naturally belongs.

Do not make the feature feel like a developer/database setting.

The experience should communicate:

> **“Choose the address people will use to find this Project.”**

---

# 4. URL ARCHITECTURE

Determine whether Akọ should use a structure such as:

```text
ako.app/@username/project-slug
```

or:

```text
ako.app/username/project-slug
```

or another structure that fits the existing routing architecture.

Do not choose a structure merely because another social platform uses it.

Evaluate:

- existing Akọ URLs
- profile routing
- Gig routing
- SEO
- uniqueness
- collision prevention
- future scalability
- Pages
- creator identity
- Project ownership changes
- renamed usernames
- renamed Projects
- affiliate links
- external sharing
- mobile deep linking

Choose the architecture that best fits Akọ.

If the repository already has a stronger URL architecture, preserve it.

---

# 5. SLUG RULES

Establish sensible rules for custom Project slugs.

Consider:

- minimum and maximum length
- lowercase normalization
- allowed characters
- spaces
- hyphens
- numbers
- repeated hyphens
- leading/trailing hyphens
- Unicode
- reserved words
- offensive terms
- impersonation
- URL safety
- case sensitivity

Do not over-engineer this.

The objective is a clean, memorable public URL.

---

# 6. UNIQUENESS

Determine exactly what must be unique.

For example, if the architecture is:

```text
username/project-slug
```

it may be reasonable for:

```text
emeka/my-book
uche/my-book
```

to coexist while preventing the same user from having two Projects with:

```text
emeka/my-book
```

Evaluate whether per-user uniqueness or global uniqueness is more appropriate.

Do not impose global uniqueness unless there is a strong architectural reason.

The final uniqueness guarantee must exist at the authoritative persistence layer.

---

# 7. SLUG CHANGES

Creators should be able to change their Project slug where appropriate.

Changing the slug must not change the Project.

Determine whether Akọ should retain historical slugs.

A strong implementation may allow:

```text
Current:
ako.app/emeka/my-book

Changed to:
ako.app/emeka/my-first-book
```

with the old URL redirecting to the new public URL.

Inspect the existing routing architecture before implementing historical aliases.

Do not create an unlimited alias system without considering database growth, abuse, reserved slugs, security, SEO, privacy, and deleted Projects.

---

# 8. PROJECT OWNERSHIP

Changing a public Project link must never grant or transfer ownership.

Changing a slug must not affect:

- ownership
- collaborators
- portfolio relationships
- Gigs
- purchases
- access
- affiliate attribution
- wallet transactions
- royalties
- analytics
- comments
- engagement
- moderation

The Project ID remains authoritative.

---

# 9. AFFILIATE COMPATIBILITY

Akọ already has an affiliate/forking system.

Changing a Project's public slug must **not break affiliate attribution**.

Affiliate relationships should resolve to the canonical Project rather than depending solely on the current public slug.

Conceptually:

```text
Affiliate link
      ↓
Affiliate attribution
      ↓
Canonical Project ID
      ↓
Project
```

If the creator changes the Project URL, existing affiliate relationships must continue working.

Do not turn the public slug into the attribution key.

---

# 10. SHARING

Audit every place where a Project can be shared.

The new public URL should be used consistently where appropriate:

- Feed
- Profile
- Gig portfolio
- Messaging
- Notifications
- Project cards
- Purchase flows
- external sharing
- copy-link actions
- QR codes, if Akọ supports them
- affiliate promotion
- social sharing

Do not leave a mixture of ugly internal URLs and custom public URLs without a deliberate reason.

---

# 11. ACCESS CONTROL

A custom URL must never bypass Project permissions.

Test:

- public Project
- private Project
- unpublished Project
- draft Project
- deleted Project
- paid Project
- free Project
- restricted Project
- Project the user has purchased
- Project the user has not purchased
- blocked creator
- blocked user
- unauthorized access

A beautiful URL is still only a route.

The backend remains authoritative over whether the visitor can actually access the Project.

---

# 12. SECURITY

The implementation must be server-authoritative.

Do not trust the client to determine:

- slug availability
- Project ownership
- permission to change a slug
- Project visibility
- canonical Project identity

Prevent:

- slug hijacking
- race conditions during slug creation
- duplicate slugs
- unauthorized slug changes
- impersonation
- reserved-route collisions
- malformed URLs
- abuse of slug history
- enumeration of private Projects

Use proper database constraints where appropriate rather than relying only on frontend validation.

---

# 13. CONCURRENCY

Test the situation where two requests attempt to claim the same slug simultaneously.

The database must remain correct.

Do not rely only on:

```text
check availability
→ wait
→ insert
```

The final uniqueness guarantee must exist at the authoritative persistence layer.

---

# 14. PERFORMANCE

Evaluate:

- slug lookup performance
- database indexes
- routing performance
- database queries
- redirects
- caching
- deep-link behavior
- mobile performance
- desktop performance

Do not create expensive joins merely to resolve a public URL.

---

# 15. SEO / PUBLIC WEB

If Akọ has public Project pages, determine how custom Project URLs interact with:

- page titles
- metadata
- Open Graph
- social previews
- canonical URLs
- search indexing
- redirects

Do not blindly make private or restricted Projects indexable.

Inspect the existing public-web/marketing architecture before changing anything.

---

# 16. USER EXPERIENCE

The final experience should be extremely simple.

A creator should not need to understand:

- slugs
- UUIDs
- routing
- aliases
- canonical IDs
- database identifiers

They should simply understand:

> **“This is the link people use to find my Project.”**

The interface should feel like part of Akọ's product, not a developer console.

---

# 17. DO NOT CREATE A SECOND URL SYSTEM

Inspect the existing architecture first.

If Akọ already has:

- public Project routes
- sharing utilities
- deep-link helpers
- URL builders
- route constants
- canonical link utilities

extend them.

Do not create two competing Project URL systems.

There should be one coherent Project-link architecture.

---

# 18. TEST END TO END

Test the complete lifecycle:

```text
Create Project
      ↓
Choose custom link
      ↓
Publish
      ↓
Open link
      ↓
Share link
      ↓
Someone visits link
      ↓
View / purchase / join
      ↓
Access Project
```

Then test:

```text
Change slug
      ↓
New link works
      ↓
Old link behavior works as designed
      ↓
Existing purchases remain intact
      ↓
Existing access remains intact
      ↓
Affiliate attribution remains intact
      ↓
Analytics remain attached to same Project
```

---

# 19. FINAL REPOSITORY AUDIT

After implementation, search the entire repository again.

Verify:

- no broken Project links
- no unnecessary duplicate URL builders
- no stale hardcoded Project routes
- no client-authoritative slug logic
- no broken affiliate links
- no broken deep links
- no broken notifications
- no broken Feed links
- no broken profile/Gig portfolio links
- no broken purchase/access flows
- no unauthorized access through custom URLs

Test both mobile and desktop.

Also test external browser access where the Project is intended to be publicly accessible.

---

# 20. FINAL REPORT

Provide a final report containing:

## Architecture

- current Project URL architecture
- chosen public URL architecture
- canonical Project identity
- slug storage model
- uniqueness model
- historical URL strategy

## UX

- where creators set the slug
- where they edit it
- availability behavior
- copy/share behavior
- error states

## Security

- authorization
- database constraints
- reserved words
- race-condition handling
- private Project protection
- slug history protection

## Integration

- Feed
- Profile
- Gigs
- Messaging
- Notifications
- Purchases
- Access
- Affiliate attribution
- Analytics
- Public web/SEO

## Migration

- existing Project URLs
- backward compatibility
- redirects
- affected routes
- affected components

## Verification

- files changed
- tests performed
- problems discovered
- remaining work

---

# AKỌ PRINCIPLE

Do not implement custom Project links merely because other platforms have them.

The reason is fundamental:

**A Project is something a person can create, publish, sell, share, promote, and build an identity around.**

It should therefore have a clean public address.

Instead of making a creator say:

> “Go to Akọ, find my Project, then look for this thing…”

they should be able to simply say:

> **“Here is my Project.”**

and send one clean link.

---

# OPERATING RULE

**Inspect first.**

**Understand the existing URL and routing architecture.**

**Preserve what already works.**

**Upgrade what is weak.**

**Do not rebuild blindly.**

**Keep the internal Project ID immutable and authoritative.**

**Treat the custom link as a human-readable public address.**

**Make the link simple for the user and rigorous underneath.**

**Do not break purchases, access, attribution, portfolios, analytics, or permissions.**

**Akọ's URLs should feel like addresses to things that exist—not database records.**
