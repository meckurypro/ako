# AKỌ — Affiliate Forking & Persistent Attribution

## Status

**Product specification / implementation brief**

This document defines Akọ's affiliate marketing system for eligible paid Projects.

The goal is to allow a creator to turn a paid Project into a distributed commercial opportunity: other Akọ users can fork the Project as an **affiliate**, receive a unique referral link, promote it on or off Akọ, and earn a creator-defined commission when their referrals purchase.

The affiliate does **not** become the owner of the Project.

---

# 1. Product Idea

A creator can make an eligible paid Project available for affiliate forking.

An interested user can:

1. Fork the Project as an affiliate.
2. Receive a unique affiliate identity/link for that Project.
3. Promote the link anywhere:
   - On Akọ
   - WhatsApp
   - Instagram
   - X
   - Telegram
   - Websites
   - Email
   - Anywhere else they are allowed to share it
4. A buyer follows the affiliate link.
5. The buyer purchases the Project.
6. Akọ records the sale and attributes the commission to the affiliate.
7. The creator receives the creator's share.
8. The affiliate receives the configured commission share through Akọ's normal earnings/wallet system.

### Core idea

> **Creators create the thing. Affiliates help distribute the thing. Akọ tracks the relationship and splits the money.**

This turns ordinary users into distribution partners without requiring them to create the original product.

---

# 2. Terminology

### Original Project

The paid Project created and owned by the original creator.

### Creator

The owner of the original Project.

### Affiliate

A user who forks an eligible Project specifically for commercial referral/distribution.

### Affiliate Fork

A commercial referral instance associated with the original Project and the affiliate.

The fork is **not a transfer of ownership**.

### Affiliate Link

A unique URL or referral identifier associated with an affiliate and an original Project.

### Attribution

The relationship Akọ records between a buyer and the affiliate through whom the buyer discovered the Project.

### Attribution Window

The configurable period during which an affiliate remains eligible for commission after the buyer's initial attributed discovery.

### Commission

The percentage or amount of an eligible sale that is assigned to the affiliate.

---

# 3. Why This Exists

Akọ should not only help people create things.

It should help valuable things **travel**.

A user may discover a book, course, event, or other paid Project and think:

> "My people would love this."

They should be able to say:

> "Let me distribute this."

They don't need to recreate the Project.

They don't need to negotiate privately with the creator.

They don't need to build their own storefront.

They fork it as an affiliate, receive their link, promote it, and earn when their network buys.

This creates a second layer of participation:

**Creator → creates value**

**Affiliate → distributes value**

**Buyer → purchases value**

**Akọ → coordinates attribution and settlement**

---

# 4. Creator Flow

## 4.1 Make Project Affiliate-Eligible

When creating or editing a paid Project, the creator can enable:

**Allow affiliate forking**

If enabled, the creator must configure the affiliate commission.

Example:

- Project price: $20
- Affiliate commission: 20%
- Affiliate earns: $4
- Creator/platform receive the remaining amount according to Akọ's fee/payment rules.

The exact fee calculation must be handled server-side.

Never trust a commission value supplied by the client during checkout.

---

# 5. Creator Controls

The creator should be able to configure:

- Affiliate availability: ON/OFF
- Commission percentage
- Whether existing affiliate forks remain valid after affiliate availability is turned off
- Whether commission changes apply to existing affiliates or only new sales
- Whether the Project can be promoted externally
- Whether the creator can revoke a specific affiliate
- Whether the creator can view affiliate performance

### Important recommendation

Commission changes should normally be versioned.

For example:

**Commission Version 1**
- 20%
- Effective January 1

**Commission Version 2**
- 25%
- Effective February 1

Existing sales should always be calculated using the commission configuration that was valid for that sale.

Do not recalculate historical commissions using today's percentage.

---

# 6. Affiliate Fork Flow

When an eligible Project is viewed, the user can select:

**Fork as Affiliate**

Akọ creates an affiliate relationship between:

- `original_project_id`
- `affiliate_user_id`

The affiliate receives a unique referral link.

Example conceptually:

`ako.app/p/project-name?ref=affiliate_id`

The exact public URL structure is an implementation decision.

### Important

The referral identifier must not expose sensitive information.

Prefer an opaque, non-guessable affiliate token rather than exposing internal database IDs.

---

# 7. What the Affiliate Fork Means

The fork is a **commercial referral instance**.

It is not:

- ownership
- a copy of the creator's intellectual property
- a new independent Project
- permission to modify the original Project's paid content
- permission to remove creator attribution
- permission to bypass Akọ's payment system
- permission to sell the Project independently

The original creator remains the owner.

The affiliate is granted permission to promote and refer buyers to the original Project under Akọ's affiliate rules.

---

# 8. Affiliate Page / Experience

An affiliate should be able to see:

- Project title
- Project creator
- Project description
- Project preview
- Current public price
- Affiliate commission
- Estimated earnings per sale
- Number of clicks
- Number of attributed buyers
- Number of completed sales
- Pending commission
- Available commission
- Affiliate link
- Share/copy button

The affiliate should not receive private creator-only information.

---

# 9. Promotion

Affiliate links should work both:

### On Akọ

Examples:

- Feed posts
- Project posts
- Messages
- Profile links
- Shared Project cards

### Off Akọ

Examples:

- WhatsApp
- Instagram
- X
- Telegram
- Email
- Websites
- Other external channels

The affiliate link should lead the buyer to the public Project/purchase experience.

The affiliate should not need the buyer to already have an Akọ account before clicking the link.

If account creation is required before purchase, the attribution must survive the signup/login process.

---

# 10. Attribution — Core Requirement

Attribution is one of the most important parts of this system.

When a buyer first discovers a Project through an affiliate link, Akọ should record that referral relationship.

Conceptually:

```text
Buyer
  ↓
Affiliate Link
  ↓
Affiliate
  ↓
Original Project
```

Akọ must preserve this relationship even if the buyer later leaves the page.

---

# 11. Persistent Attribution

Example:

1. User A forks a course as an affiliate.
2. User A shares the affiliate link.
3. Buyer B clicks the link.
4. Akọ records that Buyer B discovered the course through User A.
5. Buyer B does not purchase immediately.
6. Days later, Buyer B searches Akọ manually.
7. Buyer B visits the original creator's Project directly.
8. Buyer B purchases.

Under the configured attribution rules, User A should still receive the affiliate commission.

### Principle

> **Discovery through an affiliate should not automatically lose attribution simply because the buyer later navigates directly to the original Project.**

This is the "persistent attribution" part of the feature.

---

# 12. Attribution Window

Persistent does not necessarily mean infinite.

A configurable attribution window should exist.

Example:

```text
Affiliate click
       ↓
Attribution recorded
       ↓
30-day attribution window
       ↓
Buyer purchases
       ↓
Affiliate receives commission
```

The exact window should be configurable by Akọ.

Possible initial value:

**30 days**

However, do not hard-code this into business logic if it may change later.

Store attribution timestamps and evaluate eligibility server-side.

---

# 13. Attribution Rules

A clear deterministic attribution policy is required.

Recommended MVP rule:

### First qualifying affiliate referral wins.

If Buyer B first discovers Project X through Affiliate A:

```text
Buyer B → Project X → Affiliate A
```

A later affiliate click should not silently replace Affiliate A.

This prevents affiliates from overwriting one another simply by sending a buyer another link later.

If Akọ eventually wants "last click wins", multi-touch attribution, or creator-defined attribution, that should be a deliberate future feature.

Do not accidentally create attribution behavior through frontend implementation.

---

# 14. Direct Purchases After Affiliate Discovery

Example:

```text
Monday:
Buyer clicks Affiliate A link.

Tuesday:
Buyer searches Akọ directly.

Wednesday:
Buyer opens creator's Project directly.

Thursday:
Buyer purchases.
```

If Thursday falls inside the valid attribution window:

**Affiliate A receives the configured commission.**

The direct visit does not erase the existing attribution relationship.

---

# 15. Multiple Affiliates

Example:

```text
Affiliate A → Buyer clicks
Affiliate B → Buyer clicks later
Buyer → purchases
```

For MVP, use a deterministic single-attribution model.

Recommended:

**First qualifying affiliate referral wins.**

The database should make this relationship explicit and protected against accidental replacement.

---

# 16. Affiliate Ownership Restrictions

The affiliate must never be able to:

- change the original creator
- change the creator's Project ownership
- change the Project price
- change the creator's commission
- access creator-only analytics
- access private Project content
- delete the original Project
- alter the creator's payout
- redirect the Project's purchase destination
- create arbitrary commission percentages
- transfer the affiliate relationship to another user
- impersonate the creator

Any affiliate-facing fields must be validated server-side.

---

# 17. No Attribution Bypass

The affiliate fork must not expose a purchasing path that accidentally removes attribution.

Bad:

```text
Affiliate Fork
   ↓
Purchase
   ↓
Original Project
   ↓
Affiliate information lost
```

Correct:

```text
Affiliate Fork
   ↓
Tracked referral context
   ↓
Original Project
   ↓
Checkout
   ↓
Attribution preserved
   ↓
Commission calculated
```

Attribution should be associated with the actual purchase/transaction on the backend.

Do not rely solely on frontend query parameters at checkout.

---

# 18. Server-Side Attribution

The client may initiate a referral visit, but the server must ultimately establish the authoritative attribution record.

At minimum, store:

- affiliate relationship ID
- affiliate user ID
- original Project ID
- buyer user ID when known
- referral token / identifier
- first-attributed timestamp
- attribution expiration timestamp
- attribution status
- source metadata where appropriate
- related purchase/transaction ID
- commission configuration/version
- commission amount

Avoid storing unnecessary personal information.

---

# 19. Anonymous Visitors

A buyer may click an affiliate link before creating an Akọ account.

The system should preserve referral context through:

```text
Affiliate click
    ↓
Anonymous visitor
    ↓
Signup/login
    ↓
Buyer identity established
    ↓
Attribution attached to buyer
```

The implementation must prevent users from manipulating referral identifiers during signup to steal attribution.

---

# 20. Checkout

At checkout, the buyer should see the normal Project purchase flow.

The buyer does not need to manually enter a commission code if the affiliate link has already established attribution.

The backend should determine:

- Project
- price
- applicable taxes/fees if relevant
- creator share
- platform share
- affiliate share
- attribution eligibility
- commission version
- transaction ID

The client must not be trusted to provide these final values.

---

# 21. Commission Calculation

Example:

```text
Project price:             $20.00
Affiliate commission:        20%
Affiliate commission:       $4.00
Remaining amount:          $16.00
```

If Akọ has platform/payment fees, the exact financial calculation must be explicitly defined.

Do not leave ambiguity about whether commission is calculated from:

- gross sale price
- net sale amount
- amount after payment processing
- amount after platform fee
- another basis

Choose one rule and implement it consistently.

Recommended MVP:

**Define commission against the Project's eligible sale amount before payout, with Akọ's applicable platform/payment fee treatment explicitly documented.**

The exact final formula should be confirmed in the financial implementation before launch.

---

# 22. Immutable Transaction Record

Every affiliate sale should create an auditable financial record.

Conceptually:

```text
Purchase
   ├── Buyer debit
   ├── Creator credit
   ├── Affiliate commission credit
   └── Platform/payment accounting
```

The ledger must make it possible to reconstruct:

- who bought
- what was bought
- original Project
- creator
- affiliate
- sale amount
- commission percentage
- commission amount
- transaction timestamp
- attribution record
- transaction status

Do not rely on mutable wallet balances as the sole source of truth.

---

# 23. Refunds / Chargebacks

Affiliate commissions must account for payment reversals.

Example:

```text
Buyer purchases
↓
Affiliate commission becomes pending
↓
Refund occurs
↓
Commission is reversed/voided according to policy
```

Do not allow an affiliate to cash out a commission that is later impossible to recover without accounting for the liability.

Commission status should support states such as:

- pending
- approved
- available
- paid
- reversed
- refunded
- disputed
- cancelled

The exact state machine should be implemented consistently with Akọ's existing wallet/payout system.

---

# 24. Pending Commission

Consider keeping affiliate earnings pending for an appropriate settlement period.

This protects against:

- refunds
- chargebacks
- fraudulent purchases
- payment reversals

Affiliate earnings should become withdrawable only when the underlying transaction is sufficiently settled under Akọ's payout policy.

---

# 25. Self-Referral

An affiliate should not be able to earn commission by purchasing their own affiliate Project.

At minimum:

```text
affiliate_user_id != buyer_user_id
```

The backend must enforce this.

Do not rely on hiding the affiliate link from the affiliate.

---

# 26. Fraud Prevention

Affiliate marketing introduces new abuse vectors.

The system should monitor for:

- self-referrals
- repeated purchases between related accounts
- fake accounts
- suspicious signup → click → purchase patterns
- unusually high conversion rates
- repeated payment instruments where applicable
- refund abuse
- chargeback abuse
- automated clicking
- referral manipulation
- attribution hijacking
- affiliate account farming

Do not automatically accuse users based on a single signal.

Use risk signals and appropriate review/hold mechanisms.

---

# 27. Attribution Hijacking Protection

An attacker must not be able to overwrite another affiliate's attribution simply by constructing or modifying a URL.

Affiliate identifiers should be:

- unguessable
- validated
- tied to the affiliate relationship
- tied to the original Project
- server-validated

The backend should never accept:

```text
commission = 50
affiliate_id = attacker
```

from an untrusted client and treat it as authoritative.

---

# 28. Affiliate Revocation

Creators should be able to revoke an affiliate relationship where appropriate.

When revoked:

- existing historical sales remain historically attributed
- previously completed commissions are not silently rewritten
- new purchases should no longer generate commissions for the revoked relationship
- the affiliate link should stop generating new eligible referrals

The exact behavior for existing attribution windows after revocation should be explicitly defined.

Recommended MVP:

**Revocation stops new attribution and future commissions, while preserving already-completed transaction history.**

---

# 29. Project Deletion / Unpublishing

If the original Project is unpublished or deleted:

- existing transactions remain immutable
- historical affiliate earnings remain auditable
- new purchases stop
- affiliate links should no longer create new sales
- affiliate dashboards should retain historical performance

Do not cascade-delete financial history.

---

# 30. Analytics

Creators should eventually be able to see:

- total affiliates
- clicks
- attributed buyers
- conversions
- gross sales
- affiliate commissions
- creator earnings

Affiliates should be able to see:

- clicks
- attributed buyers
- purchases
- conversion rate
- earnings
- pending earnings
- available earnings
- paid earnings

Analytics must respect authorization boundaries.

An affiliate must not see another affiliate's private performance data.

---

# 31. Affiliate Discovery

A future version may include an affiliate marketplace/discovery layer.

For MVP, keep it simple:

```text
Eligible Project
      ↓
Fork as Affiliate
      ↓
Get Link
      ↓
Share
      ↓
Earn
```

Do not build a complex affiliate marketplace before the basic financial and attribution system is proven.

---

# 32. Database Design Principles

The exact schema should fit the existing Akọ database rather than creating duplicate concepts.

Likely conceptual entities:

### `affiliate_programs`

Represents the affiliate configuration for a Project.

Possible fields:

- id
- project_id
- creator_id
- enabled
- commission_percentage
- commission_version
- created_at
- updated_at

### `affiliate_relationships`

Represents a user's affiliate fork.

Possible fields:

- id
- affiliate_program_id
- project_id
- affiliate_user_id
- referral_token
- status
- created_at
- revoked_at

### `affiliate_attributions`

Represents the buyer → affiliate relationship.

Possible fields:

- id
- project_id
- affiliate_relationship_id
- buyer_id
- first_attributed_at
- expires_at
- status

### `affiliate_commissions`

Represents commission generated by a purchase.

Possible fields:

- id
- purchase_id
- project_id
- affiliate_relationship_id
- affiliate_user_id
- commission_version
- commission_percentage
- eligible_amount
- commission_amount
- status
- created_at
- settled_at
- reversed_at

These are conceptual models only.

**Claude must inspect the existing schema first and reuse existing wallet, Project, purchase, user, and transaction structures wherever possible.**

Do not blindly create duplicate wallet or transaction systems.

---

# 33. Row-Level Security

All affiliate tables and operations must have appropriate RLS policies.

Users should be able to:

- view their own affiliate relationships
- view their own affiliate performance
- view eligible public Project information
- create valid affiliate relationships where allowed

Creators should be able to:

- manage affiliate configuration for Projects they own
- view authorized affiliate performance for their Projects
- revoke affiliate relationships for their Projects

Users must NOT be able to:

- modify another user's affiliate relationship
- assign themselves as another user's affiliate
- modify commission amounts
- modify attribution
- create fake commissions
- edit financial records
- edit transaction history

Service-role operations must remain server-side.

---

# 34. Wallet Integration

Affiliate commissions should integrate with Akọ's existing wallet system.

Do not create a separate unofficial affiliate balance.

The financial flow should ultimately reconcile with the same authoritative wallet/ledger architecture used elsewhere in Akọ.

All balance-changing operations should occur server-side.

---

# 35. Idempotency

Affiliate purchase processing must be idempotent.

If a payment webhook or purchase confirmation is received multiple times:

**One purchase must not create multiple commissions.**

Use the existing transaction/payment idempotency architecture where available.

At minimum, there must be a unique relationship between:

```text
purchase/transaction
+
affiliate commission
```

such that the same sale cannot accidentally pay an affiliate twice.

---

# 36. Webhooks

If payment providers send webhooks:

- verify signatures
- verify event authenticity
- make processing idempotent
- never trust client-side payment-success claims
- calculate commission server-side
- record the provider event/transaction identifier
- handle retries safely

A successful frontend redirect is not proof that money was successfully settled.

---

# 37. Security Principle

Treat every affiliate request as potentially malicious.

The frontend is not trusted.

The user can modify:

- URLs
- JavaScript
- API requests
- request bodies
- local storage
- cookies where applicable
- query parameters

The backend must enforce every financial and authorization rule.

---

# 38. User Experience

The feature should feel extremely simple.

For creator:

> **Make this Project available to affiliates**

> **Commission: 20%**

For affiliate:

> **Fork as Affiliate**

> **Your commission: 20%**

> **Copy Affiliate Link**

For buyer:

> Normal Project purchase experience.

The complexity should remain underneath.

This follows the Akọ principle:

> **Hard machinery underneath. Simple experience on top.**

---

# 39. Notifications

Potential notifications:

### Affiliate

- "Your affiliate sale was recorded."
- "You earned $X from a sale."
- "Your commission is now available."
- "A commission was reversed because the purchase was refunded."

### Creator

- "Your Project received a sale through an affiliate."
- "Affiliate X generated Y sales."
- "Your Project's affiliate program is performing."

Avoid excessive notification spam.

---

# 40. Abuse / Policy Considerations

Affiliate promotion should still follow Akọ's platform rules.

Affiliates must not use:

- spam
- impersonation
- deceptive claims
- fraudulent advertising
- malicious redirects
- misleading pricing
- fake testimonials
- harassment
- prohibited content

Akọ should reserve the ability to suspend affiliate privileges for abuse.

Suspending an affiliate should not erase historical financial records.

---

# 41. MVP Scope

### Must Have

- Creator can enable affiliate program for eligible paid Projects.
- Creator can set commission percentage.
- User can fork eligible Project as affiliate.
- Unique affiliate relationship/link is created.
- Affiliate can share the link.
- Affiliate link works externally.
- Referral attribution survives signup/login.
- Attribution persists according to defined window.
- Purchase correctly records affiliate attribution.
- Commission is calculated server-side.
- Commission integrates with wallet/ledger.
- Self-referral is blocked.
- Duplicate commission is prevented.
- Refund/reversal path exists.
- Creator can disable/revoke affiliate program/relationship.
- RLS and authorization are enforced.
- Affiliate can see their own earnings/performance.

### Not Required for MVP

- Complex multi-touch attribution
- Affiliate marketplace
- Affiliate rankings
- Affiliate leaderboards
- Multi-level referrals
- Affiliate teams
- Advanced campaign management
- Custom coupon systems
- Complex influencer contracts
- Cross-project affiliate bundles

Keep V1 focused.

---

# 42. Test Scenarios

Claude should test at minimum:

### Basic

- Creator enables affiliate program.
- User forks Project.
- Unique referral link is generated.
- Buyer clicks link.
- Buyer purchases.
- Correct commission is created.

### Direct return

- Buyer clicks affiliate link.
- Leaves.
- Returns directly to Project.
- Purchases within attribution window.
- Affiliate receives commission.

### Signup

- Anonymous visitor clicks affiliate link.
- Visitor creates account.
- Visitor purchases.
- Attribution survives signup.

### Multiple affiliates

- Affiliate A link clicked first.
- Affiliate B link clicked later.
- Buyer purchases.
- Attribution follows the defined first-touch rule.

### Self-referral

- Affiliate tries to buy through own link.
- Commission is rejected.

### Manipulation

Attempt to:

- change affiliate ID
- change commission percentage
- change Project ID
- forge purchase amount
- forge attribution
- create commission directly
- repeat webhook
- replay purchase request

All must fail safely.

### Refund

- Buyer purchases.
- Commission is recorded.
- Purchase is refunded.
- Commission is reversed according to policy.

### Revocation

- Affiliate relationship revoked.
- Old transaction remains intact.
- New qualifying purchase does not generate commission.

### Project removal

- Project unpublished.
- New purchase path stops.
- Historical transactions remain available.

### Race condition

Two purchase/confirmation events arrive simultaneously.

Expected:

**One purchase → one commission.**

---

# 43. Definition of Done

This feature is not complete merely because the UI works.

It is complete when:

- affiliate relationships are authoritative server-side
- attribution is deterministic
- attribution survives signup/login
- attribution cannot be hijacked
- commission calculations cannot be client-manipulated
- purchases cannot create duplicate commissions
- refunds and reversals are handled
- affiliate and creator permissions are isolated
- wallet/ledger entries reconcile
- historical financial records are immutable
- RLS policies are tested
- service-role operations are protected
- payment webhooks are verified and idempotent
- self-referrals are blocked
- malicious-client tests pass
- the system can explain exactly why an affiliate received a commission

---

# 44. Implementation Instruction for Claude

Before changing code:

1. Inspect the existing Akọ repository.
2. Inspect the existing Project schema.
3. Inspect the existing wallet architecture.
4. Inspect the existing purchase/payment flow.
5. Inspect existing transaction/ledger tables.
6. Inspect existing RLS policies.
7. Inspect existing Edge Functions/API endpoints.
8. Inspect existing authentication/session behavior.
9. Identify reusable infrastructure.
10. Do not create duplicate financial systems.

Then design the smallest implementation that fits the existing architecture.

### Important

Do not treat this document as permission to blindly add tables.

First determine:

> **What already exists?**

Then extend it safely.

---

# 45. Final Security Audit Instruction

After implementation, perform a dedicated affiliate security audit.

Do not merely say:

> "Looks secure."

Prove the important properties.

Verify:

- Can a user assign themselves as someone else's affiliate?
- Can a user modify a commission percentage?
- Can a user fabricate a purchase?
- Can a user fabricate attribution?
- Can a user steal another affiliate's attribution?
- Can the same purchase generate two commissions?
- Can a revoked affiliate continue earning?
- Can a creator alter historical commissions accidentally?
- Can a buyer remove attribution by navigating directly?
- Can a user earn from self-referral?
- Can a malicious client manipulate Project price?
- Can a malicious client manipulate wallet credits?
- Can a webhook be replayed?
- Can an unauthenticated user create an affiliate relationship?
- Can an affiliate access private creator data?
- Can an affiliate access another affiliate's earnings?
- Can a creator access financial information they are not authorized to see?

For every important property, provide evidence through:

- code inspection
- RLS policy inspection
- database constraints
- automated tests
- transaction traces
- adversarial test cases

If something is not secure, fix it before declaring the feature complete.

---

# 46. Product Philosophy

Affiliate Forking is not simply an affiliate-marketing add-on.

It extends Akọ's core idea:

> **People should be able to recognize value, gather around it, build around it, and participate economically in it.**

A creator does not have to be the only person responsible for distribution.

Someone can encounter a Project and say:

> "This is good. My people need this."

Then they can do something about it.

They fork it.

They share it.

Their network discovers it.

The creator earns.

The affiliate earns.

The buyer gets something valuable.

And Akọ keeps the relationship, attribution, and economics connected.

### The larger loop

**Create → Discuss → Gather → Build → Distribute → Earn**

Affiliate Forking adds **Distribute** to the Akọ ecosystem.

That is the feature.
