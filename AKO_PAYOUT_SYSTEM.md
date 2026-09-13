# AKỌ — Payout & Withdrawal System

## Status

**Product specification / implementation audit brief**

This document defines the intended Akọ wallet withdrawal and payout system.

It is an **audit-and-upgrade specification**, not a blind implementation checklist. The existing codebase is the current reality: inspect it, preserve what is correct, upgrade what is weak, and add only what is missing.

---

## 1. Product Intent

Akọ users can accumulate value in their Akọ wallet from eligible sources such as:

- Gifts
- Give Back / participation rewards
- Creator earnings
- Affiliate commissions where implemented
- Other approved monetization systems

The wallet is the internal Akọ financial balance. The payout system moves eligible value from the wallet to a supported external payout destination.

**Core experience:**

`Earn → Wallet → Request withdrawal → Akọ processes payout → Money arrives`

The user experience should be simple while the financial machinery underneath is rigorous.

---

## 2. Core Payout Rhythm

The intended MVP rhythm is:

```text
FRIDAY
Withdrawal requests
      ↓
Eligibility / balance / risk checks
      ↓
Payout batch prepared
      ↓
Processing

SATURDAY
Approved payouts processed
      ↓
Provider confirmation
      ↓
User receives funds
```

The exact cut-off time, timezone, holidays, provider delays, and exceptional processing rules must be configurable and documented.

---

## 3. Withdrawal Eligibility

A user may request a withdrawal only when they satisfy Akọ's requirements.

Audit:

- Available wallet balance
- Minimum withdrawal amount
- Pending funds
- Held funds
- Reserved funds
- Previous withdrawal state
- Payout destination
- Account eligibility
- Fraud/risk status
- Compliance requirements where applicable
- Currency
- Fees
- Provider availability

The client must never determine authoritative eligibility.

---

## 4. Minimum Withdrawal

Akọ intends to have a minimum withdrawal threshold.

Conceptually:

```text
Wallet balance
    ↓
Remove pending / held / reserved funds
    ↓
Available balance
    ↓
Available >= minimum
    ↓
Withdrawal eligible
```

The amount must be server-authoritative and configurable rather than scattered through frontend code.

---

## 5. Wallet States

The system must distinguish money that exists from money that is withdrawable.

Recommended conceptual states:

```text
PENDING
   ↓
AVAILABLE
   ↓
RESERVED
   ↓
PROCESSING
   ↓
PAID
```

Additional states may include:

`HELD`, `REVERSED`, `CANCELLED`, `FAILED`, `RETURNED`, `DISPUTED`.

Reconcile this with the existing wallet/ledger rather than creating another wallet.

---

## 6. Withdrawal State Machine

A withdrawal should have an explicit lifecycle:

```text
REQUESTED
    ↓
ELIGIBILITY CHECK
    ↓
APPROVED
    ↓
BATCHED
    ↓
PROCESSING
    ↓
PAID
```

Failure paths:

```text
REQUESTED → REJECTED
PROCESSING → FAILED → RETRY / RETURN / REVIEW
```

Possible states:

- requested
- pending_review
- approved
- rejected
- batched
- processing
- paid
- failed
- cancelled
- reversed
- returned
- disputed

Use one authoritative state machine.

---

## 7. Prevent Double Withdrawal

A balance must not be spendable by two simultaneous withdrawal requests.

Example:

```text
Balance = $100

Request A → $100
Request B → $100
```

Only one can reserve the available funds.

Use database transactions, locking/concurrency controls, or an equivalent safe mechanism.

**Invariant:**

> A unit of available wallet value can only be committed to one withdrawal at a time.

---

## 8. Withdrawal Reservation

When a withdrawal is accepted, its amount must become unavailable for another withdrawal.

```text
AVAILABLE
    ↓
RESERVED FOR WITHDRAWAL
    ↓
PROCESSING
    ↓
PAID
```

If the payout fails before money leaves Akọ, the reserved funds must be returned through an auditable ledger operation.

Never repair balances with arbitrary balance increments.

---

## 9. Immutable Financial Ledger

Wallet balances must not be the sole source of truth.

The ledger should reconstruct:

- Source of funds
- User
- Amount
- Currency
- Transaction ID
- Timestamp
- Transaction type
- Status
- Related gift/purchase/reward/commission
- Withdrawal ID
- Provider reference
- Reversal information
- Settlement information

Conceptually:

```text
Financial Event
      ↓
Ledger Entry
      ↓
Wallet State
      ↓
Withdrawal
      ↓
Provider
      ↓
Settlement Record
```

Users must never edit ledger records.

---

## 10. Financial Invariants

At minimum:

```text
available_balance >= 0
```

and wallet state must reconcile with the authoritative ledger.

Test:

- No withdrawal spends more than available funds.
- No withdrawal is paid twice.
- No webhook creates a duplicate payout.
- Failed payouts do not silently destroy funds.
- Users cannot modify authoritative balances.
- Every paid withdrawal has an auditable trail.
- Ledger and wallet state can be reconciled.

---

## 11. Payout Destination

Users need a supported external payout destination.

Depending on Akọ's selected provider and launch markets, this may include:

- Bank account
- Supported bank-transfer destination
- Other provider-supported methods

Do not invent unsupported methods. The implementation must follow the actual payment provider.

Payout destination data must be kept separate from wallet balances.

---

## 12. Destination Verification

Where supported and appropriate, verify payout destinations.

Audit:

- Account ownership/verification
- Provider validation
- Name matching where required
- Destination status
- Destination changes
- Cooldown/risk controls after changing payout details

A large withdrawal immediately after changing payout details may require additional review.

---

## 13. Sensitive Financial Information

Protect payout information.

Do not:

- Log full bank details unnecessarily
- Return unnecessary bank information to clients
- Put sensitive financial information in analytics
- Put provider secrets in frontend code
- Store more financial data than necessary

Use provider-managed tokens/identifiers where appropriate.

---

## 14. Friday Processing

The Friday workflow should be explicit:

```text
Withdrawal window
      ↓
Requests accepted
      ↓
Cut-off
      ↓
Eligibility snapshot
      ↓
Risk / fraud checks
      ↓
Approved withdrawals
      ↓
Payout batch
```

Define behavior for:

- Requests before cut-off
- Requests after cut-off
- Provider downtime
- Public holidays
- Exceptional incidents

---

## 15. Saturday Payout

Saturday is the intended payout day.

```text
Approved withdrawal
       ↓
Provider request
       ↓
Provider reference
       ↓
Provider confirmation
       ↓
PAID
```

A frontend success page is not proof of settlement. Provider confirmation/webhooks should be authoritative where applicable.

Do not promise an exact arrival time when banks/providers cannot guarantee it.

---

## 16. Payout Batching

Payouts may be batched for operational efficiency.

Each batch should be traceable to:

- Batch ID
- Payout date
- Withdrawal IDs
- Total amount
- Currency
- Provider
- Batch status
- Created timestamp
- Processed timestamp
- Settlement status

Individual user payouts must remain independently auditable.

---

## 17. Payment Provider Integration

Keep privileged provider integration server-side:

```text
Akọ App
   ↓
Akọ Backend
   ↓
Payout Service
   ↓
Payment Provider
```

Never expose payout-provider secrets to the client.

---

## 18. Webhooks

If the provider supplies payout webhooks:

- Verify signatures
- Verify authenticity
- Record provider event IDs
- Process idempotently
- Handle retries safely
- Reject forged events
- Reconcile provider status with Akọ status

Never treat a frontend redirect as proof that money was transferred.

---

## 19. Idempotency

Payout creation must be idempotent.

```text
One withdrawal
      ↓
One payout
```

not:

```text
One withdrawal
      ↓
Two payouts
```

Use stable idempotency keys and/or unique provider transaction references.

Webhook processing must also be idempotent.

---

## 20. Provider Failures

Possible failures include:

- Invalid destination
- Provider outage
- Bank rejection
- Timeout
- Network failure
- Duplicate request
- Compliance/risk rejection
- Temporary provider error

Distinguish retryable from non-retryable failures where possible.

Do not blindly retry an uncertain provider operation if that could duplicate a payout.

---

## 21. Failed Payouts

If a payout fails, preserve the user's money.

```text
Reserved funds
      ↓
Payout fails
      ↓
Determine whether provider actually transferred funds
      ↓
If not transferred → return to available
```

Use an auditable ledger transition. Never manually edit the balance as a shortcut.

---

## 22. Reconciliation

Periodically reconcile:

```text
Akọ Ledger
    ↕
Wallet Balances
    ↕
Withdrawal Records
    ↕
Payout Batches
    ↕
Provider Transactions
```

Detect:

- Missing provider payouts
- Duplicate provider references
- Internal payout without external settlement
- External settlement missing internally
- Amount mismatch
- Currency mismatch
- Status mismatch
- Unexplained balance differences

Reconciliation failures must be visible to Admin/operations.

---

## 23. Admin Payout Dashboard

Audit whether Admin can see:

- Pending withdrawals
- Requested amount
- Eligible amount
- User
- Payout destination summary
- Withdrawal status
- Risk/review status
- Batch
- Provider
- Provider reference
- Payout date
- Failure reason
- Reversal status
- Reconciliation status

Sensitive information must remain access-controlled.

---

## 24. Admin Controls

Potential server-side controls:

- Payout enable/disable
- Minimum withdrawal
- Payout schedule
- Cut-off time
- Supported currencies
- Supported payout methods
- Maximum withdrawal where required
- Risk holds
- Manual review
- Provider selection
- Operational pause

Do not make frontend toggles the only enforcement.

---

## 25. Emergency Payout Kill Switch

Akọ should be able to pause new payout processing during an incident.

If disabled:

- New payouts cannot be submitted into an unprocessable state.
- Existing paid payouts remain paid.
- Already-processing payouts follow a defined provider/reconciliation procedure.
- User funds remain safe.
- Users receive an appropriate operational message.

The kill switch must not destroy balances.

---

## 26. Withdrawal Limits

Akọ may eventually need:

- Minimum per withdrawal
- Maximum per withdrawal
- Maximum per day
- Maximum per payout cycle
- Account-level limits
- Risk-based limits

Do not invent limits unnecessarily. If introduced, enforce them server-side.

---

## 27. Fees

If a withdrawal fee exists, define it explicitly.

Example:

```text
Requested: $20
Fee: $1
User receives: $19
```

or:

```text
Wallet debit: $21
Payout: $20
Fee: $1
```

Choose one accounting model and use it consistently.

If there is no Akọ withdrawal fee, provider fees must not accidentally become an undocumented user charge.

---

## 28. Currency Precision

Use appropriate fixed-precision monetary representation.

Do not use ordinary JavaScript floating-point arithmetic for authoritative money calculations.

Micro-earnings should use controlled internal precision.

Round only at defined accounting boundaries.

Document rounding rules.

---

## 29. Earnings Settlement

Different earning sources may have different settlement rules.

Conceptually:

```text
Gift → settlement → available

Give Back → fraud/reward settlement → available

Affiliate commission → purchase settlement → available
```

The payout engine consumes the unified authoritative wallet state while preserving the source and settlement history.

---

## 30. Give Back Integration

Give Back ultimately flows into the same wallet/payout architecture:

```text
Promotion
   ↓
Verified engagement
   ↓
Reward points
   ↓
Give Back pool
   ↓
User allocation
   ↓
Wallet ledger
   ↓
Settlement / eligibility
   ↓
Available balance
   ↓
Withdrawal
   ↓
Saturday payout
```

Give Back must not create a parallel unofficial balance.

---

## 31. Gift Integration

Gifts follow the same financial architecture:

```text
Sender wallet
      ↓
Gift transaction
      ↓
Recipient wallet
      ↓
Settlement rules
      ↓
Available balance
      ↓
Withdrawal
```

The recipient does not need to manually accept a gift. The financial transfer must be atomic and auditable.

---

## 32. Affiliate Integration

Affiliate commissions use the same wallet/payout system:

```text
Buyer purchase
      ↓
Attribution
      ↓
Commission
      ↓
Pending
      ↓
Settlement
      ↓
Available wallet balance
      ↓
Withdrawal
```

Affiliate commissions should not become withdrawable before applicable settlement rules are satisfied.

---

## 33. One Wallet, One Financial Truth

Avoid fragmented unofficial balances.

Prefer:

```text
Akọ Wallet
   ↓
Authoritative Ledger
   ├── Gift credits
   ├── Give Back credits
   ├── Creator earnings
   ├── Affiliate commissions
   └── Other approved earnings
```

Different sources can have different settlement states while reconciling into one financial architecture.

---

## 34. Refunds and Chargebacks

When a source transaction is reversed after earnings were credited, define how the reversal interacts with the wallet.

Possible controls include:

- Pending periods
- Reserve balances
- Reversal against future earnings
- Account holds
- Manual review

Do not silently create unreconciled negative money.

The final mechanism must be explicit before production.

---

## 35. Fraud and Abuse

Payouts create direct financial incentives for abuse.

Audit for:

- Multiple accounts
- Account takeover
- Stolen payout destinations
- Synthetic engagement
- Reward farming
- Gift abuse
- Affiliate abuse
- Fake purchases
- Refund abuse
- Rapid withdrawal after suspicious earnings
- Coordinated accounts
- Suspicious device/network patterns where appropriate
- Repeated failed payouts
- Payout destination changes immediately before withdrawal

Use layered controls, not one fraud rule.

---

## 36. Payout Holds

A withdrawal may be held for:

- Fraud investigation
- Payment reversal risk
- Suspicious activity
- Account security review
- Compliance requirements
- Provider review

A hold is not deletion of funds.

The ledger should explicitly show the state transition.

---

## 37. Account Takeover Protection

Payout security depends on account security.

Audit:

- Authentication
- Session management
- Password reset
- Email verification
- Device/session management
- Payout destination changes
- Reauthentication for sensitive actions where appropriate
- Suspicious login detection
- Rate limiting

An attacker who gains account access must not automatically gain unrestricted access to money.

---

## 38. Withdrawal Confirmation

Before submission, show enough information to understand:

- Amount
- Destination summary
- Fee if applicable
- Expected payout day
- Currency
- Relevant processing message

Do not expose internal risk scoring or fraud rules.

---

## 39. Withdrawal History

Users should be able to see their own:

- Date
- Amount
- Destination summary
- Status
- Provider/reference information where appropriate
- Failure/reversal status
- Fee

Never expose another user's payout information.

---

## 40. Notifications

Potential notifications:

- Withdrawal requested
- Withdrawal approved
- Withdrawal processing
- Payout sent
- Payout completed
- Payout failed
- Payout returned
- Withdrawal placed on hold where appropriate

Notifications are not the financial source of truth.

---

## 41. RLS and Authorization

Users should access only their own:

- Wallet information
- Withdrawal requests
- Payout history
- Appropriate payout-destination information

Users must not be able to:

- Modify another user's balance
- Modify another user's payout
- Mark a payout paid
- Edit ledger entries
- Change payout status
- Create fake withdrawals
- Modify provider references
- Modify settlement amounts

Privileged financial operations remain server-side.

---

## 42. Malicious Client Testing

Treat the client as hostile.

Attempt to manipulate:

```text
withdrawal amount
wallet balance
minimum threshold
withdrawal status
payout date
payout destination
provider reference
transaction ID
currency
fees
eligibility
```

Also test:

- Duplicate requests
- Concurrent requests
- Replay attacks
- Forged webhook events
- Modified local storage
- Manipulated UI state
- Expired sessions
- Unauthorized user IDs

The backend must reject unauthorized or inconsistent operations.

---

## 43. Concurrency Testing

Test:

```text
Two withdrawals at exactly the same time
```

```text
Withdrawal + wallet credit at exactly the same time
```

```text
Withdrawal + reversal at exactly the same time
```

```text
Two identical provider webhooks
```

The ledger and wallet must remain correct.

---

## 44. Scheduled Jobs

If Friday/Saturday processing uses scheduled backend jobs, audit:

- Job authentication
- Duplicate execution
- Retries
- Partial completion
- Provider failures
- Timeouts
- Observability
- Idempotency

A scheduled job must be safe to run twice.

---

## 45. Operational Monitoring

Admin/engineering should monitor:

- Withdrawal volume
- Total requested
- Total approved
- Total paid
- Total failed
- Total held
- Total returned
- Payout latency
- Provider errors
- Reconciliation mismatches
- Suspicious activity
- Pending withdrawal age
- Batch status

Financial anomalies should be detectable before users report them.

---

## 46. Provider Liquidity and Reliability

Akọ should not promise payouts it cannot operationally fulfill.

Account for:

- Provider settlement timing
- Operational liquidity
- Transfer limits
- Provider outages
- Bank processing delays
- Weekends/holidays
- Currency availability

The Saturday promise should reflect what Akọ can reliably support.

---

## 47. Saturday as a Product Event

The weekly rhythm can become part of the Akọ experience:

```text
Monday → earn
Tuesday → earn
Wednesday → earn
Thursday → earn
Friday → withdraw
Saturday → receive
```

The experience should be predictable without promising an exact arrival time that external providers cannot guarantee.

---

## 48. Audit the Existing Code First

Before implementing or modifying payout infrastructure, inspect:

- Wallet schema
- Ledger schema
- Transaction schema
- Payment provider
- Webhook handlers
- Withdrawal tables
- User payout details
- Admin pages
- Scheduled functions/jobs
- RLS policies
- Edge Functions
- Server-side authorization
- Idempotency
- Reconciliation
- Notifications
- Existing financial tests

Do not create duplicate infrastructure when an existing system is already stronger.

---

## 49. Preserve Stronger Existing Implementations

If the codebase already has a stronger:

- Ledger
- Payout provider abstraction
- State machine
- Idempotency layer
- Reconciliation system
- Fraud system
- Admin interface

keep it.

This document describes intended product behavior; it does not require replacing superior engineering.

---

## 50. Definition of Done

The payout audit is complete when:

- Current wallet implementation has been inspected.
- Current ledger has been inspected.
- Current payment provider has been inspected.
- Current withdrawal implementation has been inspected.
- Existing correct systems have been preserved.
- Friday withdrawal workflow is implemented/audited.
- Saturday payout workflow is implemented/audited.
- Minimum withdrawal is server-authoritative.
- Available/pending/held/reserved funds are clearly defined.
- Withdrawal state machine is explicit.
- Concurrent withdrawals are safe.
- Funds are reserved atomically.
- Payout processing is idempotent.
- Provider webhooks are verified and idempotent.
- Failed payouts preserve funds.
- Reconciliation exists.
- Admin can observe payout state.
- Payout controls are server-side.
- Sensitive financial data is protected.
- RLS has been audited.
- Malicious-client testing has been performed.
- Concurrency testing has been performed.
- Financial invariants have been tested.
- Give Back uses the same wallet/ledger.
- Gifts use the same wallet/ledger.
- Affiliate earnings use the same wallet/ledger.
- Payout history is available to users.
- Notifications reflect authoritative state.
- Operational failures are observable.
- Every payout can be reconstructed and audited.
- No duplicate payout path exists.

---

## 51. Final Principle

Akọ's payout experience should feel simple:

> **When I earn, it enters my wallet. When I'm eligible, I request withdrawal. Akọ processes it. I receive my money.**

Underneath that simplicity:

> **Every naira/dollar must have a source, every balance change must have a ledger entry, every withdrawal must be uniquely identifiable, every payout must be reconciled, and no client request should ever be capable of creating money or paying money twice.**

The goal is not merely to make payouts work.

The goal is to make Akọ's financial system **trustworthy enough to operate at scale.**
