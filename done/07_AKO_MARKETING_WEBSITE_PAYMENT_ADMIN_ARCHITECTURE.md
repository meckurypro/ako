# AKỌ — MARKETING WEBSITE, PAYMENT GATEWAY & ADMIN REPOSITORY MIGRATION
## Public SEO Website / Payment Surface / Admin Console Architecture & UX Specification

**Status:** Pre-launch / Production architecture specification  
**Primary repository:** New dedicated Akọ website repository  
**Related repository:** Existing Akọ web-app repository  
**Primary objective:** Build a separate, indexable, emotionally compelling Akọ marketing website that also becomes the controlled public payment surface and the home for Akọ Admin.

---

# 1. THE PRODUCT DECISION

Akọ needs a clear separation between:

## A. Akọ App / Web App

The actual product:

- Feed
- Posts
- Comments
- Discover
- Profiles
- Messaging
- Projects
- Books
- Courses
- Rooms
- Wallet
- Gifts
- Notifications
- Social interactions
- User workflows

This remains the application.

## B. Akọ Website

A public, SEO-indexable website that explains and represents Akọ to the outside world.

It is NOT a second version of the web app.

Its job is:

- introduce Akọ
- create curiosity
- explain the philosophy
- communicate trust
- provide public information
- rank in search engines
- provide legal/privacy pages
- provide support/help information
- provide App Store / Google Play download paths
- host payment pages
- host the Admin system
- act as the public trust layer around the product

The website should feel like:

> **Akọ's front door to the world.**

The web app should feel like:

> **Akọ itself.**

Do not blur the two.

---

# 2. IMPORTANT REPOSITORY DECISION

The user will create a new repository specifically for the Akọ website.

The user will connect:

- existing Akọ application repository
- new Akọ website repository

to Claude.

Claude must work across both repositories when necessary.

The new repository becomes the canonical home for:

- public marketing website
- SEO pages
- legal/information pages
- public security information
- payment UI
- payment return/redirect surfaces
- Admin UI
- Admin routes
- Admin components
- Admin-specific frontend logic

The existing app repository remains the canonical home for the actual social application unless an explicit migration is required.

---

# 3. DO NOT BLINDLY MOVE CODE

This is a migration and architectural separation exercise.

Claude MUST:

1. inspect the existing Akọ repository
2. map the current architecture
3. identify payment UI
4. identify payment components
5. identify payment routes
6. identify payment API calls
7. identify payment state
8. identify payment success/failure flows
9. identify webhook dependencies
10. identify Admin pages
11. identify Admin components
12. identify Admin routes
13. identify Admin authentication/authorization
14. identify Admin backend calls
15. identify shared components
16. identify shared types
17. identify environment variables
18. identify Supabase dependencies
19. identify edge-function dependencies
20. identify storage dependencies
21. identify security assumptions

Then determine what belongs in the new website repository.

Do NOT simply copy entire folders.

Do NOT create two competing implementations.

Do NOT break the existing backend.

Do NOT duplicate business logic unnecessarily.

---

# 4. CORE ARCHITECTURE

Target:

```text
                         ┌─────────────────────────┐
                         │       AKỌ WEBSITE       │
                         │                         │
                         │ Marketing / SEO         │
                         │ About                   │
                         │ FAQ                     │
                         │ Privacy                 │
                         │ Terms                   │
                         │ Security                │
                         │ Help                    │
                         │ Download                │
                         │ Payment                 │
                         │ Admin                   │
                         └────────────┬────────────┘
                                      │
                                      │
                              Shared backend
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   AKỌ BACKEND / DATA    │
                         │                         │
                         │ Supabase                │
                         │ Auth                    │
                         │ Postgres                │
                         │ Storage                 │
                         │ Edge Functions          │
                         │ Payments                │
                         │ Wallet                  │
                         │ Projects                │
                         └────────────┬────────────┘
                                      │
                                      │
                         ┌────────────▼────────────┐
                         │       AKỌ APP           │
                         │                         │
                         │ Feed                    │
                         │ Social                  │
                         │ Messaging               │
                         │ Projects                │
                         │ Wallet                  │
                         │ etc.                    │
                         └─────────────────────────┘
```

The website and app are two frontends over the appropriate shared backend infrastructure.

---

# 5. THE WEBSITE MUST NOT BECOME A SECOND WEB APP

This is one of the most important rules.

Do not reproduce:

- Feed
- full social navigation
- complete profiles
- messaging
- social timelines
- the entire application shell

inside the marketing website merely because the website can technically access the database.

The public website should remain focused.

It can link into the app where appropriate.

Example:

```text
ako website
     ↓
"Open Akọ"
     ↓
ako app
```

not:

```text
ako website
     ↓
full Feed implementation
```

---

# 6. BRAND EXPERIENCE

The website should feel:

- soft
- cool
- intimate
- human
- nostalgic
- intelligent
- calm
- warm
- curious
- premium
- culturally grounded
- unmistakably Akọ

It should NOT feel like:

- a generic SaaS landing page
- a cryptocurrency startup
- a corporate bank
- a loud Nigerian startup landing page
- an AI-generated template
- a Silicon Valley clone
- an over-animated Web3 site

The desired emotional feeling is:

> **"Come in. There's something interesting happening here."**

---

# 7. WHATSAPP WEBSITE AS UX REFERENCE

The WhatsApp website supplied by the user should be treated as a reference for:

- intimacy
- simplicity
- confidence
- generous whitespace
- approachable typography
- storytelling
- human imagery
- restrained animation
- strong product photography
- clear calls to action
- trust communication
- making technology feel personal

Do NOT copy WhatsApp.

Do not reproduce:

- exact layouts
- exact copy
- exact illustrations
- exact color system
- exact typography
- exact components
- exact navigation

Extract the design principles and reinterpret them through Akọ.

---

# 8. NOSTALGIA

The website should deliberately create a subtle nostalgic feeling.

Possible emotional ingredients:

- familiar objects
- tactile textures
- warm photographic moments
- quiet storytelling
- human-scale imagery
- visual references to notebooks, conversations, gathering, making and learning
- subtle cultural visual language
- restrained motion
- editorial spacing

Nostalgia should not become:

- retro gimmick
- sepia filter everywhere
- old-computer aesthetic
- excessive cultural decoration

The feeling should be:

> **familiar, intimate and human.**

---

# 9. AKỌ IDENTITY

Preserve:

- Akọ name
- Akọ logo
- "A Reason to Reason"
- green/orange identity
- cultural visual language
- artifacts/icons
- intelligent tone
- Nigerian origin without shrinking the product into geography

Do not suddenly rebrand the website as a generic blue technology company.

---

# 10. HOME PAGE

The homepage should immediately answer:

1. What is Akọ?
2. Why should I care?
3. What can I do here?
4. Why is it different?
5. Where do I get it?

Potential structure:

```text
Hero
 ↓
What Akọ is
 ↓
Why Akọ exists
 ↓
Ideas → conversations → things
 ↓
Feed / social discovery
 ↓
Projects
 ↓
People / communities / finding your people
 ↓
Value exchange / gifting / earning where appropriate
 ↓
Privacy / trust
 ↓
Download Akọ
 ↓
Footer
```

Claude should not blindly use this exact sequence.

Inspect the design and determine the strongest narrative.

---

# 11. HERO

The hero should be extremely clear.

Potential direction:

> **A reason to reason.**

or another strong Akọ-native statement.

The hero should contain:

- short headline
- concise supporting copy
- Android download button
- iOS download button
- 3D phone mockup / product visualization
- subtle motion where useful

The first screen should not require the visitor to read an essay.

---

# 12. 3D PHONE MOCKUP

The homepage should feature a high-quality 3D phone mockup displaying Akọ.

The phone should:

- feel premium
- show actual Akọ UI
- be recognizable as Akọ
- not look like a generic template
- maintain correct proportions
- have realistic depth
- work responsively
- not destroy page performance

Potential behavior:

- subtle floating motion
- slight parallax
- gentle device rotation
- screen content animation

Avoid:

- aggressive spinning
- distracting 3D effects
- huge WebGL payloads
- motion that makes text difficult to read
- animation on every scroll

---

# 13. PHONE SCREEN CONTENT

The phone mockup should show real or carefully designed representative Akọ UI.

Do not show:

- fake features that do not exist
- placeholder screens presented as real
- confidential user data
- real private user information

Use:

- controlled demo content
- curated screenshots
- synthetic content
- approved product imagery

---

# 14. DOWNLOAD BUTTONS

The homepage must have prominent:

> **Download for Android**

and

> **Download for iOS**

buttons.

They should eventually redirect to:

- Google Play
- Apple App Store

Do not hard-code guessed URLs.

Use configurable environment/site configuration.

When the app is officially released:

```text
Android button → official Google Play listing
iOS button → official App Store listing
```

---

# 15. STORE LINK CONFIGURATION

Keep store URLs configurable.

For example:

```text
PUBLIC_ANDROID_STORE_URL
PUBLIC_IOS_STORE_URL
```

Do not scatter store URLs throughout components.

This allows launch/update changes without hunting through the codebase.

---

# 16. WEBSITE NAVIGATION

Keep navigation simple.

Possible categories:

- Home
- About
- Explore / Learn
- Security
- Help

with:

> Download Akọ

as a strong action.

Legal links should live in the footer.

Do not build a giant corporate navigation tree.

---

# 17. MOBILE NAVIGATION

The website must be mobile-first.

Test:

- Android Chrome
- iPhone Safari
- common mobile viewport sizes
- small screens
- large phones
- tablet
- desktop

Navigation should be easy to reach.

Avoid tiny links.

Avoid crowded headers.

---

# 18. WEBSITE PAGE INVENTORY

Claude should audit and implement the necessary public pages.

Expected pages may include:

```text
/
 /about
 /privacy
 /terms
 /security
 /faq
 /help
 /contact
 /download
```

Potential future pages:

```text
 /projects
 /creators
 /gifts
 /community
 /press
 /careers
```

Do not create every future page now unless useful.

---

# 19. SEO ARCHITECTURE

This is a major reason for separating the website from the app.

The website must be genuinely indexable.

Claude must implement:

- semantic HTML
- correct headings
- page titles
- meta descriptions
- canonical URLs
- Open Graph metadata
- social sharing metadata
- robots.txt
- sitemap.xml
- clean URLs
- appropriate structured data where useful
- crawlable content
- fast rendering
- image alt text
- accessible navigation
- internal linking

Do not rely entirely on client-side rendering if it materially harms discoverability.

---

# 20. SEO CONTENT

The public site should contain real useful language around Akọ.

Search engines should be able to understand:

- what Akọ is
- who it is for
- what people can do
- Projects
- learning
- discussion
- creativity
- communities
- private messaging
- payments
- privacy

Do not stuff keywords.

Write for humans first.

---

# 21. SEARCH ENGINE INDEXING

The site should be configured intentionally.

Review:

- robots.txt
- sitemap
- canonical URLs
- redirects
- 404
- 301
- duplicate pages
- query parameters
- trailing slash behavior
- staging environment indexing
- admin route indexing
- payment route indexing

CRITICAL:

Admin pages must NOT be indexable.

Payment/session pages should generally not be treated as SEO landing pages.

---

# 22. ADMIN ROBOTS RULE

The Admin system should have:

```text
noindex
```

and appropriate crawl restrictions.

Do not expose Admin pages as public SEO content.

Also ensure authentication protects them server-side.

Robots.txt is NOT an access-control mechanism.

---

# 23. PAYMENT PAGE ROBOTS RULE

Payment pages should not become search-engine landing pages.

Use appropriate:

- noindex
- authentication/session requirements where necessary
- canonical handling
- no sensitive query parameters

Never put sensitive payment information in URLs.

---

# 24. PUBLIC WEBSITE VS PRIVATE ROUTES

The website can contain both:

```text
PUBLIC
/ 
/about
/privacy
/security
/faq
```

and:

```text
PRIVATE
/pay/...
/admin/...
```

But the security model must treat them differently.

Do not assume that hiding a route makes it private.

---

# 25. PAYMENT MIGRATION

The existing Akọ app currently contains payment UI.

Claude must:

1. locate it
2. understand it
3. identify its backend contracts
4. identify its dependencies
5. move the appropriate UI to the new website repository
6. preserve payment correctness
7. preserve server-side authorization
8. preserve existing payment infrastructure where it is already stronger
9. remove the duplicate UI from the old repository where appropriate
10. update app routing to redirect users to the website payment flow

Do NOT rebuild the payment system simply because the UI is moving.

---

# 26. PAYMENT PRINCIPLE

The website is the payment surface.

The backend remains the source of truth.

The browser must never become the authority for:

- amount
- wallet balance
- purchase state
- transaction state
- payment success
- payment ownership
- Project access
- commission
- payout
- refund

The server determines these.

---

# 27. WHY PAYMENT LIVES ON THE WEBSITE

Product architecture:

```text
User is inside Akọ
        ↓
User chooses something that requires payment
        ↓
Akọ opens website payment page
        ↓
User completes payment
        ↓
Backend verifies payment
        ↓
Website shows confirmed result
        ↓
User returns to Akọ app
        ↓
App reads authoritative backend state
        ↓
Access/value is available
```

The payment website should feel like a seamless continuation of Akọ.

It must NOT feel like:

> "You have been thrown into another random website."

---

# 28. PAYMENT URL DESIGN

Use clean, non-sensitive routes.

For example:

```text
/pay/project/...
/pay/gift/...
/pay/...
```

Do not put:

- card details
- secrets
- access tokens
- private payment information
- raw payment provider credentials

in URLs.

Use short-lived server-controlled checkout/session identifiers where appropriate.

---

# 29. PAYMENT SESSION

Where the provider supports it, create a server-authoritative payment session.

Flow:

```text
Akọ app
  ↓
request payment
  ↓
backend validates product
  ↓
backend creates payment session
  ↓
website receives safe session reference
  ↓
payment UI
  ↓
provider payment
  ↓
verified webhook
  ↓
backend updates transaction
  ↓
website polls/receives safe state
  ↓
redirect to app
```

Do not trust:

```text
?success=true
```

as proof of payment.

---

# 30. PAYMENT SUCCESS

The browser returning from a payment provider does NOT necessarily mean payment succeeded.

The backend must verify the provider result/webhook.

Correct:

```text
Provider webhook
        ↓
Server verification
        ↓
Transaction state update
        ↓
Payment confirmed
```

Then the website can display success.

---

# 31. PAYMENT FAILURE

Design clear states:

- payment pending
- payment successful
- payment failed
- payment cancelled
- payment expired
- payment requires retry
- provider unavailable
- transaction under verification

Do not show a permanent generic spinner.

---

# 32. PAYMENT REFRESH

Refreshing the payment result page must not:

- duplicate purchases
- duplicate gifts
- duplicate wallet credits
- duplicate Project access

Use idempotent backend transactions.

---

# 33. PAYMENT BACK BUTTON

Handle:

- browser back
- app back
- payment provider back
- reload
- accidental close

without creating duplicate transactions.

---

# 34. PAYMENT RETURN TO APP

After confirmed payment:

Prefer returning users to the app using an appropriate deep link/universal link/app link when available.

Example conceptual flow:

```text
Website
  ↓
"Payment complete"
  ↓
"Return to Akọ"
  ↓
Akọ app opens
  ↓
App refreshes authoritative state
```

If the app is unavailable:

```text
Open Akọ
```

can fall back to the appropriate store/web destination.

Do not assume every platform will open the native app automatically.

---

# 35. DEEP LINK SECURITY

Do not put sensitive payment information inside deep links.

The app should retrieve authoritative transaction state from the backend after returning.

Use:

- opaque references
- short-lived state where needed
- server verification
- state matching

to prevent redirect manipulation.

---

# 36. PAYMENT TYPES

Claude must inspect the existing payment system and enumerate every payment flow.

Potential examples:

- Project purchase
- Event ticket
- Course
- Room
- Gift purchase
- wallet funding
- affiliate-related purchase
- other paid features

Do not assume the payment page only supports Projects.

---

# 37. PAYMENT UI DESIGN

Payment pages should feel like Akọ.

They should be:

- soft
- calm
- trustworthy
- minimal
- clear
- fast

Avoid:

- clutter
- excessive marketing
- unnecessary navigation
- distracting animation
- ambiguous totals

A user paying should immediately understand:

1. what they are buying
2. who/what they are paying
3. amount
4. payment method
5. what happens after payment

---

# 38. PAYMENT TRUST

Include appropriate reassurance without overloading the page.

Examples:

- secure payment
- clear total
- clear merchant/product identity
- support/help link
- cancellation/refund information where applicable

Do not make unsupported security claims.

---

# 39. PAYMENT CURRENCY

Inspect the existing payment architecture.

Do not introduce a new currency model during migration.

Preserve:

- currency
- amount precision
- provider conventions
- fees
- tax handling if present
- wallet logic
- transaction ledger
- refund handling

The website is a new frontend surface, not a new financial system.

---

# 40. PAYMENT SECURITY

The website must NOT:

- trust client-provided price
- trust client-provided recipient
- trust client-provided Project ownership
- trust client-provided wallet amount
- mark payment successful from frontend state
- expose provider secret keys
- expose Supabase service-role keys
- bypass RLS
- call privileged endpoints without authorization

---

# 41. PAYMENT WEBHOOKS

Preserve the existing webhook architecture where sound.

Audit:

- signature verification
- idempotency
- duplicate webhooks
- delayed webhooks
- failed webhooks
- refunds
- chargebacks
- provider retries
- transaction reconciliation

Do not move webhook secrets into the website's public frontend.

---

# 42. WEBSITE ENVIRONMENT VARIABLES

Separate:

```text
PUBLIC_*
```

from server-only secrets.

Never expose:

- payment secret keys
- service-role keys
- webhook secrets
- private API keys

to the browser.

Audit the existing environment variables during migration.

---

# 43. ADMIN MIGRATION

The existing Akọ Admin pages should move into the new website repository.

Claude must:

1. locate every Admin route
2. locate every Admin page
3. locate every Admin component
4. locate Admin navigation
5. locate Admin hooks
6. locate Admin API calls
7. locate Admin database functions
8. locate Admin-specific types
9. locate Admin permissions
10. locate Admin RLS
11. locate Admin analytics
12. locate Admin audit logs
13. locate Admin controls
14. locate Admin payment/promotion controls
15. locate Admin payout controls
16. locate Give Back controls
17. locate moderation controls
18. locate feature flags
19. locate kill switches
20. migrate without weakening authorization

---

# 44. ADMIN IS NOT A PUBLIC WEBSITE FEATURE

Admin lives in the same repository because the website is becoming the operational/trust frontend, but Admin remains a private application.

Do not:

- expose Admin navigation publicly
- render Admin data before authentication
- rely on client-side role checks
- put Admin APIs behind obscurity
- index Admin pages

---

# 45. ADMIN AUTHORIZATION

Server-side authorization remains mandatory.

A client-side:

```text
if (isAdmin) showAdmin()
```

is UX.

It is NOT security.

Every privileged operation must remain server-authorized.

---

# 46. ADMIN ROLE AUDIT

Inspect the existing Admin roles.

Preserve the strongest existing architecture.

Document:

- role
- capability
- permission
- endpoint
- database policy

Do not create a new role system just because Admin moved repositories.

---

# 47. ADMIN ROUTING

Potential structure:

```text
/admin
/admin/dashboard
/admin/users
/admin/projects
/admin/promotions
/admin/payments
/admin/give-back
/admin/payouts
/admin/gifts
/admin/moderation
/admin/settings
```

These are examples only.

Use the existing Admin information architecture where it is already coherent.

Do not rename every page unnecessarily.

---

# 48. ADMIN UI UX

The Admin UI should be upgraded during migration only where beneficial.

It should be:

- clean
- fast
- dense enough for operations
- clear
- keyboard-friendly where appropriate
- responsive
- consistent
- auditable

Do not apply the soft marketing-site aesthetic so aggressively that operational Admin screens become inefficient.

Marketing website:

> soft and intimate

Admin:

> clear and operational

Both can share design tokens without having the same visual density.

---

# 49. ADMIN FINANCIAL CONTROLS

Audit Admin pages that control:

- Give Back
- payout settings
- minimum withdrawal
- withdrawal processing
- payment configuration
- gift values
- promotions
- affiliate settings
- commissions
- wallet operations

Do not duplicate financial business logic in the website.

---

# 50. ADMIN AUDIT LOGGING

Privileged actions should remain auditable.

Examples:

- changing Give Back
- approving/rejecting promotion
- modifying payout controls
- changing gift configuration
- changing feature flags
- changing moderation controls

Preserve existing audit logging.

If missing, flag it.

Do not silently remove it during migration.

---

# 51. ADMIN KILL SWITCHES

Existing kill switches/configuration should remain server-authoritative.

Examples may include:

- Promotion ON/OFF
- gift-priority bridge
- payout controls
- feature flags
- comment deletion controls
- other operational settings

Moving the UI must not alter their security model.

---

# 52. SHARED BACKEND CONTRACT

Both repositories may need access to:

- Supabase
- database
- storage
- edge functions
- payment APIs

But access should be explicit.

Document:

```text
Website → backend resources
App → backend resources
Admin → privileged backend resources
```

Do not give the public website unnecessary privileges merely because Admin exists in the same repository.

---

# 53. FRONTEND SECRETS

Remember:

A website's browser code is public.

Anything shipped to the browser should be treated as public.

Therefore:

```text
PUBLIC_SUPABASE_ANON_KEY
```

may be client-visible where appropriate under Supabase's architecture.

But:

```text
SUPABASE_SERVICE_ROLE_KEY
PAYMENT_SECRET
WEBHOOK_SECRET
```

must remain server-side.

Audit every environment variable.

---

# 54. ADMIN AND SERVER COMPONENTS

If the chosen website framework supports server-side rendering/server actions/server routes, use them where they materially improve:

- security
- SEO
- performance
- server-only secret handling

But do not move business logic casually.

Preserve the backend as the authority.

---

# 55. DATABASE CONNECTION

The website should connect to the existing backend/data model.

Do NOT create a second database simply because the frontend is now a different repository.

Unless a future architecture decision explicitly requires it:

```text
Akọ app ───────┐
               ├── existing backend/data
Akọ website ───┤
               └── Admin
```

---

# 56. DATA OWNERSHIP

The website must not create competing copies of:

- users
- wallets
- transactions
- Projects
- purchases
- gifts
- promotions
- payouts

The backend remains the canonical source.

---

# 57. AUTHENTICATION

Public marketing pages should require no login.

Payment pages may require:

- an authenticated session
- a secure checkout session
- appropriate account identification

Admin requires strong authentication and authorization.

Do not force users to create a second "website account."

A user has an Akọ account.

---

# 58. AUTH SESSION TRANSITION

If the user starts in the Akọ app and is pushed to the website:

```text
Akọ app
 ↓
authenticated payment initiation
 ↓
website payment surface
```

The website must safely determine who is paying.

Do not put raw credentials into the URL.

Do not put access tokens into analytics.

Use an appropriate secure authentication/session architecture.

Claude must inspect the current auth implementation before deciding the migration mechanism.

---

# 59. CROSS-DOMAIN AUTH

If the app and website use different domains:

Claude must explicitly audit:

- cookie scope
- SameSite
- Secure
- HTTPS
- CORS
- redirect URLs
- OAuth callback URLs
- Supabase auth configuration
- deep links
- logout behavior
- session expiry

Do not assume browser sessions automatically cross domains.

---

# 60. PAYMENT AUTH HANDOFF

If a user is already signed in inside the app, the payment journey should minimize unnecessary friction.

But security comes first.

Do not create a giant:

```text
?token=...
```

URL just to make payment convenient.

---

# 61. WEBSITE PERFORMANCE

The marketing site should feel extremely light.

Target:

- fast first paint
- fast mobile load
- optimized images
- lazy loading
- responsive images
- minimal JavaScript where possible
- limited third-party scripts
- efficient fonts
- optimized 3D
- no unnecessary client-side rendering

The user specifically wants the site to feel:

> soft and cool

"Soft" should never mean slow.

---

# 62. 3D PERFORMANCE

If using 3D:

- prefer optimized assets
- lazy-load where appropriate
- provide a fallback image
- respect reduced-motion preferences
- avoid massive models
- avoid blocking page interaction
- test low-end Android devices

A beautiful homepage that takes forever to load has failed.

---

# 63. AI-GENERATED IMAGES

The user plans to generate website images using AI.

Claude should build the site so imagery can be swapped easily.

Use:

- image components
- centralized asset paths
- consistent aspect ratios
- responsive image loading
- meaningful alt text

Do not hard-wire giant image assets into components.

---

# 64. IMAGE ART DIRECTION

Images should support the story.

Possible image categories:

- people reasoning/talking
- someone creating
- people learning
- intimate conversation
- Projects being built
- books/courses
- cultural objects
- subtle Nigerian environments
- phones using Akọ
- quiet everyday moments

Avoid making every section a generic "person staring at laptop" stock image.

---

# 65. CULTURAL IMAGERY

Use Akọ's cultural visual language subtly.

Possible visual references:

- cowries
- beads
- artifacts
- patterns
- Nigerian environments
- intellectual/cultural objects

Do not turn every section into a museum.

The website should feel modern first and culturally grounded second.

---

# 66. ABOUT PAGE

The About page should explain:

- what Akọ means
- why Akọ exists
- the problem it is solving
- what makes it different
- the philosophy behind it
- what Akọ hopes to become

The user explicitly does not want the brand reduced to a geographic label.

Do not repeatedly describe Akọ as:

> "an African social network"

unless that language is deliberately chosen later.

The origin can be acknowledged without shrinking the ambition.

---

# 67. PHILOSOPHY

The website should communicate the central idea:

> **A reason to reason.**

Ideas are not just content.

They can become:

- discussions
- communities
- books
- courses
- rooms
- projects
- businesses
- relationships
- value

The website should explain this simply.

---

# 68. PRIVACY PAGE

The Privacy Policy should be a real legal document.

Do not write marketing copy and label it Privacy Policy.

It should eventually accurately describe:

- data collection
- account information
- public content
- private messaging
- E2EE
- metadata
- payments
- wallet
- gifts
- Projects
- analytics
- cookies
- third-party providers
- retention
- deletion
- user rights
- support
- security

The legal content should be reviewed appropriately before publication.

---

# 69. SECURITY PAGE

The future Security page should explain security at a human level.

Potential sections:

- account security
- private messaging
- end-to-end encryption
- payments
- wallet security
- data protection
- reporting
- device security

Do not publish technical claims that the actual implementation does not support.

---

# 70. E2EE WEBSITE PAGE

The E2EE messaging specification created separately for Akọ should feed into the future public Security/E2EE page.

The website should eventually be able to explain:

> Messages are encrypted on the devices participating in the conversation, so Akọ does not ordinarily possess the keys required to read private messages.

Only publish this after the E2EE implementation is verified.

---

# 71. FAQ

FAQ should answer real questions.

Examples:

- What is Akọ?
- What does Akọ mean?
- How do I join?
- Is Akọ free?
- What can I create?
- What are Projects?
- Can I earn money?
- How does gifting work?
- What is a Wallet?
- How do payouts work?
- Are private messages encrypted?
- Can Akọ read my messages?
- How do I download Akọ?
- How do I contact support?

Do not create fake FAQ questions solely for SEO.

---

# 72. HELP

Help should eventually become a useful support surface.

Potential topics:

- account
- login
- payments
- Projects
- wallet
- gifts
- payouts
- messaging
- privacy
- reporting

Do not make Help merely another marketing page.

---

# 73. TERMS

Terms should be a proper legal document.

Do not improvise legal obligations casually.

The website architecture should allow Terms to be updated/versioned cleanly.

---

# 74. CONTACT

Provide an appropriate contact/support path.

Do not expose private admin emails or internal credentials.

Use the actual support infrastructure chosen for Akọ.

---

# 75. FOOTER

The footer should be useful but restrained.

Potential groups:

```text
Akọ
About
Security
FAQ
Help

Legal
Privacy
Terms

Get Akọ
Android
iOS
```

Social links can be added later if official accounts exist.

---

# 76. WEBSITE 404

Create a warm Akọ-native 404.

Not:

> Error 404.

Something more human.

Example concept:

> **This thought wandered off.**

Then:

> Take me home

Do not make the joke obscure the navigation.

---

# 77. ERROR STATES

Payment errors and operational errors must remain clear.

Marketing pages should have graceful fallback behavior.

Admin errors should be operationally informative without leaking secrets.

---

# 78. ACCESSIBILITY

Audit:

- keyboard navigation
- screen readers
- focus states
- contrast
- semantic headings
- alt text
- form labels
- reduced motion
- touch targets
- error messaging

Do not sacrifice accessibility for the nostalgic aesthetic.

---

# 79. MOTION

Motion should communicate:

- transition
- depth
- arrival
- interaction
- storytelling

Avoid:

- constant floating
- endless parallax
- scroll hijacking
- excessive blur
- unnecessary loaders

The WhatsApp reference is useful because it feels alive without feeling like a demo of animation technology.

---

# 80. TYPOGRAPHY

Typography should feel:

- confident
- human
- modern
- readable

Use a restrained hierarchy.

Do not use ten font sizes simply because responsive design permits it.

---

# 81. COLOR

Preserve Akọ's green/orange identity.

Use color intentionally:

- green → identity/action/positive emphasis
- orange → warmth/highlight
- neutral surfaces → calm
- dark sections → contrast where appropriate

Do not turn every component green and orange.

---

# 82. SOFTNESS

"Soft" should mean:

- comfortable spacing
- gentle surfaces
- calm transitions
- rounded but not childish geometry
- restrained shadows
- readable typography
- generous breathing room

It should NOT mean:

- everything is pastel
- everything is rounded
- weak contrast
- low information density
- excessive blur

---

# 83. SEO + DESIGN BALANCE

Do not create giant blocks of text just to rank.

Good SEO can coexist with excellent design.

Use:

- meaningful headings
- concise sections
- supporting copy
- expandable details
- internal links
- real useful content

The website should be enjoyable before it is optimized.

---

# 84. OPEN GRAPH / SHARING

Every important public page should have appropriate:

- title
- description
- social image
- canonical URL

When someone shares:

```text
ako website
```

the preview should feel intentional.

---

# 85. FAVICON / APP ICON

Use the official Akọ brand assets.

Provide appropriate:

- favicon
- mobile icon
- Open Graph image
- social image
- manifest where appropriate

Do not create a second logo.

---

# 86. PWA CONSIDERATION

Do not automatically turn the marketing site into a PWA just because the web platform supports it.

The actual native app is the primary product.

If a PWA is useful later, evaluate it separately.

---

# 87. APP STORE SMART ROUTING

The Download page can eventually detect platform.

For example:

```text
Android → Google Play
iPhone → App Store
Desktop → choose platform
```

But keep explicit buttons visible.

Do not hide the destination behind automatic detection.

---

# 88. WEBSITE ANALYTICS

Analytics may be appropriate on public marketing pages.

Audit privacy carefully.

Do not send private payment data or Admin information into marketing analytics.

Payment pages should have separate analytics consideration.

Admin should not be included in public marketing analytics.

---

# 89. THIRD-PARTY MARKETING SCRIPTS

Minimize them.

Every third-party script adds:

- performance cost
- privacy implications
- security surface

Do not install five analytics products because they are easy.

---

# 90. COOKIES

If cookies are used:

- understand what they do
- document them
- implement appropriate consent behavior where legally required
- avoid unnecessary tracking

Do not let marketing scripts silently track Admin/payment pages.

---

# 91. PUBLIC WEBSITE SECURITY

Audit:

- XSS
- CSRF
- open redirects
- clickjacking
- CSP
- CORS
- secure headers
- authentication
- session handling
- secret exposure
- dependency vulnerabilities
- injection
- URL handling
- payment redirects

---

# 92. CONTENT SECURITY POLICY

Where practical, implement a strong CSP appropriate to:

- 3D assets
- images
- payment provider
- Supabase
- analytics
- fonts

Do not blindly copy a CSP that breaks the site.

Test it.

---

# 93. OPEN REDIRECT PROTECTION

The website will have redirects to:

- App Store
- Google Play
- Akọ app
- payment provider
- app deep links

Do not allow arbitrary:

```text
?redirect=https://evil.example
```

behavior.

Allowlist legitimate destinations.

---

# 94. PAYMENT REDIRECT PROTECTION

Payment return URLs must be validated.

Do not allow an attacker to use Akọ's trusted domain to redirect users to arbitrary phishing pages.

---

# 95. ADMIN REDIRECT PROTECTION

After Admin login, only allow safe internal destinations.

Do not trust a raw `next=` parameter.

---

# 96. DEPLOYMENT

Claude should define:

```text
Production
Staging
Local development
```

and ensure:

- production does not point to test payment providers
- staging cannot accidentally charge real users
- Admin test controls are not exposed publicly
- secrets are environment-specific

---

# 97. DOMAIN ARCHITECTURE

The exact domains are to be decided by the user.

Possible conceptual model:

```text
www.ako...
    → public website

app.ako...
    → web app

admin.ako...
    → optional future separation
```

OR:

```text
ako...
    → public website
ako.../app
    → web app
ako.../admin
    → Admin
```

Claude should recommend the cleanest structure based on the actual deployment architecture.

Do not make a domain decision merely because it is fashionable.

---

# 98. ADMIN SUBDOMAIN OPTION

If technically and operationally useful, Admin can later move to:

```text
admin.ako...
```

without changing the repository.

Do not implement this merely for appearance.

The immediate requirement is:

> Admin lives in the new website repository.

---

# 99. SHARED DESIGN SYSTEM

The website and app should feel like the same product.

Where useful, share:

- brand tokens
- typography decisions
- icon principles
- spacing concepts
- color variables
- logo assets

But do not force the app and marketing site into the same component tree.

---

# 100. COMPONENT SHARING

If the repositories can safely share a package later, consider:

```text
@ako/design-system
```

for truly reusable primitives.

Do not create a complicated monorepo solely to share a button.

Start simple.

---

# 101. MIGRATION SAFETY

Before removing payment/Admin code from the old repository:

- confirm new implementation works
- confirm routes work
- confirm backend calls work
- confirm auth works
- confirm permissions work
- confirm payment flows work
- confirm webhooks work
- confirm redirects work
- confirm production environment variables
- confirm rollback plan

Do not delete working code first.

---

# 102. PAYMENT MIGRATION ACCEPTANCE

For every existing payment flow:

```text
Old flow
   ↓
New website flow
   ↓
Same backend transaction
   ↓
Same authoritative result
```

Compare behavior.

No regression should be accepted merely because the UI looks better.

---

# 103. ADMIN MIGRATION ACCEPTANCE

For every existing Admin function:

```text
Old Admin
   ↓
New Admin
   ↓
Same permission
   ↓
Same backend operation
   ↓
Same auditability
```

Test privileged and unauthorized users.

---

# 104. ADMIN DATA LEAK TEST

Log in as a normal user.

Attempt:

- direct Admin URL
- guessed Admin API
- Admin route with modified IDs
- Admin API with altered role claims
- browser DevTools manipulation

Expected:

> denied.

Do not rely on hiding the navigation.

---

# 105. PAYMENT DATA LEAK TEST

Inspect browser/network/logs for:

- card information
- provider secrets
- service keys
- private tokens
- internal transaction secrets

Nothing sensitive should appear unnecessarily.

---

# 106. SEO SECURITY

Do not allow:

- Admin pages
- private payment states
- authenticated user data
- private transaction details

to become indexed.

Test Google-style crawling against staging before production.

---

# 107. SITEMAP CONTENT

Sitemap should contain only intentional public pages.

Example:

```text
/
 /about
 /security
 /privacy
 /terms
 /faq
 /help
 /download
```

Not:

```text
/admin
/pay
/account
/private
```

unless there is a deliberate public SEO reason.

---

# 108. CANONICAL URL TEST

Every public page should have one intended canonical URL.

Avoid duplicate indexing from:

```text
/page
/page/
/page?source=x
```

where applicable.

---

# 109. PERFORMANCE BUDGET

Set a practical performance budget.

Audit:

- JavaScript
- CSS
- fonts
- images
- 3D
- third-party scripts

The homepage should remain fast on realistic Nigerian mobile networks and lower-end devices.

Do not optimize only on fast developer Wi-Fi.

---

# 110. IMAGE OPTIMIZATION

Use:

- WebP/AVIF where appropriate
- responsive sizing
- lazy loading
- priority loading only for hero assets
- appropriate compression

Do not upload a 12 MB AI image to display at 300 px.

---

# 111. 3D FALLBACK

If the 3D phone cannot load:

Show:

- high-quality static phone image

rather than:

- blank space
- broken canvas
- spinner forever

---

# 112. OFFLINE / NETWORK FAILURE

Marketing pages should fail gracefully.

Payment pages need stronger state handling.

Admin needs actionable retry behavior.

---

# 113. MOBILE PAYMENT

Test the payment flow on:

- Android Chrome
- iPhone Safari
- slow network
- interrupted connection
- browser back
- provider redirect
- app return

This is a financial flow.

Treat it as high priority.

---

# 114. DEEP LINK TESTING

Test:

```text
App → website → payment → app
```

on:

- Android
- iOS
- app installed
- app not installed
- logged in
- logged out
- expired session
- cancelled payment
- successful payment

---

# 115. USER JOURNEY: FIRST-TIME VISITOR

Test:

```text
Search engine
 ↓
Homepage
 ↓
Understand Akọ
 ↓
Explore
 ↓
About / FAQ
 ↓
Download
 ↓
Store
```

The visitor should never wonder:

> "What is this site?"

---

# 116. USER JOURNEY: EXISTING USER PAYMENT

Test:

```text
Akọ
 ↓
User chooses paid thing
 ↓
Website payment page
 ↓
Review
 ↓
Pay
 ↓
Verified success
 ↓
Return to Akọ
 ↓
Paid access/value visible
```

---

# 117. USER JOURNEY: PAYMENT FAILURE

Test:

```text
Akọ
 ↓
Website
 ↓
Payment
 ↓
Failure
 ↓
Clear explanation
 ↓
Retry
```

No duplicate purchase.

---

# 118. USER JOURNEY: ADMIN

Test:

```text
Admin login
 ↓
Dashboard
 ↓
Operational page
 ↓
Change setting
 ↓
Server authorization
 ↓
Audit log
 ↓
Updated state
```

Test with unauthorized accounts too.

---

# 119. USER JOURNEY: SEARCH ENGINE

Test:

```text
Google/Bing/etc.
 ↓
Akọ page
 ↓
Page title
 ↓
Snippet
 ↓
Open
 ↓
Fast load
 ↓
Useful content
```

---

# 120. WEBSITE CONTENT MANAGEMENT

For V1, do not build an elaborate CMS unless needed.

If legal/help content will change frequently, choose the simplest maintainable architecture.

Potential options:

- Markdown/content files
- structured local content
- existing backend content
- future CMS

Do not add a CMS merely because marketing websites sometimes have one.

---

# 121. LEGAL VERSIONING

Privacy Policy and Terms should support:

- effective date
- version
- last updated date

Do not silently overwrite legal history if the business requires version retention.

---

# 122. SECURITY PAGE VERSIONING

Security documentation should be kept synchronized with actual implementation.

If E2EE changes:

- update technical docs
- update public claims
- update privacy/security pages

Do not let marketing copy become more secure than the actual system.

---

# 123. FAQ / SEO DUPLICATION

Avoid duplicating the same paragraph across:

- homepage
- About
- FAQ
- Security

Each page should have a distinct purpose.

---

# 124. MARKETING COPY

Copy should be:

- confident
- concise
- human
- intelligent
- Nigerian in voice where natural
- globally understandable
- not corporate

Avoid:

> "Revolutionizing the digital ecosystem through next-generation social infrastructure."

Prefer:

> "A place for ideas to meet people."

or another Akọ-native line.

Claude should generate alternatives and select based on actual design.

---

# 125. DO NOT OVEREXPLAIN AKỌ

The site should reveal the product gradually.

First:

> What is this?

Then:

> Why is it interesting?

Then:

> What can I do?

Then:

> Why should I trust it?

Then:

> Get the app.

Do not put the entire product specification above the fold.

---

# 126. VISUAL STORYTELLING

Use images to explain concepts.

For example:

```text
Idea
 ↓
Conversation
 ↓
People
 ↓
Project
 ↓
Participation
```

A sequence of AI-generated images can visually tell this story.

Images should not merely decorate empty space.

---

# 127. NOSTALGIC PRODUCT MOMENTS

Potential sections can feel like memories:

- someone writing an idea
- friends discussing something
- a person discovering a useful person
- a small group learning
- someone creating a Project
- a person receiving a gift
- a person returning to something they bought

Keep them human.

---

# 128. WEBSITE DOES NOT NEED TO SHOW EVERYTHING

Do not explain every feature.

The app itself can reveal depth.

The website's job is to create:

> curiosity + understanding + trust + action.

---

# 129. PUBLIC VS APP SEO

Do not try to index private app pages.

The public website should carry SEO.

The app can focus on authenticated product experience.

This separation is healthy.

---

# 130. SEARCH ENGINE DISCOVERABILITY OF APP CONTENT

If future public creator/Project pages become indexable, design them deliberately.

Do not accidentally expose private Projects, private profiles, private chats or paid content.

Public content requires explicit visibility rules.

---

# 131. PAYMENT SEO

Payment pages are transactional, not marketing content.

Do not optimize them for search.

Do not expose transaction parameters.

Do not let search engines crawl user-specific payment states.

---

# 132. ADMIN SEO

Admin is operational.

Never treat Admin as SEO content.

---

# 133. SECURITY BOUNDARY SUMMARY

```text
PUBLIC WEBSITE
    ↓
Public information

PAYMENT
    ↓
Authenticated / secure transaction flow

ADMIN
    ↓
Privileged authenticated flow

BACKEND
    ↓
Source of truth

APP
    ↓
Product experience
```

Each layer has a different trust level.

---

# 134. MIGRATION DOCUMENTATION

Claude should create:

`AKO_WEBSITE_MIGRATION_MAP.md`

containing:

- old route
- new route
- old component
- new component
- old dependency
- new dependency
- backend dependency
- environment variable
- auth requirement
- migration status
- regression status

This becomes the migration record.

---

# 135. PAYMENT MIGRATION REPORT

Create:

`AKO_PAYMENT_UI_MIGRATION_REPORT.md`

Include:

- existing payment flows
- moved components
- moved routes
- retained backend functions
- changed code
- environment variables
- auth flow
- provider flow
- webhook flow
- redirect flow
- tests
- known limitations

---

# 136. ADMIN MIGRATION REPORT

Create:

`AKO_ADMIN_MIGRATION_REPORT.md`

Include:

- Admin routes
- pages
- components
- backend functions
- permissions
- RLS
- roles
- audit logs
- environment variables
- migrated functionality
- removed duplicates
- tests
- known limitations

---

# 137. PUBLIC WEBSITE QA

Claude must test:

### Content

- [ ] Home
- [ ] About
- [ ] FAQ
- [ ] Privacy
- [ ] Terms
- [ ] Security
- [ ] Help
- [ ] Download

### Navigation

- [ ] Header
- [ ] Footer
- [ ] Mobile menu
- [ ] Internal links
- [ ] External links
- [ ] App links

### SEO

- [ ] titles
- [ ] descriptions
- [ ] canonical
- [ ] sitemap
- [ ] robots
- [ ] Open Graph
- [ ] structured data where useful
- [ ] noindex private routes

### Performance

- [ ] mobile
- [ ] desktop
- [ ] slow network
- [ ] image optimization
- [ ] 3D fallback

---

# 138. PAYMENT QA

- [ ] Every existing payment type identified
- [ ] Every payment route migrated
- [ ] Price server-authoritative
- [ ] Payment session server-created
- [ ] Provider verification intact
- [ ] Webhooks intact
- [ ] Idempotency intact
- [ ] Refund handling intact
- [ ] Failure states
- [ ] Pending states
- [ ] Success states
- [ ] Retry states
- [ ] App return
- [ ] Deep links
- [ ] Mobile
- [ ] Duplicate transaction test
- [ ] Unauthorized transaction test

---

# 139. ADMIN QA

- [ ] Admin login
- [ ] Admin logout
- [ ] Unauthorized access denied
- [ ] Every Admin page reachable
- [ ] Every existing Admin function preserved
- [ ] RLS preserved
- [ ] Server authorization preserved
- [ ] Audit logs preserved
- [ ] Financial controls preserved
- [ ] Promotion controls preserved
- [ ] Give Back controls preserved
- [ ] Payout controls preserved
- [ ] Moderation controls preserved
- [ ] Kill switches preserved

---

# 140. CROSS-REPOSITORY QA

Claude must test:

```text
App → Website
Website → Backend
Website → App
Admin → Backend
Payment → Backend
Backend → App state
```

The fact that two repositories compile independently does not mean the system works.

---

# 141. NO DUPLICATE BUSINESS LOGIC

If the old repository contains:

```text
calculatePurchase()
```

and the new website creates:

```text
calculatePurchaseAgain()
```

this should be treated as a warning.

Financial/business rules belong in the authoritative backend layer where possible.

The website should consume them.

---

# 142. SHARED TYPES

If shared types are necessary:

- centralize where practical
- version deliberately
- avoid copy-paste drift

But do not build an enormous shared package unnecessarily.

---

# 143. API CONTRACTS

Document website/backend contracts for:

- payment
- Project purchase
- wallet
- gifts
- Admin
- authentication

The website must know what it is allowed to ask the backend to do.

---

# 144. AUTHORIZED WEBSITE ACTIONS

Public pages:

```text
read public content
```

Authenticated payment:

```text
create/continue authorized transaction
```

Admin:

```text
privileged operations
```

Never expose Admin operations through public client bundles merely because the route is hidden.

---

# 145. CACHE SAFETY

Do not cache personalized payment/admin responses publicly.

Use appropriate cache-control behavior.

Never let:

```text
User A payment state
```

be served to:

```text
User B
```

through an incorrectly cached response.

---

# 146. SSR SAFETY

If server-side rendering is used:

Audit:

- cookies
- authorization
- caching
- server-side data fetching
- personalized responses

Do not accidentally cache authenticated HTML globally.

---

# 147. STATIC GENERATION

Public pages can be statically generated where appropriate.

Good candidates:

- About
- FAQ
- Security
- Privacy
- Terms

Dynamic:

- payment
- Admin
- personalized content

Use the right rendering model for each.

---

# 148. DEPLOYMENT PREVIEW SAFETY

Preview deployments must not:

- connect to production payments accidentally
- expose production Admin
- index staging pages
- leak production secrets

Use environment-specific configuration.

---

# 149. STAGING

Create a safe staging environment.

Use:

- test payment provider
- test accounts
- test Admin roles
- test database/data where appropriate

Never use real financial transactions for testing.

---

# 150. ROLLBACK PLAN

Before migration:

- tag/commit old working state
- document deployment
- document environment
- document routes

If migration fails:

```text
rollback website
restore old payment route
restore old Admin route
```

without corrupting financial state.

---

# 151. FINANCIAL MIGRATION RULE

Do NOT migrate or rewrite financial ledger logic simply because payment UI moved.

The payment UI can move while:

- wallet ledger
- transactions
- gifts
- payouts
- affiliate commissions
- Give Back

remain under the existing authoritative backend.

---

# 152. ADMIN FINANCIAL SAFETY

Admin migration must not introduce:

- client-controlled wallet adjustments
- client-controlled Give Back
- client-controlled payout approvals
- client-controlled gift values
- client-controlled promotion budgets

All financial mutations remain server-authoritative.

---

# 153. PAYMENT SUPPORT

If a payment fails, the website should provide a useful support path.

But do not expose:

- internal provider secrets
- full payment payloads
- private account data

to support tooling unnecessarily.

---

# 154. ACCESS AFTER PAYMENT

The website should not independently grant access based solely on:

```text
payment=success
```

Instead:

```text
verified transaction
       ↓
backend updates access
       ↓
app reads access
```

This is critical.

---

# 155. GIFT PAYMENT

If the website hosts gift payment:

```text
Akọ app
 ↓
Choose cultural gift
 ↓
Website payment
 ↓
Verified purchase
 ↓
Gift transaction
 ↓
Recipient wallet/gift state
 ↓
Return to app
```

Do not allow the browser to determine gift monetary value.

---

# 156. PROJECT PAYMENT

For Projects:

```text
Project selected
 ↓
Server validates Project
 ↓
Server determines price
 ↓
Website checkout
 ↓
Verified payment
 ↓
Backend grants access
 ↓
Return to Akọ
```

---

# 157. AFFILIATE PAYMENT

If affiliate attribution is already implemented:

Payment migration must preserve:

- affiliate fork
- attribution
- commission
- attribution window
- referral relationship
- fraud protection

The website must not accidentally break affiliate attribution.

---

# 158. PROMOTION PAYMENT

If promotion has a paid budget:

The website payment surface must preserve:

- promotion identity
- budget
- duration
- targeting
- review state
- admin approval
- payment state

The user must not be able to alter reviewed settings through frontend manipulation.

---

# 159. WALLET FUNDING

If wallet funding exists:

The website must preserve:

- exact amount
- currency
- provider transaction
- ledger entry
- idempotency
- reconciliation

Never display a wallet balance based solely on the browser.

---

# 160. USER EXPERIENCE AFTER PAYMENT

Success should feel satisfying but restrained.

Example:

> **You're in.**

Then:

> Your payment was successful.

Then:

> **Return to Akọ**

The exact copy should fit the purchased thing.

Avoid giant confetti unless the product actually calls for it.

---

# 161. PAYMENT SUCCESS DEEP LINK

Where supported:

```text
Payment complete
        ↓
Opening Akọ…
        ↓
Native app
```

Provide a fallback:

> Open Akọ

if automatic app opening fails.

---

# 162. WEBSITE HOME CTA

The main CTA should remain:

> **Get Akọ**

or equivalent.

Payment should not dominate the marketing website.

---

# 163. TRUST LAYER

The website becomes the place users can independently visit to answer:

> Who is Akọ?

> What does Akọ stand for?

> Is Akọ secure?

> What happens to my data?

> How do payments work?

> How do I get help?

That is why the public website matters.

---

# 164. WEBSITE + E2EE TRUST CONNECTION

The future Security page can connect:

```text
Chat UI
"Learn more"
      ↓
Akọ website
      ↓
Security
      ↓
End-to-end encryption
```

This creates a coherent trust experience.

---

# 165. WEBSITE + PAYMENT TRUST CONNECTION

Likewise:

```text
Payment
 ↓
Website
 ↓
secure checkout
 ↓
legal/help/privacy
```

The user can remain on an Akọ-controlled experience rather than being pushed into unexplained internal screens.

---

# 166. FOOTER LEGAL CONNECTION

The payment page should provide appropriate links to:

- Terms
- Privacy
- Help

without cluttering the checkout.

---

# 167. WEBSITE DESIGN SYSTEM AUDIT

Claude should inspect the existing Akọ web app's design system and extract:

- spacing
- typography
- buttons
- cards
- colors
- iconography
- inputs
- modals
- responsive behavior

Then decide what belongs in the public site.

Do not blindly copy app components.

---

# 168. MARKETING WEBSITE COMPONENTS

Potential components:

- Header
- Mobile navigation
- Hero
- Phone mockup
- Download buttons
- Story sections
- Feature showcase
- Image narrative
- Quote/testimonial section if real
- FAQ
- Footer
- Legal layout
- Security layout
- Payment shell
- Admin shell

Use only what the design requires.

---

# 169. TESTIMONIALS

Do not invent testimonials.

If real early-user reactions are later used:

- obtain appropriate permission
- accurately represent them
- do not fabricate quotes

---

# 170. SOCIAL PROOF

Do not fake:

- user counts
- downloads
- revenue
- creator counts
- testimonials
- press mentions

Trust is more important than artificial credibility.

---

# 171. SEO STRUCTURED DATA

Where appropriate, consider:

- Organization
- WebSite
- SoftwareApplication
- FAQPage where eligible and genuinely represented

Do not add structured data simply to manipulate search results.

---

# 172. SEARCH CONSOLE READINESS

Prepare:

- sitemap
- canonical URLs
- robots
- metadata
- clean status codes

The user can connect the final domain to search-engine webmaster tools later.

---

# 173. WEBMASTER FUTURE

The user specifically intends the public Akọ website to become the place for:

- FAQ
- Privacy Policy
- Terms
- Security
- public documentation
- trust information

Architect accordingly.

Do not create temporary one-off pages that make the future information architecture difficult.

---

# 174. PUBLIC WEBSITE URL STRATEGY

Use stable, human-readable URLs.

Prefer:

```text
/security
/privacy
/terms
/faq
/about
/help
```

over:

```text
/page?id=392
```

---

# 175. LEGAL URL STABILITY

Legal URLs should be stable.

Do not change:

```text
/privacy
```

every time the policy changes.

Version internally.

---

# 176. WEBSITE INTERNATIONALIZATION

Do not build a huge localization system unless required.

But avoid hard-coding copy in ways that make future localization impossible.

Akọ can start with English.

---

# 177. AFRICAN/NIGERIAN CULTURAL LANGUAGE

Use cultural language intentionally.

Do not make the site sound like a translated Silicon Valley product.

But also do not make every sentence slang.

The tone should feel naturally Akọ.

---

# 178. IMAGE ALT TEXT

Alt text should describe meaningful visual content.

Do not use:

> "AI image 4."

Use descriptive alternatives where appropriate.

Decorative imagery can be marked decorative.

---

# 179. MOTION ACCESSIBILITY

Respect:

```text
prefers-reduced-motion
```

3D phone movement should have a reduced-motion fallback.

---

# 180. FORM ACCESSIBILITY

Payment forms and support forms must have:

- labels
- clear validation
- focus states
- error explanations
- keyboard access

---

# 181. ADMIN ACCESSIBILITY

Admin should support:

- keyboard navigation
- visible focus
- readable tables
- clear statuses
- responsive behavior

---

# 182. SECURITY HEADERS

Audit appropriate headers such as:

- Content-Security-Policy
- X-Content-Type-Options
- Referrer-Policy
- frame protections
- Strict-Transport-Security

Use the deployment framework/platform's correct mechanisms.

---

# 183. DEPENDENCY AUDIT

Before launch:

- scan dependencies
- remove unused packages
- update vulnerable packages
- inspect 3D dependencies
- inspect payment dependencies
- inspect auth dependencies
- inspect Admin dependencies

Do not add unnecessary packages.

---

# 184. PUBLIC WEBSITE SOURCE

Remember:

The frontend bundle is inspectable.

Do not assume:

> "Users won't see this because it is on the website."

Anything client-shipped can be inspected.

---

# 185. ADMIN BUNDLE

If possible, avoid shipping the entire Admin application to ordinary public users unnecessarily.

Use appropriate code splitting/lazy loading.

But security must remain server-side regardless.

---

# 186. PAYMENT BUNDLE

Likewise, payment code can be code-split where useful.

Do not ship unnecessary payment provider logic on every marketing page.

---

# 187. MARKETING BUNDLE

The homepage should not load:

- Admin code
- wallet code
- full chat code
- full Project management code
- unnecessary payment code

Keep public pages lean.

---

# 188. ROUTE-LEVEL CODE SPLITTING

Recommended conceptual separation:

```text
marketing bundle
legal bundle
payment bundle
admin bundle
```

Use the framework's best practice.

---

# 189. SECURITY OF ROUTE DISCOVERY

Code splitting does not hide secrets.

Do not put privileged data in Admin bundles merely because the route is protected.

---

# 190. BACKEND API DISCOVERY

Public website visitors can inspect network requests.

Design APIs accordingly.

Never trust secrecy of API endpoint names.

---

# 191. PUBLIC API LIMITATION

Public marketing pages should use public/limited APIs only.

Do not connect homepage components directly to privileged Admin endpoints.

---

# 192. CONTENT CACHING

Public content can be cached aggressively where safe.

Personalized/payment/Admin content should not be publicly cached.

---

# 193. WEBSITE CONTACT FORMS

If a contact form exists:

- rate limit
- validate
- sanitize
- protect against spam
- avoid exposing email infrastructure
- do not allow arbitrary HTML injection

---

# 194. FAQ SEARCH

Do not build an elaborate search engine for FAQ unless needed.

Simple navigation/sections may be enough for V1.

---

# 195. LEGAL READING UX

Legal pages should remain readable.

Use:

- clear headings
- section navigation where useful
- effective date
- good line length
- mobile-friendly typography

Do not put legal text into tiny gray font.

---

# 196. SECURITY READING UX

Security pages can use progressive disclosure.

For ordinary users:

> simple explanation

For technical users:

> detailed architecture

This can later become the home for E2EE technical documentation.

---

# 197. PUBLIC WEBSITE NOTIFICATION

Do not expose private in-app notifications through the website.

Website notifications should be public/transactional only where required.

---

# 198. CHAT LINKING

If someone clicks a link to Akọ chat from the website:

Do not expose private chat content.

Instead:

- open app
- authenticate
- authorize
- then show conversation

---

# 199. PROJECT LINKING

Public Project links can eventually resolve to:

```text
website
 ↓
Project information
 ↓
Get the app / purchase
```

But private Project content must remain protected.

---

# 200. FUTURE PUBLIC PROJECT PAGES

If SEO-friendly Project pages are later introduced:

They must have explicit visibility.

Example:

```text
public Project
→ indexable

private Project
→ noindex / inaccessible
```

Do not accidentally expose paid content.

---

# 201. PUBLIC CREATOR PAGES

Same principle.

A public creator profile can eventually have a public SEO representation.

Private profiles must remain private.

---

# 202. WEBSITE AND SOCIAL SHARING

The website should have polished social previews.

Potentially:

```text
Akọ — A Reason to Reason
```

with a strong visual.

Do not use generic social preview images.

---

# 203. APP DOWNLOAD PAGE

The `/download` page can explain:

- Android
- iOS
- what users get
- official store links

This gives search engines and users a stable destination.

---

# 204. APP STORE LINKS SAFETY

Use only official store URLs.

Do not redirect users to third-party APK mirrors.

---

# 205. MARKETING WEBSITE RELEASE

Do not launch the website before:

- legal pages are reviewed
- payment flow is verified
- Admin access is secured
- SEO is configured
- app store links are correct
- privacy claims match implementation

---

# 206. PRE-LAUNCH CONTENT REVIEW

Check every sentence for:

- unsupported claims
- fake numbers
- exaggerated security
- inaccurate payment promises
- inaccurate E2EE claims
- misleading earning claims

Marketing must remain truthful.

---

# 207. PAYMENT COPY REVIEW

Avoid:

> "Guaranteed instant payment."

unless actually guaranteed.

Avoid:

> "Your purchase is complete."

until backend verification confirms it.

---

# 208. SECURITY COPY REVIEW

Avoid:

> "Nobody can ever see your data."

Prefer precise language.

Security copy must match the technical architecture.

---

# 209. ADMIN COPY REVIEW

Admin statuses must reflect actual backend state.

Do not display:

> Paid

before the backend confirms payment.

---

# 210. TESTING WITH REALISTIC NETWORKS

Test the website from realistic conditions:

- fast Wi-Fi
- ordinary 4G
- weak 4G
- slow mobile
- intermittent network

Especially test:

- homepage
- payment
- app redirect

---

# 211. TESTING WITH REAL DEVICES

Use actual:

- Android
- iPhone
- desktop browser

Do not rely entirely on browser emulation.

---

# 212. FINAL REPOSITORY CLEANUP

After migration:

- remove dead payment UI
- remove duplicate Admin UI
- remove unused imports
- remove obsolete routes
- remove stale environment variables
- remove obsolete dependencies
- update documentation
- update deployment configuration

Do not delete anything until dependency tracing is complete.

---

# 213. DEAD CODE AUDIT

Search for:

- old payment routes
- old Admin routes
- old payment components
- old Admin imports
- stale redirects
- dead environment variables
- obsolete API functions

---

# 214. ROUTE MAP

Create:

`AKO_WEBSITE_ROUTE_MAP.md`

with:

```text
PUBLIC
/
 /about
 /security
 /privacy
 /terms
 /faq
 /help
 /download

PAYMENT
 /pay/...

ADMIN
 /admin/...
```

and document authentication/indexing requirements.

---

# 215. WEBSITE HEALTH CHECK

Create a simple operational health strategy.

The website should distinguish:

- marketing site failure
- payment service failure
- backend failure
- Admin failure

Do not make the homepage depend on every backend service being operational.

---

# 216. PAYMENT AVAILABILITY

If payment backend is unavailable:

Show a clear state.

Do not show:

> Payment successful

because the UI timed out.

---

# 217. ADMIN AVAILABILITY

If Admin backend is unavailable:

Show:

> Unable to load this data. Try again.

Do not expose raw database errors.

---

# 218. ERROR REDACTION

Never expose:

- stack traces
- database credentials
- SQL
- service-role keys
- provider secrets
- internal paths

to public visitors.

---

# 219. LOGGING

Website logs should distinguish:

- public page errors
- payment errors
- Admin errors

but must redact sensitive values.

---

# 220. MONITORING

Monitor:

- uptime
- page performance
- payment success/failure
- redirect failures
- Admin availability
- 404s
- server errors

Do not send private payment data into monitoring.

---

# 221. PAYMENT RECONCILIATION

The website should never become the reconciliation authority.

Existing backend/payment reconciliation remains authoritative.

Website displays state.

---

# 222. ADMIN RECONCILIATION

Admin pages should display authoritative backend financial state.

If Admin currently has reconciliation tools, preserve them.

---

# 223. APP RETURN STATE

When a user returns to the app:

The app should refresh/re-fetch the authoritative state.

Do not assume the website can directly mutate the app's local state.

---

# 224. REFRESH AFTER PAYMENT

The app should be robust if:

- user returns immediately
- webhook is delayed
- transaction is still pending

Show:

> Payment processing…

rather than incorrectly showing failure.

---

# 225. EVENTUAL CONSISTENCY

Payment providers and webhooks can be asynchronous.

The UI should accommodate:

```text
initiated
→ pending
→ confirmed
```

rather than assuming instantaneous state.

---

# 226. WEBSITE SESSION EXPIRATION

Payment sessions should expire safely.

If expired:

> This payment session has expired. Start again.

Do not reuse stale sensitive state.

---

# 227. ADMIN SESSION EXPIRATION

If Admin session expires:

- redirect to login
- preserve safe navigation intent where appropriate
- do not expose protected data

---

# 228. PUBLIC SESSION

Marketing pages should not require authentication.

Keep the front door open.

---

# 229. SECURITY OF PUBLIC CONTENT

Even public content must be protected against:

- content injection
- malicious HTML
- unsafe external links
- XSS

Especially if future CMS/user-generated content is introduced.

---

# 230. WEBSITE CONTENT BOUNDARY

User-generated content should not automatically become public website content.

Explicitly define:

```text
public marketing content
```

versus:

```text
user-generated app content
```

---

# 231. FUTURE WEBMASTER EXTENSIBILITY

The architecture should make it easy later to add:

- FAQ categories
- Help center
- Security documentation
- developer documentation
- press kit
- media kit
- careers
- community guidelines
- public Project landing pages

without rebuilding the website.

---

# 232. DO NOT OVERENGINEER V1

The website needs to be excellent, not enormous.

Prioritize:

1. Home
2. About
3. Security
4. Privacy
5. Terms
6. FAQ
7. Help
8. Download
9. Payment
10. Admin

Then iterate.

---

# 233. DESIGN QUALITY BAR

Claude should judge the website against high-quality consumer product websites, not ordinary developer landing pages.

Ask:

- Does it feel intentional?
- Does it feel expensive?
- Does it feel human?
- Does it feel fast?
- Does it feel intimate?
- Is the story clear?
- Is the navigation obvious?
- Does the phone mockup feel believable?
- Are the images meaningful?
- Is there enough breathing room?
- Does it feel like Akọ?

---

# 234. UX QUALITY BAR

The site should feel:

> **"I understand this."**

rather than:

> "I need to figure out what this website is doing."

---

# 235. MOBILE QUALITY BAR

On a phone:

- headline should breathe
- CTA should be easy to hit
- phone mockup should remain beautiful
- images should not overwhelm
- sections should feel short enough to continue scrolling
- navigation should be obvious
- footer should be usable

---

# 236. SCROLL EXPERIENCE

The user wants a website that feels soft and intimate.

Use scroll as storytelling.

Potential rhythm:

```text
statement
 ↓
visual
 ↓
statement
 ↓
visual
 ↓
product
 ↓
human moment
 ↓
download
```

Do not make every section full-screen.

---

# 237. NOSTALGIC MICRO-INTERACTIONS

Potentially:

- subtle image reveal
- gentle phone movement
- quiet hover
- smooth section transitions
- small tactile button response

Do not make every element animate.

---

# 238. CTA LANGUAGE

Keep CTA language human.

Potential examples:

> Get Akọ

> Come reason with us

> Explore Akọ

> See what Akọ is about

Claude should choose based on context.

Do not use ten competing CTAs.

---

# 239. WEBSITE FOOTER BRAND MOMENT

The footer can contain a final emotional line.

For example:

> **A reason to reason.**

Then practical links.

This should feel like closure.

---

# 240. MARKETING WEBSITE SECURITY PRINCIPLE

The website may be beautiful.

The payment page may be smooth.

The Admin may be powerful.

But:

> **Beauty must never weaken security.**

---

# 241. ADMIN PRINCIPLE

> **Admin should control the platform, not bypass the platform's security model.**

---

# 242. PAYMENT PRINCIPLE

> **The website presents the payment. The backend decides the payment.**

---

# 243. SEO PRINCIPLE

> **Make the site understandable to search engines without making it boring to humans.**

---

# 244. DESIGN PRINCIPLE

> **Make Akọ feel close before asking people to join it.**

---

# 245. WEBSITE PRINCIPLE

> **The website is Akọ's front door, not Akọ's living room.**

The app is where people live.

The website is where the outside world meets Akọ.

---

# 246. MIGRATION PRINCIPLE

> **Move the surface, preserve the system.**

Payment and Admin are moving repositories.

Their authoritative backend/security architecture must not be casually rewritten.

---

# 247. REQUIRED CLAUDE WORKFLOW

Claude must follow this order:

## Phase 1 — Discovery

Read both repositories.

Map:

- app
- backend
- payment
- Admin
- auth
- database
- storage
- edge functions
- deployment

## Phase 2 — Architecture

Design the new website architecture.

## Phase 3 — Design

Create the visual system and information architecture.

## Phase 4 — Migration

Move payment UI.

Move Admin UI.

Preserve backend contracts.

## Phase 5 — Public Website

Build:

- Home
- About
- Security
- Privacy
- Terms
- FAQ
- Help
- Download

## Phase 6 — Integration

Connect:

- backend
- auth
- payment
- app redirects
- Admin

## Phase 7 — SEO

Implement indexing architecture.

## Phase 8 — QA

Test everything.

## Phase 9 — Security

Audit everything.

## Phase 10 — Final Review

Report:

- what was good
- what was wrong
- what was changed
- what was preserved
- what remains
- security risks
- UX score
- SEO score
- performance score
- payment score
- Admin score
- launch recommendation

---

# 248. REQUIRED UX SCORE

Before major redesign, Claude must honestly rate:

### 1–10

- visual quality
- brand expression
- typography
- spacing
- navigation
- storytelling
- mobile UX
- accessibility
- performance
- CTA clarity
- trust
- payment UX
- Admin UX
- SEO readiness

Do not manufacture low scores to justify work.

If something is already excellent:

> **Keep it.**

---

# 249. PRESERVE GOOD WORK

This is an upgrade.

Not a demolition.

Claude must not:

- replace working payment architecture unnecessarily
- replace working Admin authorization unnecessarily
- rewrite the backend merely because the frontend moved
- remove existing good components
- change database structures without need
- break existing app flows

---

# 250. REQUIRED FINAL REPORT

Create:

`AKO_MARKETING_WEBSITE_FINAL_AUDIT.md`

Include:

## Website

- UX score
- design score
- mobile score
- accessibility score
- performance score
- SEO score

## Payment

- payment migration status
- payment flow tests
- webhook status
- redirect status
- security findings

## Admin

- migration status
- authorization status
- RLS status
- financial controls
- audit logs

## Backend

- integrations
- changes
- risks

## SEO

- sitemap
- robots
- metadata
- indexing
- canonical
- structured data

## Security

- secret exposure
- auth
- payment
- Admin
- redirects
- headers
- third-party scripts

## Final

- remaining issues
- launch blockers
- recommended fixes
- GO / CONDITIONAL GO / NO-GO

---

# 251. DEFINITION OF DONE

The project is done when:

### Public website

- [ ] Feels unmistakably Akọ
- [ ] Feels soft
- [ ] Feels cool
- [ ] Feels intimate
- [ ] Has subtle nostalgic character
- [ ] Is fast
- [ ] Is mobile-first
- [ ] Has strong storytelling
- [ ] Has 3D phone mockup
- [ ] Has Android CTA
- [ ] Has iOS CTA
- [ ] Store URLs configurable
- [ ] Images optimized
- [ ] Accessibility reviewed

### SEO

- [ ] Semantic HTML
- [ ] Titles
- [ ] Descriptions
- [ ] Canonicals
- [ ] Sitemap
- [ ] Robots
- [ ] Open Graph
- [ ] Structured data where useful
- [ ] Public pages indexable
- [ ] Private pages noindexed
- [ ] Admin blocked from indexing

### Legal/trust

- [ ] About
- [ ] Privacy
- [ ] Terms
- [ ] Security
- [ ] FAQ
- [ ] Help

### Payment

- [ ] Existing payment UI audited
- [ ] Payment UI migrated
- [ ] Backend preserved
- [ ] Price server-authoritative
- [ ] Provider verification preserved
- [ ] Webhooks preserved
- [ ] Idempotency preserved
- [ ] Success state verified
- [ ] Failure state
- [ ] Pending state
- [ ] Refund state
- [ ] App return
- [ ] Deep-link security
- [ ] Mobile payment tested

### Admin

- [ ] All existing Admin pages mapped
- [ ] Admin UI migrated
- [ ] Roles preserved
- [ ] Server authorization preserved
- [ ] RLS preserved
- [ ] Audit logs preserved
- [ ] Financial controls preserved
- [ ] Promotion controls preserved
- [ ] Give Back controls preserved
- [ ] Payout controls preserved
- [ ] Moderation controls preserved
- [ ] Admin not indexable
- [ ] Unauthorized access tested

### Cross-system

- [ ] App → website works
- [ ] Website → backend works
- [ ] Website → app works
- [ ] Payment → backend works
- [ ] Payment → app works
- [ ] Admin → backend works
- [ ] No duplicate business logic
- [ ] No broken old routes
- [ ] No stale environment variables
- [ ] No secret exposure

---

# 252. FINAL PRODUCT VISION

The finished experience should look conceptually like this:

```text
                 THE WORLD
                    │
                    ▼
          ┌──────────────────┐
          │    AKỌ WEBSITE   │
          │                  │
          │ "A Reason to     │
          │  Reason."        │
          │                  │
          │ Learn            │
          │ Understand       │
          │ Trust            │
          │ Download         │
          │                  │
          │ Pay              │
          │                  │
          │ Admin            │
          └────────┬─────────┘
                   │
                   ▼
             AKỌ BACKEND
                   │
                   ▼
             ┌───────────┐
             │ AKỌ APP   │
             │           │
             │ Reason    │
             │ Discuss   │
             │ Discover  │
             │ Build     │
             │ Learn     │
             │ Connect   │
             │ Earn      │
             └───────────┘
```

The website should make people want to enter.

The app should make them want to stay.

The payment experience should feel seamless.

The Admin experience should remain powerful.

The backend should remain authoritative.

The public website should become the place where anyone—user, journalist, search engine, curious visitor, potential creator, potential partner, or existing user—can understand what Akọ is.

---

# 253. FINAL CLAUDE DIRECTIVE

**Do not build a generic marketing website.**

Build the public expression of Akọ.

Study the existing Akọ application before designing.

Study the existing payment architecture before moving payment UI.

Study the existing Admin architecture before moving Admin.

Preserve what is already strong.

Upgrade what feels weak.

Do not duplicate business logic.

Do not weaken authorization.

Do not expose secrets.

Do not break financial state.

Do not make SEO an excuse for ugly UX.

Do not make nostalgia an excuse for slow performance.

Do not make 3D an excuse for heavy pages.

Do not make the website another copy of the app.

Do not make Admin a public-facing feature.

Do not make payment a frontend-controlled operation.

Do not invent testimonials, numbers, security claims or product capabilities.

The website should feel:

> **soft, cool, intimate, nostalgic, intelligent, human and unmistakably Akọ.**

And the architectural rule is:

> **Move the interface. Preserve the authority.**

The final standard is not:

> "The website works."

It is:

> **"Akọ now has a world-class front door to the world, a secure payment surface, and a properly protected operational home—without breaking the product behind it."**
