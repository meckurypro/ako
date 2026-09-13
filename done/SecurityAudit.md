# Akọ Security Hardening & Production Security Checklist

> **Purpose:** This document is a living security audit checklist for Akọ.
>
> Akọ is a social platform with user accounts, posts, projects, cultural gifts, wallet balances, monetary transactions, purchases, and withdrawals. Because some application actions can move or represent real monetary value, security must be treated as a core product requirement rather than a later optimization.
>
> This document should be reviewed before major releases and before production launch.
>
> ---
>
> ## How Claude Should Use This File
>
> When asked to audit or harden Akọ:
>
> 1. Read this entire document.
> 2. Inspect the actual repository before making assumptions.
> 3. Inspect:
>    - frontend code
>    - Supabase schema
>    - migrations
>    - RLS policies
>    - Edge Functions
>    - authentication flows
>    - storage policies
>    - wallet/transaction logic
>    - payment integrations
>    - withdrawal logic
>    - environment variables
>    - Vercel configuration
>    - API calls
>    - database triggers/functions
>    - webhooks
>    - dependencies
> 4. Do NOT mark an item as secure merely because the code "looks correct."
> 5. Where possible, prove security properties by:
>    - tracing data flow
>    - inspecting SQL policies
>    - testing authorization boundaries
>    - testing malicious input
>    - testing concurrent requests
>    - testing replayed requests
>    - testing forged requests
>    - checking server/client boundaries
> 6. Never expose secrets while auditing.
> 7. Do not commit secrets, credentials, private keys, service-role keys, or production tokens.
> 8. For every issue discovered, explain:
>    - what is vulnerable
>    - why it is vulnerable
>    - what an attacker could do
>    - severity
>    - exact location
>    - recommended fix
>    - whether the fix has been verified
>
> ---
>
> ## Status Legend
>
> - [ ] NOT REVIEWED
> - [~] PARTIAL / NEEDS IMPROVEMENT
> - [x] VERIFIED
> - [!] VULNERABILITY FOUND
> - [N/A] NOT APPLICABLE
>
> Do not use `[x] VERIFIED` unless there is actual evidence.
>
> ---
>
> # 1. SECURITY ARCHITECTURE
>
> ## 1.1 Trust Boundaries
>
> [ ] Identify every trust boundary in the application.
>
> [ ] Document which operations are trusted only when executed server-side.
>
> [ ] Identify all values that originate from the browser/client.
>
> [ ] Assume all client-provided values can be manipulated.
>
> [ ] Confirm that sensitive business logic does not depend on client honesty.
>
> [ ] Confirm that wallet amounts, gift prices, purchase prices, user roles, permissions, ownership, payout amounts, and transaction IDs cannot be trusted simply because they came from the authenticated client.
>
> [ ] Confirm that the server/database independently determines whether an operation is allowed.
>
> ## 1.2 Attack Surface Inventory
>
> [ ] Inventory all:
>
> - API endpoints
> - Supabase Edge Functions
> - database functions
> - database triggers
> - authentication endpoints
> - storage buckets
> - webhooks
> - payment endpoints
> - wallet operations
> - gift operations
> - withdrawal operations
> - purchase operations
> - administrative operations
> - public URLs
> - third-party integrations
>
> [ ] Identify which endpoints are public.
>
> [ ] Identify which endpoints require authentication.
>
> [ ] Identify which endpoints require authorization beyond authentication.
>
> ---
>
> # 2. AUTHENTICATION
>
> [ ] Review Supabase Auth configuration.
>
> [ ] Confirm passwords are never stored manually by the application.
>
> [ ] Confirm authentication tokens are validated correctly.
>
> [ ] Confirm expired/revoked sessions cannot perform protected actions.
>
> [ ] Confirm authenticated users cannot impersonate another user by modifying a user ID in a request.
>
> [ ] Confirm every sensitive server operation derives the authenticated user identity from the verified session/token rather than trusting a client-provided `user_id`.
>
> [ ] Review password reset flow.
>
> [ ] Review email verification flow if enabled.
>
> [ ] Review OAuth/social login configuration if enabled.
>
> [ ] Review account deletion flow.
>
> [ ] Review session persistence and logout behavior.
>
> [ ] Review protection against account enumeration where appropriate.
>
> [ ] Review brute-force/rate-limit protections.
>
> [ ] Review suspicious login/activity handling if implemented.
>
> ---
>
> # 3. AUTHORIZATION
>
> Authentication answers:
>
> > "Who are you?"
>
> Authorization answers:
>
> > "Are you allowed to do this?"
>
> Both must be enforced.
>
> [ ] Every protected operation performs authorization.
>
> [ ] A user cannot modify another user's profile data unless explicitly permitted.
>
> [ ] A user cannot modify another user's posts unless explicitly permitted.
>
> [ ] A user cannot modify another user's projects unless explicitly permitted.
>
> [ ] A user cannot access another user's private project content.
>
> [ ] A user cannot access another user's private files.
>
> [ ] A user cannot perform another user's purchases.
>
> [ ] A user cannot perform another user's withdrawals.
>
> [ ] A user cannot modify another user's wallet.
>
> [ ] A user cannot create transactions on behalf of another user.
>
> [ ] A user cannot manipulate ownership fields to gain access.
>
> [ ] Test authorization by changing IDs manually in requests.
>
> Example attack:
>
> ```text
> Legitimate:
> GET /project/USER_A_PROJECT
>
> Attacker changes ID:
> GET /project/USER_B_PROJECT
> ```
>
> The second request must fail if the project is private.
>
> ---
>
> # 4. SUPABASE RLS
>
> ## 4.1 RLS Enabled
>
> [ ] RLS is enabled on every table containing user-sensitive or financial data.
>
> [ ] No sensitive table relies solely on frontend restrictions.
>
> [ ] No sensitive table is accessible through an accidentally permissive policy.
>
> ## 4.2 Policy Review
>
> For every table, document:
>
> - SELECT policy
> - INSERT policy
> - UPDATE policy
> - DELETE policy
>
> [ ] Every policy has a clear security reason.
>
> [ ] Policies are tested using different users.
>
> [ ] User A cannot access User B's private data.
>
> [ ] User A cannot update User B's records.
>
> [ ] User A cannot delete User B's records.
>
> [ ] User A cannot insert records pretending to belong to User B.
>
> [ ] Anonymous users cannot access private data.
>
> [ ] Anonymous users cannot perform protected writes.
>
> ## 4.3 Financial Tables
>
> Pay special attention to:
>
> - wallets
> - wallet balances
> - transactions
> - gifts
> - purchases
> - payouts
> - withdrawal requests
> - payment records
>
> [ ] Clients cannot directly update wallet balances.
>
> [ ] Clients cannot directly insert arbitrary financial transactions.
>
> [ ] Clients cannot alter transaction amounts.
>
> [ ] Clients cannot alter sender/recipient IDs after transaction creation.
>
> [ ] Clients cannot mark transactions as completed.
>
> [ ] Clients cannot mark withdrawals as paid.
>
> [ ] Clients cannot modify payment-provider status.
>
> [ ] Clients cannot bypass server-side financial validation.
>
> ---
>
> # 5. WALLET SECURITY
>
> **This is a critical section.**
>
> The wallet must be treated as a financial ledger, not as a normal user profile field.
>
> ## 5.1 Balance Integrity
>
> [ ] The client cannot directly set the wallet balance.
>
> [ ] The client cannot increment the wallet balance directly.
>
> [ ] The client cannot decrement the wallet balance directly.
>
> [ ] All balance changes occur through trusted server-side logic/database transactions.
>
> [ ] Every balance change has a corresponding transaction record.
>
> [ ] Transactions cannot be silently deleted.
>
> [ ] Historical transactions cannot be modified by ordinary users.
>
> [ ] Wallet balance can be reconciled against transaction history.
>
> [ ] Negative balances are impossible unless explicitly supported and controlled.
>
> [ ] Currency precision is handled safely.
>
> [ ] Do not use floating-point arithmetic for monetary accounting if it can create rounding errors.
>
> [ ] Define the smallest monetary unit used internally where appropriate (e.g. cents/kobo).
>
> ## 5.2 Gift Value
>
> Akọ gifts have monetary value.
>
> [ ] The client cannot supply the gift's monetary value and have the server trust it.
>
> Bad:
>
> ```js
> sendGift({
>   giftId,
>   value: 1000000
> })
> ```
>
> The server must determine the actual gift value from trusted database data.
>
> [ ] Gift ID is validated.
>
> [ ] Gift must exist.
>
> [ ] Gift must be active/available.
>
> [ ] Gift value comes from trusted server-side data.
>
> [ ] Sender must have sufficient available balance.
>
> [ ] Recipient must be valid.
>
> [ ] Sender cannot gift to themselves if the business rules prohibit it.
>
> [ ] Sender cannot manipulate recipient identity.
>
> [ ] Gift cannot be duplicated by replaying the request.
>
> [ ] Gift cannot be duplicated by double-clicking.
>
> [ ] Gift cannot be duplicated through concurrent requests.
>
> [ ] Recipient cannot forward the original gift if the product rules prohibit forwarding.
>
> [ ] Gift history is immutable or appropriately protected.
>
> ## 5.3 Atomic Gift Transactions
>
> A gift should behave atomically:
>
> ```text
> BEGIN
>
> Validate sender
> Validate recipient
> Validate gift
> Determine trusted gift value
> Lock/check sender balance
> Debit sender
> Credit recipient
> Record transaction
> Record gift
>
> COMMIT
> ```
>
> [ ] If any step fails, the entire operation fails.
>
> [ ] No partial debit occurs.
>
> [ ] No partial credit occurs.
>
> [ ] No transaction can leave the ledger inconsistent.
>
> ---
>
> # 6. RACE CONDITIONS
>
> **Critical for wallet operations.**
>
> Test concurrent requests.
>
> Example:
>
> User has $10.
>
> Two requests simultaneously attempt to spend $10.
>
> [ ] Only one transaction succeeds.
>
> [ ] User cannot spend the same balance twice.
>
> [ ] Database locking/transaction isolation is appropriate.
>
> [ ] Balance checks and balance mutations occur atomically.
>
> Test:
>
> - simultaneous gifts
> - simultaneous purchases
> - simultaneous withdrawals
> - repeated requests
> - network retries
> - double-clicks
> - multiple browser tabs
> - multiple devices
>
> ---
>
> # 7. IDEMPOTENCY / REPLAY PROTECTION
>
> Sensitive operations must not execute twice simply because the same request was submitted twice.
>
> [ ] Gift transactions support idempotency where appropriate.
>
> [ ] Payment processing supports idempotency.
>
> [ ] Withdrawal requests support idempotency.
>
> [ ] Webhook processing is idempotent.
>
> [ ] Retried requests do not duplicate financial effects.
>
> [ ] A unique transaction/reference ID is enforced at the database level where appropriate.
>
> Example:
>
> ```text
> Request A
> transaction_id = ABC123
>
> Request A repeated
> transaction_id = ABC123
> ```
>
> The second request must not create another financial transaction.
>
> ---
>
> # 8. SERVER-SIDE VALIDATION
>
> [ ] Never trust frontend validation.
>
> [ ] Validate all sensitive inputs on the server.
>
> [ ] Validate data types.
>
> [ ] Validate ranges.
>
> [ ] Validate ownership.
>
> [ ] Validate permissions.
>
> [ ] Validate referenced records.
>
> [ ] Validate transaction state.
>
> [ ] Validate monetary values.
>
> [ ] Validate IDs.
>
> [ ] Validate URLs where necessary.
>
> [ ] Validate uploaded files.
>
> [ ] Validate enum/status fields.
>
> [ ] Reject unexpected fields where appropriate.
>
> [ ] Prevent mass-assignment vulnerabilities.
>
> ---
>
> # 9. EDGE FUNCTIONS / API SECURITY
>
> For every Edge Function:
>
> [ ] Authentication requirement documented.
>
> [ ] Authorization requirement documented.
>
> [ ] Input schema documented.
>
> [ ] Input validation implemented.
>
> [ ] Errors do not leak sensitive information.
>
> [ ] Secrets are accessed only server-side.
>
> [ ] No service-role key is exposed to the browser.
>
> [ ] Service-role operations are minimized.
>
> [ ] Function cannot be abused to bypass RLS unintentionally.
>
> [ ] Function explicitly checks the authenticated user's identity.
>
> [ ] Rate limiting/abuse protection considered.
>
> [ ] Financial functions have stronger protections than ordinary read APIs.
>
> ---
>
> # 10. SERVICE-ROLE KEY SECURITY
>
> Supabase service-role credentials bypass RLS and therefore require extreme care.
>
> [ ] Service-role keys never appear in frontend code.
>
> [ ] Service-role keys never appear in public repositories.
>
> [ ] Service-role keys never appear in client-side environment variables.
>
> [ ] Service-role keys exist only in secure server-side environments.
>
> [ ] Search repository for accidental exposure.
>
> Search patterns should include:
>
> ```text
> service_role
> SUPABASE_SERVICE_ROLE_KEY
> supabase_service_role
> ```
>
> [ ] Check Git history for previously committed secrets.
>
> [ ] If a secret was ever committed, rotate it rather than merely deleting the file.
>
> ---
>
> # 11. ENVIRONMENT VARIABLES / SECRETS
>
> [ ] `.env` files containing secrets are ignored by Git.
>
> [ ] `.env.local` is ignored.
>
> [ ] Production secrets are stored in Vercel/Supabase secret configuration rather than source code.
>
> [ ] Public environment variables contain only values intended to be public.
>
> [ ] Secret names are clearly distinguished from public configuration.
>
> [ ] No API keys are hardcoded in source files.
>
> [ ] No payment secrets are hardcoded.
>
> [ ] No webhook secrets are hardcoded.
>
> [ ] No private signing keys are hardcoded.
>
> [ ] No credentials appear in README files, screenshots, test fixtures, or comments.
>
> [ ] Git history has been checked for accidentally committed credentials.
>
> ---
>
> # 12. GIT / GITHUB SECURITY
>
> [ ] Repository visibility is intentional.
>
> [ ] Production credentials have never been committed.
>
> [ ] GitHub Actions secrets are protected.
>
> [ ] Pull requests cannot unexpectedly deploy malicious code to production.
>
> [ ] Branch protection is configured appropriately for the project's maturity.
>
> [ ] Dependabot/security alerts are reviewed.
>
> [ ] Repository collaborators have appropriate permissions.
>
> [ ] Personal access tokens are not stored in the repository.
>
> [ ] SSH/private keys are not present.
>
> [ ] Old leaked credentials have been rotated.
>
> ---
>
> # 13. VERCEL SECURITY
>
> [ ] Production environment variables are configured securely.
>
> [ ] Preview environment variables are reviewed.
>
> [ ] Development secrets are not accidentally exposed to client bundles.
>
> [ ] Production deployment protection is appropriate.
>
> [ ] Server-side functions do not expose secrets in responses.
>
> [ ] Error pages do not expose stack traces or secrets.
>
> [ ] Security headers are configured where appropriate.
>
> [ ] CORS configuration is intentional.
>
> [ ] No wildcard CORS is used unnecessarily for sensitive endpoints.
>
> ---
>
> # 14. SUPABASE SECURITY
>
> [ ] Database access is reviewed table by table.
>
> [ ] RLS is enabled where required.
>
> [ ] Policies are tested.
>
> [ ] Database functions use appropriate security configuration.
>
> [ ] `SECURITY DEFINER` functions are reviewed carefully.
>
> [ ] `search_path` handling is secure where relevant.
>
> [ ] Functions do not unintentionally expose privileged operations.
>
> [ ] Storage buckets have appropriate policies.
>
> [ ] Private files cannot be downloaded by unauthorized users.
>
> [ ] Signed URLs expire appropriately.
>
> [ ] Storage upload permissions are restricted.
>
> [ ] Users cannot upload files into another user's protected namespace.
>
> [ ] Database extensions are reviewed.
>
> [ ] Database roles/permissions follow least privilege.
>
> ---
>
> # 15. DATABASE SECURITY
>
> [ ] Foreign keys are used where appropriate.
>
> [ ] Constraints enforce important invariants.
>
> [ ] Unique constraints prevent duplicate transactions.
>
> [ ] CHECK constraints prevent invalid financial states where appropriate.
>
> [ ] NOT NULL constraints are used where required.
>
> [ ] Monetary fields have safe types.
>
> [ ] User-controlled values cannot corrupt database state.
>
> [ ] Database functions validate inputs.
>
> [ ] Sensitive records cannot be deleted casually.
>
> [ ] Financial records have appropriate auditability.
>
> ---
>
> # 16. TRANSACTION LEDGER
>
> Akọ should maintain a trustworthy financial history.
>
> [ ] Every wallet movement has a transaction record.
>
> [ ] Transaction records contain enough information to explain the movement.
>
> [ ] Sender is recorded.
>
> [ ] Recipient is recorded where applicable.
>
> [ ] Amount is recorded.
>
> [ ] Currency is recorded.
>
> [ ] Transaction type is recorded.
>
> [ ] Related gift/purchase/withdrawal ID is recorded where applicable.
>
> [ ] Transaction status is recorded.
>
> [ ] Creation timestamp is recorded.
>
> [ ] Transaction reference/ID is unique.
>
> [ ] Users cannot modify historical financial transactions.
>
> [ ] Administrative corrections, if needed, create auditable compensating transactions rather than silently rewriting history.
>
> [ ] Wallet balance can be reconstructed or reconciled from ledger activity.
>
> ---
>
> # 17. PURCHASE SECURITY
>
> For Books, Courses, Rooms, and future project types:
>
> [ ] Client cannot choose arbitrary purchase price.
>
> [ ] Server retrieves trusted project price.
>
> [ ] Server validates project availability.
>
> [ ] Server validates user eligibility.
>
> [ ] Server validates sufficient wallet balance where applicable.
>
> [ ] Purchase is atomic.
>
> [ ] Duplicate purchases are prevented.
>
> [ ] Purchase cannot be marked as paid by the client.
>
> [ ] Content unlock occurs only after confirmed successful payment.
>
> [ ] Failed payment does not unlock paid content.
>
> [ ] Cancelled/reversed transactions are handled correctly.
>
> [ ] Refund behavior is explicitly defined.
>
> ---
>
> # 18. WITHDRAWAL / PAYOUT SECURITY
>
> **Critical because this represents money leaving the system.**
>
> [ ] User cannot withdraw more than their available balance.
>
> [ ] User cannot manipulate payout amount.
>
> [ ] Server determines eligible balance.
>
> [ ] Minimum withdrawal requirement is enforced server-side.
>
> [ ] Friday withdrawal-request window is enforced server-side if this remains the product rule.
>
> [ ] Saturday payout processing is enforced through trusted backend logic.
>
> [ ] User cannot mark their own withdrawal as completed.
>
> [ ] User cannot change withdrawal status.
>
> [ ] User cannot reuse a completed withdrawal request.
>
> [ ] Duplicate withdrawal requests are prevented.
>
> [ ] Withdrawal requests have unique IDs.
>
> [ ] Withdrawal status transitions are validated.
>
> Example allowed lifecycle:
>
> ```text
> requested
>     ↓
> approved
>     ↓
> processing
>     ↓
> paid
> ```
>
> Possible failure path:
>
> ```text
> processing
>     ↓
> failed
> ```
>
> [ ] Invalid state transitions are rejected.
>
> [ ] Payout processing is idempotent.
>
> [ ] Failed payouts do not permanently destroy user funds.
>
> [ ] Successful payouts cannot accidentally be paid twice.
>
> [ ] Payment provider webhooks are verified.
>
> [ ] Payout records are auditable.
>
> [ ] Appropriate fraud/abuse checks exist.
>
> ---
>
> # 19. PAYMENT WEBHOOK SECURITY
>
> [ ] Webhook signatures are verified.
>
> [ ] Unauthenticated webhook requests are rejected.
>
> [ ] Webhook payloads are validated.
>
> [ ] Webhook event IDs are stored to prevent replay.
>
> [ ] Duplicate webhook delivery does not duplicate wallet credits.
>
> [ ] Payment status is determined from trusted provider information.
>
> [ ] Client cannot simulate a successful payment by calling an internal endpoint.
>
> [ ] Webhook processing is idempotent.
>
> ---
>
> # 20. RATE LIMITING / ABUSE
>
> Identify operations that can be abused.
>
> [ ] Login attempts
>
> [ ] Password reset
>
> [ ] OTP/email verification
>
> [ ] Gift sending
>
> [ ] Wallet operations
>
> [ ] Purchase attempts
>
> [ ] Withdrawal requests
>
> [ ] File uploads
>
> [ ] Post creation
>
> [ ] Comments/reactions
>
> [ ] Messaging
>
> [ ] Project creation
>
> [ ] API calls
>
> [ ] Edge Functions
>
> [ ] Webhooks
>
> [ ] Expensive database queries
>
> [ ] Apply rate limits where appropriate.
>
> [ ] Prevent automated abuse from creating excessive transactions.
>
> [ ] Prevent spam accounts from draining promotional resources.
>
> ---
>
> # 21. INPUT / INJECTION SECURITY
>
> [ ] SQL injection is prevented.
>
> [ ] Supabase queries use safe parameterization.
>
> [ ] User-generated text is safely rendered.
>
> [ ] XSS is prevented.
>
> [ ] HTML is sanitized where HTML is intentionally allowed.
>
> [ ] URLs are validated.
>
> [ ] Dangerous URL schemes such as `javascript:` are rejected where relevant.
>
> [ ] Markdown rendering is reviewed.
>
> [ ] Rich text rendering is reviewed.
>
> [ ] Search inputs are safely handled.
>
> [ ] File names are sanitized.
>
> [ ] User-controlled metadata is validated.
>
> ---
>
> # 22. FILE / STORAGE SECURITY
>
> [ ] Users cannot access private files belonging to other users.
>
> [ ] Upload authorization is enforced.
>
> [ ] File size limits exist.
>
> [ ] File type validation exists.
>
> [ ] MIME type cannot be blindly trusted.
>
> [ ] Dangerous executable uploads are prevented where inappropriate.
>
> [ ] Storage paths cannot be manipulated to access another user's files.
>
> [ ] Signed URLs have appropriate expiration.
>
> [ ] Deleted/private files cannot remain publicly accessible unintentionally.
>
> [ ] File download authorization is enforced server-side.
>
> ---
>
> # 23. PROJECT / CONTENT ACCESS
>
> Akọ projects may contain free and paid content.
>
> [ ] Public project metadata is intentionally public.
>
> [ ] Paid content is not accessible merely by knowing its storage URL.
>
> [ ] Paid content cannot be retrieved through direct database queries.
>
> [ ] Paid content cannot be accessed by changing a project ID.
>
> [ ] Paid content cannot be accessed by changing a user ID.
>
> [ ] Paid content cannot be accessed by manipulating frontend state.
>
> [ ] Purchase/access authorization is checked server-side.
>
> [ ] Signed download URLs are generated only for authorized users.
>
> [ ] Expired purchases do not retain access if access is meant to expire.
>
> ---
>
> # 24. ADMIN / PRIVILEGED OPERATIONS
>
> [ ] Identify all admin functionality.
>
> [ ] Admin actions require appropriate authorization.
>
> [ ] Admin privileges are not granted through client-controlled fields.
>
> [ ] Admin APIs cannot be called by ordinary users.
>
> [ ] Privileged database functions are protected.
>
> [ ] Admin actions are auditable.
>
> [ ] Service-role credentials are never exposed to normal users.
>
> ---
>
> # 25. ERROR HANDLING
>
> [ ] Errors do not expose secrets.
>
> [ ] Errors do not expose database credentials.
>
> [ ] Errors do not expose internal stack traces in production.
>
> [ ] Errors do not reveal unnecessary database structure.
>
> [ ] Errors do not reveal whether sensitive accounts exist when that would create an enumeration risk.
>
> [ ] Client receives safe error messages.
>
> [ ] Server logs retain enough information for debugging without logging secrets.
>
> ---
>
> # 26. LOGGING / AUDITING
>
> [ ] Security-relevant events are logged.
>
> [ ] Financial events are auditable.
>
> [ ] Failed authorization attempts can be investigated.
>
> [ ] Suspicious wallet activity can be investigated.
>
> [ ] Withdrawal activity can be investigated.
>
> [ ] Payment webhook failures are logged.
>
> [ ] Logs do not contain passwords.
>
> [ ] Logs do not contain API secrets.
>
> [ ] Logs do not unnecessarily contain full payment credentials.
>
> [ ] Logs do not expose sensitive personal information unnecessarily.
>
> ---
>
> # 27. DEPENDENCY SECURITY
>
> [ ] Run dependency vulnerability audit.
>
> [ ] Review outdated dependencies.
>
> [ ] Remove unused dependencies.
>
> [ ] Investigate critical/high severity vulnerabilities.
>
> [ ] Lock dependency versions appropriately.
>
> [ ] Review dependency provenance where important.
>
> [ ] Check for suspicious packages.
>
> [ ] Check transitive dependencies where appropriate.
>
> ---
>
> # 28. FRONTEND SECURITY
>
> [ ] No secrets are embedded in frontend JavaScript.
>
> [ ] No service-role credentials are shipped to the browser.
>
> [ ] Sensitive operations are not performed solely through client-side logic.
>
> [ ] UI restrictions are backed by server authorization.
>
> [ ] Hidden buttons are not treated as security controls.
>
> [ ] Disabled UI controls are not treated as security controls.
>
> [ ] Client state cannot override server truth.
>
> [ ] Wallet UI is treated as a display of server state, not the authority.
>
> ---
>
> # 29. API / NETWORK SECURITY
>
> [ ] HTTPS is used in production.
>
> [ ] Sensitive endpoints do not accept insecure transport.
>
> [ ] CORS rules are reviewed.
>
> [ ] Authentication headers are handled safely.
>
> [ ] Tokens are not leaked through URLs unnecessarily.
>
> [ ] Sensitive information is not placed in query strings unnecessarily.
>
> [ ] API responses contain only necessary data.
>
> [ ] Internal endpoints are not accidentally publicly exposed.
>
> ---
>
> # 30. ACCOUNT TAKEOVER PROTECTION
>
> [ ] Review password reset vulnerabilities.
>
> [ ] Review email change flow.
>
> [ ] Review password change flow.
>
> [ ] Review session invalidation.
>
> [ ] Review OAuth account-linking behavior.
>
> [ ] Review token handling.
>
> [ ] Review whether changing email/password requires reauthentication where appropriate.
>
> [ ] Review suspicious login behavior.
>
> [ ] Review recovery mechanisms.
>
> [ ] Financial operations require appropriate account/session assurance.
>
> ---
>
> # 31. SOCIAL ENGINEERING / BUSINESS LOGIC ABUSE
>
> Security is not only technical.
>
> Review whether users can abuse:
>
> [ ] gifting
>
> [ ] promotional credits
>
> [ ] referrals
>
> [ ] free content
>
> [ ] purchases
>
> [ ] refunds
>
> [ ] withdrawals
>
> [ ] project ownership
>
> [ ] moderation
>
> [ ] account transfers
>
> [ ] identity verification
>
> [ ] support/admin workflows
>
> [ ] reporting systems
>
> [ ] Make sure product rules cannot be bypassed by combining otherwise legitimate features.
>
> ---
>
> # 32. TESTING AGAINST MALICIOUS CLIENTS
>
> Assume the attacker owns the browser.
>
> Attempt to:
>
> [ ] Modify request bodies.
>
> [ ] Modify IDs.
>
> [ ] Modify monetary values.
>
> [ ] Modify user IDs.
>
> [ ] Modify recipient IDs.
>
> [ ] Modify gift IDs.
>
> [ ] Modify prices.
>
> [ ] Modify transaction statuses.
>
> [ ] Modify purchase statuses.
>
> [ ] Modify withdrawal statuses.
>
> [ ] Replay requests.
>
> [ ] Send requests simultaneously.
>
> [ ] Skip frontend screens.
>
> [ ] Call backend endpoints directly.
>
> [ ] Call Edge Functions directly.
>
> [ ] Access database endpoints directly where possible.
>
> [ ] Attempt unauthorized storage access.
>
> [ ] Attempt unauthorized project-content access.
>
> [ ] Attempt to access another user's data.
>
> [ ] Attempt to perform actions after logout/session expiry.
>
> The application must remain secure even if the attacker completely ignores the UI.
>
> ---
>
> # 33. FINANCIAL INVARIANTS
>
> Define and enforce explicit invariants.
>
> ### Wallet invariant
>
> ```text
> A user's spendable balance must never become greater than what
> legitimate transactions have credited to that user.
> ```
>
> ### Gift invariant
>
> ```text
> Every successful gift has exactly one valid sender,
> one valid recipient, one valid gift definition,
> and one valid monetary amount determined by trusted data.
> ```
>
> ### Debit invariant
>
> ```text
> A sender cannot be debited more than once for the same gift transaction.
> ```
>
> ### Credit invariant
>
> ```text
> A recipient cannot receive the same gift credit more than once.
> ```
>
> ### Withdrawal invariant
>
> ```text
> A withdrawal cannot cause the user to spend the same available funds twice.
> ```
>
> ### Purchase invariant
>
> ```text
> Paid content cannot be unlocked without a valid successful purchase.
> ```
>
> [ ] Confirm these invariants are enforced by the backend/database, not merely the frontend.
>
> ---
>
> # 34. NEGATIVE TEST CASES
>
> Create automated/manual tests for:
>
> [ ] insufficient wallet balance
>
> [ ] zero-value transaction
>
> [ ] negative transaction amount
>
> [ ] absurdly large transaction amount
>
> [ ] invalid gift ID
>
> [ ] inactive gift
>
> [ ] nonexistent recipient
>
> [ ] unauthorized recipient manipulation
>
> [ ] duplicate gift request
>
> [ ] concurrent gift requests
>
> [ ] duplicate purchase
>
> [ ] concurrent purchase
>
> [ ] duplicate withdrawal
>
> [ ] concurrent withdrawal
>
> [ ] forged payment success
>
> [ ] forged webhook
>
> [ ] replayed webhook
>
> [ ] expired session
>
> [ ] unauthorized user
>
> [ ] anonymous user
>
> [ ] modified user ID
>
> [ ] modified project ID
>
> [ ] modified price
>
> [ ] modified transaction status
>
> [ ] unauthorized file download
>
> [ ] malicious upload
>
> [ ] malformed request
>
> [ ] unexpected JSON fields
>
> ---
>
> # 35. SECURITY REVIEW OF BUSINESS LOGIC
>
> Claude must not limit this audit to traditional vulnerabilities such as SQL injection.
>
> Review the application's actual business rules.
>
> Ask:
>
> > "Can a user achieve an outcome that the product never intended, even if every individual API call appears legitimate?"
>
> Specifically inspect:
>
> [ ] gift flow
>
> [ ] wallet flow
>
> [ ] purchase flow
>
> [ ] withdrawal flow
>
> [ ] project access
>
> [ ] content unlocking
>
> [ ] room membership
>
> [ ] course access
>
> [ ] book access
>
> [ ] account ownership
>
> [ ] moderation
>
> [ ] referrals/promotions if implemented
>
> ---
>
> # 36. PRODUCTION READINESS
>
> Before launch:
>
> [ ] Production secrets configured.
>
> [ ] Development secrets separated from production secrets.
>
> [ ] Test accounts removed/disabled where appropriate.
>
> [ ] Debug mode disabled.
>
> [ ] Production error handling enabled.
>
> [ ] Database backups/recovery strategy reviewed.
>
> [ ] Monitoring configured.
>
> [ ] Logging configured.
>
> [ ] Payment provider configuration reviewed.
>
> [ ] Webhook endpoints verified.
>
> [ ] RLS audit completed.
>
> [ ] Wallet audit completed.
>
> [ ] Withdrawal audit completed.
>
> [ ] Dependency audit completed.
>
> [ ] Git history checked for secrets.
>
> [ ] Vercel environment reviewed.
>
> [ ] Supabase project reviewed.
>
> [ ] Production deployment reviewed.
>
> ---
>
> # 37. FINAL SECURITY AUDIT
>
> Before declaring Akọ production-ready, Claude should produce a report containing:
>
> ## Summary
>
> - Overall security status
> - Critical vulnerabilities
> - High vulnerabilities
> - Medium vulnerabilities
> - Low vulnerabilities
> - Informational findings
>
> ## Evidence
>
> For every finding:
>
> ```text
> Finding:
> Severity:
> File:
> Line/function:
> Vulnerability:
> Attack scenario:
> Impact:
> Recommended fix:
> Fix implemented:
> Verification performed:
> ```
>
> ## Security Score
>
> Do not invent a score simply to make the project look good.
>
> If a score is used, explain the methodology.
>
> ## Blocking Issues
>
> Clearly list anything that must be fixed before production.
>
> ---
>
> # 38. IMPORTANT SECURITY PRINCIPLES
>
> Remember:
>
> ### Never trust the client.
>
> Anything running in the browser can be modified by the user.
>
> ### RLS is necessary but not automatically sufficient.
>
> Review RLS together with application logic, Edge Functions, database functions, and service-role operations.
>
> ### The wallet is financial state.
>
> Treat wallet mutations with the same seriousness as payment processing.
>
> ### The database should enforce invariants.
>
> Do not rely exclusively on frontend logic to preserve financial correctness.
>
> ### Every financial operation should be auditable.
>
> ### Repeated requests must not create repeated financial effects.
>
> ### Authorization must happen server-side.
>
> ### Secrets must never reach the client.
>
> ### Security must survive a malicious client.
>
> ---
>
> # 39. CLAUDE'S FINAL INSTRUCTION
>
> When this checklist is given to you for an audit, do not simply tell the developer:
>
> "Your app looks secure."
>
> Instead:
>
> **Assume there is a vulnerability until the relevant security property has been verified.**
>
> Inspect the actual implementation.
>
> Test the assumptions.
>
> Trace the financial flows.
>
> Review the RLS policies.
>
> Review every privileged function.
>
> Attempt to break the business logic.
>
> Attempt to manipulate client-supplied values.
>
> Attempt replay and concurrency attacks.
>
> Attempt unauthorized access.
>
> Attempt to bypass the UI completely.
>
> Then report what you actually found.
>
> If something is secure, explain the evidence that makes you confident.
>
> If something is uncertain, mark it as uncertain rather than calling it secure.
>
> If something is vulnerable, fix it where safe to do so and explain the fix.
>
> **The goal is not to make the checklist green.**
>
> **The goal is to make Akọ difficult to break.**
