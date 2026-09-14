# AKỌ — GIG ROLE EXPANSION, PROFESSIONAL IDENTITY & COLLABORATION-DRIVEN GIG CREATION

## Status
**Type:** Product / UX / Architecture Audit & Upgrade Specification

## Core Principle

Akọ already allows users to create Gigs. Do **not** create a second Gig system.

Audit the existing Gig implementation first, then extend it so that:

> **One Akọ account can own multiple independent Gigs, each representing a distinct professional role or creative practice, with its own page, professional identity, catalogue, and presentation.**

A user can therefore be:
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
- and other appropriate roles.

A producer can simultaneously have a Music Producer Gig, Cinematographer Gig, Movie Director Gig, and Graphics Designer Gig. These are **different Gigs**, not one profile with multiple labels.

---

# 1. Audit the Existing Gig System First

Before changing code, read the repository and map:

- Gig tables/schema
- Gig roles/types
- Gig creation/editing
- Gig pages/routes
- catalogue implementation
- ownership and permissions
- discovery/search
- media/portfolio
- pricing/services
- existing admin controls
- notifications
- collaboration model
- Music Catalogue
- contributor/credit model
- RLS/RPCs/Edge Functions
- tests

Preserve stronger existing architecture. Extend rather than duplicate.

Do not create a parallel Gig system.

---

# 2. Account vs Gig

An Akọ account represents the person/entity.

A Gig represents **one professional role**.

Conceptually:

```text
Akọ Account
 ├── Music Producer Gig
 ├── Cinematographer Gig
 ├── Movie Director Gig
 └── Graphics Designer Gig
```

Each Gig can independently have:

- professional name
- description
- catalogue
- portfolio
- services
- pricing where applicable
- media
- role-specific presentation

Do not collapse these into one Gig.

---

# 3. Professional Name

Every Gig should support a professional/catalogue name separate from:

- username
- profile name

Example:

```text
Username: @emekaobi
Profile name: Emeka Obi

Music Producer Gig:
EMK Beatz

Cinematographer Gig:
Emeka Visuals

Movie Director Gig:
Emeka Obi Films
```

The Gig name may equal the username or profile name, but does not have to.

Do not overwrite account identity when a Gig name is changed.

For musicians, this is equivalent to a stage/artist name. For other professions it may be a studio, brand, professional, or portfolio name.

---

# 4. Multiple Independent Gigs

The system must support multiple Gigs belonging to one account.

The role is the key distinction.

Example:

```text
@emeka

Music Producer
    → EMK Beatz

Cinematographer
    → Emeka Visuals

Movie Director
    → Emeka Obi Films

Graphics Designer
    → Obi Creative
```

Each should have its own page and catalogue.

Do not assume that because an account already owns *a* Gig, it therefore owns the relevant Gig.

---

# 5. Gig Role Taxonomy

Expand the existing Gig role/type system to support relevant creative/professional roles.

Initial examples:

### Music
- Music Artist
- Singer
- Songwriter
- Instrumentalist
- Beat Maker
- Music Producer

### Film / Visual
- Cinematographer
- Movie Director
- Photographer
- Editor / Video Editor

### Performance
- Dancer
- Comedian

### Design
- Graphics Designer

The architecture should be extensible.

Where practical, Admin should be able to manage the role taxonomy rather than requiring a code change for every future role.

Do not hard-code unnecessary future professions.

---

# 6. Existing Manual Gig Creation Remains

Akọ already allows users to create Gigs.

Keep that.

The user should still be able to:

1. Create a Gig.
2. Select its role.
3. Enter professional name.
4. Configure the Gig.
5. Build its catalogue.
6. Publish/update it.

The new collaboration behavior is an extension to this existing capability.

---

# 7. Music Publishing → Gig

Music Publishing should connect naturally to Gigs.

When a user publishes music:

1. Enter music metadata.
2. Establish the primary artist/publisher identity.
3. Add collaborators.
4. Assign each collaborator a role.
5. Complete the existing rights/ownership workflow.
6. Publish the music into the Akọ Music Catalogue.

If the publisher has an appropriate Music Artist Gig, the music should be associated with that Gig.

If the existing Music Catalogue implementation already has a stronger artist-identity mechanism, preserve it and integrate the Gig layer around it.

---

# 8. Collaborator Roles

A music publisher can tag Akọ accounts as specific collaborators, for example:

```text
Singer → @ada
Songwriter → @john
Beat Maker → @emeka
Music Producer → @emeka
Instrumentalist → @person
```

The role matters.

A collaborator relationship must be tied to the selected role, not merely to the person's account.

---

# 9. Collaboration Request

When a creator tags an Akọ account as a collaborator, that account receives a notification/request.

Example:

> **Collaboration request**  
> Numa added you as a Music Producer on “Odogwu.”

The recipient can:

- Accept
- Decline

A creator cannot silently create a professional Gig for another person without their acceptance.

---

# 10. Automatic Gig Creation After Acceptance

When the collaborator accepts:

### First check the exact role.

Example:

```text
Collaborator: @emeka
Role: Music Producer
```

Check:

> Does @emeka already have a Music Producer Gig?

### If YES

Reuse the existing Music Producer Gig.

Associate the collaboration with it.

### If NO

Automatically create a **Music Producer Gig template** for @emeka.

Do not create a generic Gig simply because the account has no Gig.

The matching must be role-specific.

---

# 11. Role-Specific Matching

This rule is fundamental.

If @emeka already has:

> Cinematographer Gig

and is newly credited as:

> Music Producer

the system must still check for a **Music Producer Gig**.

It must not attach the work to the Cinematographer Gig.

Conceptually:

```text
account_id + gig_role
```

determines the relevant Gig, subject to the current repository's actual data model and existing product rules.

If the existing product intentionally supports multiple Gigs of the same role, audit and preserve that behavior and define how collaboration matching selects the appropriate Gig.

Do not guess.

---

# 12. Automatically Created Gig Is a Template

A collaboration-created Gig should not fabricate a complete professional identity.

Akọ may prepopulate legitimate information known from the collaboration.

Example:

```text
Gig role:
Music Producer

Professional name:
[User completes]

Description:
[User completes]

Catalogue:
Odogwu — Producer

Portfolio:
[User adds]

Services:
[User adds]

Pricing:
[User adds if applicable]
```

Do not invent:

- stage names
- biographies
- prices
- services
- qualifications
- portfolio claims

The system knows the user was credited. It does not know their entire professional identity.

---

# 13. User Completes the Gig

After accepting a collaboration and receiving a new Gig template, the user should be guided to complete it.

Example:

> **Your Music Producer Gig has been created.**  
> Complete it to showcase your work.

The user should be able to enter/update:

- professional name
- description
- catalogue
- portfolio
- services
- pricing where applicable
- media
- role-specific information

The Gig must not become an unavoidable onboarding dead end. The user can leave and return later.

---

# 14. Music Publisher Is Primary

When music is discovered through a Feed post, the **song publisher / primary artist identity is the primary discovery destination**.

Example:

```text
Odogwu
CeeSoul

Credits:
EMK Beatz — Producer
John — Songwriter
Ada — Singer
```

When the listener opens the music:

> **Primary destination:** CeeSoul's Music Artist Gig/catalogue.

Collaborators are secondary credits.

They can be explored, but should not replace the publisher as the primary destination.

---

# 15. Collaborators Remain Discoverable

Credits can lead to the relevant collaborator Gig.

Example:

```text
EMK Beatz — Producer
```

opens the Music Producer Gig if the user chooses to explore it.

But the hierarchy remains:

```text
Primary:
Publisher / primary artist

Secondary:
Collaborators
```

Do not turn every collaborator into an equally prominent Feed destination.

---

# 16. Music in the Publisher's Gig Catalogue

Published music should appear in the relevant Music Artist Gig catalogue where appropriate.

Example:

```text
CeeSoul
Music Artist

Catalogue

Odogwu
Song 2
Song 3
```

The Music Catalogue remains the canonical source.

The Gig catalogue is a professional presentation/discovery layer.

Do not duplicate the music object.

---

# 17. Music in Collaborator Gigs

After an accepted collaboration, the work can appear in the relevant collaborator's Gig catalogue.

Example:

```text
EMK Beatz
Music Producer

Catalogue

Odogwu
Producer
```

This does **not** make Emeka the publisher.

It means the song is part of Emeka's professional catalogue because he was credited in that role.

The UI must clearly distinguish:

- Published by
- Artist
- Featured artist
- Producer
- Songwriter
- Instrumentalist
- etc.

Never imply ownership that does not exist.

---

# 18. Canonical Work, Multiple Gig References

There should be one canonical Music Catalogue record.

It can be referenced by multiple Gigs.

Conceptually:

```text
Music Record
   ↓
Published by CeeSoul
   ↓
CeeSoul Music Artist Gig

Music Record
   ↓
Credits EMK Beatz as Producer
   ↓
EMK Beatz Music Producer Gig
```

Do not create duplicate copies of the same song simply to place it in different catalogues.

Use relationships/references to the canonical record.

---

# 19. Other Collaborative Work

The architecture must be generic enough to support this pattern beyond music.

Example:

```text
Film Project
    ↓
Cinematographer → @emeka
    ↓
Collaboration Request
    ↓
Accept
    ↓
Cinematographer Gig exists?
    ├── Yes → associate work
    └── No → create Cinematographer Gig template
```

Or:

```text
Design Project
    ↓
Graphics Designer → @person
    ↓
Accept
    ↓
Graphics Designer Gig
```

Music is the first major integration, not the permanent limit of the architecture.

---

# 20. Role-Specific Gig Templates

Different Gig roles may need different catalogue structures.

Examples:

### Music Artist
- Professional/stage name
- Bio
- Music catalogue
- Releases
- Featured work

### Music Producer
- Professional name
- Production catalogue
- Beats
- Produced songs
- Services
- Pricing where applicable

### Photographer
- Professional name
- Portfolio
- Photography categories
- Services
- Pricing

### Cinematographer
- Professional name
- Film/video portfolio
- Credits
- Services

### Movie Director
- Professional name
- Filmography
- Directed works
- Portfolio

### Graphics Designer
- Professional name
- Design portfolio
- Services
- Pricing

### Dancer / Comedian
- Professional/stage name
- Performance catalogue
- Portfolio
- Services

Use the existing Gig architecture wherever possible rather than creating separate systems for each role.

---

# 21. Gig Management UX

Audit the existing navigation and give users a clear way to see/manage their Gigs.

Example:

```text
Your Gigs

EMK Beatz
Music Producer

Emeka Visuals
Cinematographer

Emeka Obi Films
Movie Director

Obi Creative
Graphics Designer
```

Each opens its own Gig.

Do not make users hunt through unrelated profile settings.

Use the existing Akọ information architecture if it already has a better home.

---

# 22. Discovery

Gigs should be discoverable through relevant Akọ discovery mechanisms.

Potential signals:

- Gig role
- professional name
- catalogue
- search
- Feed content
- music credits
- Project relationships
- relevant recommendations

Role-specific discovery matters.

Someone looking for a cinematographer should discover the user's **Cinematographer Gig**, even if the same account also has several other Gigs.

---

# 23. Account → Gig Relationship

A Gig belongs to an Akọ account, but is professionally presented as its own entity.

Conceptually:

```text
Professional Gig
      ↓
owned by
      ↓
Akọ Account
```

Do not make the account identity disappear.

Do not make the Gig indistinguishable from the personal profile.

---

# 24. Collaboration Does Not Transfer Ownership

Being credited does not transfer:

- music ownership
- publishing ownership
- project ownership
- account ownership
- Gig ownership

If Numa publishes a song and credits Emeka as Producer:

```text
Numa:
Publisher / primary music identity

Emeka:
Collaborator / Producer
```

The automatic Gig relationship does not alter this.

---

# 25. Declining a Collaboration

If a collaborator declines:

- do not create a new Gig from the declined request
- do not add the work as an accepted collaboration to their Gig
- preserve appropriate request history according to existing notification behavior
- let the existing Music Catalogue rights/publishing workflow determine what happens to the release

Do not automatically assume that one declined collaborator invalidates the entire music release.

---

# 26. Existing Gig Detection + Concurrency

Automatic creation must be idempotent.

Example:

```text
Collaboration A
Music Producer → @emeka

Collaboration B
Music Producer → @emeka
```

If both are accepted at the same time, do not accidentally create duplicate Music Producer Gigs unless multiple same-role Gigs are explicitly supported.

Use:

- database constraints where appropriate
- transactions
- safe upserts
- server-side existence checks
- idempotency
- concurrency tests

The client is never authoritative.

---

# 27. Notifications

Reuse the existing notification system.

Potential states:

### Request

> Numa added you as a Music Producer on “Odogwu.”

### Gig created

> Your Music Producer Gig has been created from your collaboration.

### Completion

> Complete your Music Producer Gig to showcase your work.

Avoid notification spam.

---

# 28. Security

All important operations must be server-authoritative.

Never trust the client to determine:

- Gig ownership
- collaborator role
- collaboration acceptance
- whether a Gig exists
- catalogue ownership
- music-to-Gig associations
- permission to edit a Gig

Audit:

- Supabase RLS
- RPCs
- Edge Functions
- authorization
- notification permissions
- collaboration mutations
- Gig mutation permissions
- Music Catalogue relationships

---

# 29. Data Integrity

Preserve these invariants:

- A Gig belongs to one account.
- A Gig has a defined role/type.
- A professional name belongs to the Gig.
- A collaboration belongs to a canonical work.
- Acceptance does not change publisher ownership.
- A declined collaboration cannot become an accepted catalogue relationship.
- Music has one canonical publication record.
- Gig catalogues reference canonical works rather than cloning them.
- Only authorized users can edit their Gigs.
- A user cannot fabricate credits through the client.
- Automatic Gig creation is role-specific and idempotent.

---

# 30. Moderation / Takedown

If a music release is:

- unpublished
- deleted
- moderated
- legally taken down

the associated Gig catalogue references must reflect the canonical state.

Do not leave dead catalogue cards.

If a Gig is deleted/unpublished:

- do not delete the underlying music
- do not alter ownership
- only the Gig presentation/relationship changes according to existing lifecycle rules

---

# 31. Admin

Audit current Admin controls.

Potential controls:

- Gig role taxonomy
- role labels
- role availability
- role-specific templates
- moderation
- spam/duplicate Gig controls
- collaboration abuse
- feature flags / kill switches if needed

Do not expose privileged security or financial controls to clients.

---

# 32. Analytics

Track meaningful events:

- Gig creation started
- role selected
- manual Gig created
- collaboration request sent
- collaboration accepted
- collaboration declined
- existing Gig matched
- automatic Gig template created
- Gig completed
- professional name updated
- music added to Gig catalogue
- music discovered through Gig
- publisher Gig opened
- collaborator Gig opened

Distinguish:

```text
Manual Gig creation
vs
Collaboration-created Gig
```

---

# 33. Anti-Abuse

Audit for:

- mass collaboration tagging
- fake credits
- notification spam
- malicious Gig creation
- impersonation
- catalogue pollution
- duplicate Gigs
- harassment through collaboration requests

Use existing Akọ controls such as:

- rate limiting
- blocking
- reporting
- moderation
- account standing

Do not let automatic Gig creation become a spam mechanism.

---

# 34. UX States

Support:

### Existing role Gig

> You already have a Music Producer Gig.

Offer to associate the new collaboration with it.

### No role Gig

> You don't have a Music Producer Gig yet.

After acceptance:

> We've created a Music Producer Gig for you.

### Incomplete Gig

> Complete your Gig to showcase your work.

### Pending

Keep collaboration clearly pending.

### Declined

No automatic Gig.

### Removed/unavailable account

Handle gracefully.

---

# 35. Implementation Plan

## Phase 1 — Audit
Read and map the current Gig, Music Catalogue, collaboration, notification, profile, and security architecture.

## Phase 2 — Gig Expansion
Extend existing Gig roles and support multiple independent role-specific Gigs per account.

## Phase 3 — Professional Identity
Add/confirm Gig-level professional name and role-specific presentation.

## Phase 4 — Music Integration
Connect published music to the publisher's relevant Gig and collaborator roles to relevant Gigs.

## Phase 5 — Collaboration Automation
Implement:

```text
Tag collaborator
      ↓
Collaboration request
      ↓
Accept
      ↓
Check exact Gig role
      ↓
Existing Gig?
 ┌────┴────┐
Yes       No
 ↓         ↓
Reuse    Create template
```

## Phase 6 — UX
Upgrade Gig creation, Gig management, collaboration notifications, Gig completion, Music discovery, and catalogue presentation.

## Phase 7 — Security + Testing
Audit RLS, authorization, concurrency, idempotency, catalogue integrity, notification abuse, and mobile behavior.

---

# 36. Do Not Blindly Implement

This is an **audit-and-upgrade specification**, not permission to rebuild Akọ blindly.

Claude must:

1. Read the repository first.
2. Understand the existing Gig implementation.
3. Understand the existing Music Catalogue implementation.
4. Understand the collaboration and notification architecture.
5. Identify what already works.
6. Preserve stronger existing implementations.
7. Extend existing abstractions where appropriate.
8. Avoid duplicate systems.
9. Avoid unnecessary schema duplication.
10. Avoid replacing working UI without reason.
11. Test the full end-to-end behavior.

If the current implementation is stronger than a detail in this document, keep the stronger implementation and adapt around it.

---

# 37. Definition of Done

- [ ] Existing Gig system audited.
- [ ] Existing Gig functionality preserved.
- [ ] One account can own multiple Gigs.
- [ ] Gigs are independently role-specific.
- [ ] Producer + cinematographer + director + designer can coexist as separate Gigs.
- [ ] Each Gig has its own page/catalogue.
- [ ] Professional name is independent from username/profile name.
- [ ] Manual Gig creation remains functional.
- [ ] Gig role taxonomy supports the required creative roles.
- [ ] Music Publishing integrates with Gigs.
- [ ] Publisher remains the primary music discovery identity.
- [ ] Collaborators remain properly credited.
- [ ] Collaboration requests are sent to tagged accounts.
- [ ] Accepting checks the exact collaborator role.
- [ ] Existing matching Gig is reused.
- [ ] Missing matching Gig can be automatically created as a template.
- [ ] Automatic Gig creation does not fabricate professional information.
- [ ] Collaborator can complete the created Gig.
- [ ] Music can appear in publisher Gig catalogues.
- [ ] Accepted credited work can appear in collaborator Gig catalogues.
- [ ] Canonical music records are not duplicated.
- [ ] Publisher/ownership distinctions remain correct.
- [ ] Declined collaborations do not create accepted Gig relationships.
- [ ] Concurrent requests cannot accidentally create duplicate role Gigs.
- [ ] Server is authoritative.
- [ ] RLS/authorization is correct.
- [ ] Moderation/takedown states propagate correctly.
- [ ] Gig deletion does not delete unrelated canonical music.
- [ ] Music → publisher Gig discovery works.
- [ ] Credits → collaborator Gig discovery works.
- [ ] Loading/empty/error/incomplete states work.
- [ ] Mobile UX works.
- [ ] Analytics distinguish manual vs collaboration-created Gigs.
- [ ] Critical flows have automated tests.
- [ ] No parallel Gig architecture was introduced.

---

# 38. Final Product Model

The system should ultimately make this possible:

> **One account. Many professional identities.**

A person is not one profession.

A producer can be a cinematographer.

A cinematographer can be a movie director.

A director can be a graphics designer.

Those are not contradictions and should not be forced into one Gig.

Each professional identity gets its own Gig, its own catalogue, its own name, and its own presentation.

Then collaboration creates a natural bridge into that system:

> **Someone credits you → you accept → Akọ connects the work to the right Gig, or creates that role-specific Gig template for you.**

And music discovery follows a clear hierarchy:

> **Find the song → find the publisher/artist first → explore collaborators second → discover their relevant Gigs.**

The result should feel like one coherent Akọ system, not several disconnected features.
