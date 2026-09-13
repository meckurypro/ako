# AKỌ — END-TO-END ENCRYPTED PRIVATE MESSAGING
## Security, Cryptographic Architecture, UX Reassurance & Implementation Audit Specification

**Status:** Pre-launch security/product specification  
**Priority:** Critical  
**Scope:** Akọ private 1:1 messaging first; architecture must not prevent future group and multi-device messaging  
**Primary goal:** Make private Akọ chats genuinely end-to-end encrypted so that Akọ's servers do not possess the keys required to read message content.

---

# 1. PRODUCT INTENT

Akọ should treat private conversations differently from public social content.

Public posts, comments, Projects and other platform content may require normal moderation, reporting and platform operations.

Private chat should be designed around a much stronger privacy boundary:

> **Akọ should not be able to read the contents of users' private conversations.**

This is not the same as encrypting data in Supabase or using HTTPS.

The target is true **end-to-end encryption (E2EE)**:

- The sender's device encrypts the message.
- Akọ transports and stores ciphertext.
- The recipient's device decrypts the message.
- The server does not possess the private keys required to decrypt ordinary chat content.

Do not implement a fake or cosmetic version of E2EE.

Do not describe server-side encryption, database encryption, TLS, or encrypted-at-rest storage as end-to-end encryption.

---

# 2. IMPORTANT: AUDIT BEFORE IMPLEMENTATION

Claude MUST act as:

- senior security engineer
- applied cryptography engineer
- messaging-systems architect
- veteran frontend/mobile engineer
- Supabase/Postgres security engineer
- privacy-focused product designer

Before changing code:

1. Read the entire existing messaging implementation.
2. Inspect every chat-related route/page/component.
3. Inspect message creation, editing, deletion and delivery flows.
4. Inspect Supabase tables, functions, triggers, policies and RLS.
5. Inspect realtime subscriptions.
6. Inspect file/media upload flows.
7. Inspect push notification payloads.
8. Inspect local storage/cache/state management.
9. Inspect authentication/session/device handling.
10. Inspect existing encryption utilities, if any.
11. Search the entire repository for plaintext message persistence.
12. Search logs, analytics, error reporting and debugging code for message content.
13. Inspect admin tooling for any ability to read private messages.
14. Inspect moderation/reporting behavior.
15. Inspect backups and database export behavior.
16. Inspect web/native architecture and determine where cryptographic operations can safely run.
17. Identify what already works well.
18. Preserve stronger existing architecture.
19. Do NOT blindly rebuild the messaging system.

Produce an internal audit before implementation.

---

# 3. CRYPTOGRAPHY RULE: DO NOT INVENT CRYPTOGRAPHY

This is non-negotiable.

Claude MUST NOT invent:

- a proprietary encryption algorithm
- a custom key-exchange protocol
- a home-grown ratchet
- custom cryptographic primitives
- ad-hoc password-based encryption
- a "simple AES chat encryption" system presented as E2EE

Use a mature, documented, independently reviewed protocol/library appropriate for the actual Akọ platform.

The preferred direction is the **Signal protocol family / established Signal-derived implementations**, because it is specifically designed for secure asynchronous messaging.

Relevant concepts include:

- identity keys
- prekeys
- authenticated key agreement
- Double Ratchet-style message-key evolution
- session state
- replay protection
- device identity
- safety/security verification
- multi-device session management

The exact library must be selected based on:

- React/web compatibility
- Android/iOS compatibility
- native app architecture
- library maintenance
- security review history
- licensing
- platform support
- interoperability requirements
- persistence model
- multi-device support
- group messaging roadmap

Do not choose a library merely because it is easy to install.

Document the final cryptographic dependency and why it was selected.

---

# 4. TARGET TRUST MODEL

The intended trust model is:

## Sender device

Trusted to:

- hold private identity/session keys
- encrypt outgoing content
- decrypt incoming content
- securely store local cryptographic state

## Recipient device

Trusted to:

- hold private identity/session keys
- decrypt incoming content
- encrypt replies

## Akọ backend

Trusted to:

- authenticate accounts
- route encrypted messages
- store ciphertext
- manage public/prekey material
- enforce authorization
- manage delivery state
- prevent abuse
- manage metadata necessary for the service

NOT trusted with:

- message plaintext
- private identity keys
- session secrets
- message decryption keys

## Supabase/Postgres

Should contain only what the server legitimately needs.

The database must not become a hidden plaintext archive of private conversations.

---

# 5. BASIC MESSAGE FLOW

Target architecture:

```text
SENDER DEVICE

User types:
"How are you?"

        ↓

Local plaintext
        ↓

E2EE session / message key
        ↓

LOCAL ENCRYPTION
        ↓

Ciphertext
        ↓
────────────────────────────
       AKỌ BACKEND
────────────────────────────
        ↓
Store / route ciphertext
        ↓
Recipient delivery
        ↓

RECIPIENT DEVICE

Ciphertext
        ↓
LOCAL DECRYPTION
        ↓
Plaintext:
"How are you?"
```

At no point should the ordinary server request need to contain:

```text
"How are you?"
```

as message content.

---

# 6. MESSAGE DATABASE DESIGN

Audit the existing schema.

A target message record may contain concepts such as:

- message ID
- conversation ID
- sender device/account reference
- recipient/device routing information as required
- ciphertext
- encrypted attachment references
- protocol/version metadata
- delivery state
- created timestamp
- expiration metadata if supported
- message type needed for routing
- cryptographic envelope/version

It should NOT contain:

- plaintext message body
- plaintext voice transcript
- plaintext attachment content
- plaintext private notes
- private encryption keys
- session secrets

If the current database stores plaintext, migrate carefully.

Do not simply add a ciphertext column while continuing to maintain plaintext as a fallback.

---

# 7. IDENTITY KEYS

Each messaging device should have a cryptographic identity.

The private identity key:

- must be generated securely on the device
- must never be sent to Akọ
- must never be placed in normal database rows
- must never be logged
- must never be included in analytics
- must never be exposed to client-visible API responses unnecessarily

Public identity material may be registered with the backend as required by the chosen protocol.

Device identity must be distinct from:

- user password
- Supabase auth token
- user ID
- session cookie
- access token

Do not use a Supabase JWT as an E2EE encryption key.

---

# 8. KEY GENERATION

Use the secure cryptographic primitives provided by the selected mature library/platform.

Do not use:

```text
Math.random()
```

for cryptographic key generation.

Do not derive message encryption keys from:

- usernames
- phone numbers
- email addresses
- user IDs
- passwords alone
- predictable timestamps

Keys must have cryptographically secure randomness.

---

# 9. ASYNCHRONOUS SESSION ESTABLISHMENT

Akọ chat must continue to work when the recipient is offline.

The architecture should therefore support the chosen protocol's asynchronous session-establishment mechanism.

This commonly requires some combination of:

- identity public keys
- signed prekeys
- one-time prekeys
- prekey replenishment
- authenticated key agreement
- session state

Claude must inspect the selected implementation's exact requirements rather than approximating them.

---

# 10. MESSAGE KEY EVOLUTION

Do not encrypt every message in a conversation using one permanent symmetric key.

Use the selected mature protocol's message-key evolution / ratcheting mechanism.

Goals include:

- unique message encryption keys
- forward secrecy properties
- compromise recovery properties where supported
- protection against replay
- protection against message reordering where supported
- safe handling of delayed messages
- safe handling of duplicated messages

Claude must document the security properties actually provided by the selected library.

Do not claim stronger properties than the library actually provides.

---

# 11. DEVICE KEYS ARE NOT ACCOUNT PASSWORDS

The account authentication system and messaging cryptography are separate layers.

A user may authenticate to Akọ through:

- email/password
- OAuth
- another supported auth method

That does not mean the server should receive or reconstruct their E2EE private keys.

Claude must explicitly map:

```text
Akọ account identity
        ≠
messaging device identity
        ≠
messaging private key
```

---

# 12. MULTI-DEVICE ARCHITECTURE

Even if V1 supports one primary device, do not design the protocol in a way that makes future multi-device support impossible.

Future devices may include:

- Android
- iPhone
- web
- desktop

Each device should have its own cryptographic identity/session state where required.

Do not simply copy one device's private key to every device through the server.

If device linking is later implemented, design it around authenticated secure device provisioning.

---

# 13. DEVICE CHANGE / KEY CHANGE

The user must be protected against silent identity changes.

If a contact:

- reinstalls the app
- adds a new device
- loses a device
- changes cryptographic identity

the system should have a defined behavior.

At minimum:

- detect identity changes where the selected protocol supports detection
- invalidate/re-establish sessions appropriately
- provide a user-visible security notice when appropriate
- never silently pretend that the old identity and new identity are identical

Future implementation may include:

- security codes
- QR verification
- safety numbers
- verified-device indicators

Do not invent terminology that implies verification happened when it did not.

---

# 14. MESSAGE CONTENT

The following should be treated as private message content:

- text
- replies
- quoted messages where applicable
- voice notes
- images
- videos
- documents
- files
- audio
- other user-generated private chat content

Encrypt content before server upload/transmission whenever the content is intended to be private.

---

# 15. ATTACHMENTS MUST ALSO BE E2EE

This is critical.

Do NOT implement:

```text
Text → encrypted
Photo → ordinary Supabase Storage upload
```

and then claim the chat is fully E2EE.

Instead:

```text
Photo
  ↓
Encrypt locally
  ↓
Ciphertext attachment
  ↓
Storage
  ↓
Recipient downloads ciphertext
  ↓
Recipient decrypts locally
```

The backend should not need the attachment plaintext.

Apply this to:

- photos
- videos
- documents
- audio
- voice notes
- other private files

---

# 16. ATTACHMENT KEYS

Use the selected mature protocol/library's established approach for encrypting message attachments.

Do not invent an attachment-key exchange mechanism without expert cryptographic review.

If the library does not provide a complete attachment solution, use a well-reviewed construction appropriate to the protocol and document it.

Attachment encryption should include appropriate:

- authenticated encryption
- integrity protection
- unique nonces/IVs as required
- key separation
- replay/tampering handling

Never reuse encryption material incorrectly.

---

# 17. MESSAGE INTEGRITY

Encryption alone is not enough.

Messages must also have integrity/authentication protection through the selected protocol.

The recipient should be able to detect:

- tampered ciphertext
- invalid authentication
- corrupted encrypted content
- invalid session state
- malformed protocol messages

The app must fail safely.

Do not display partially decrypted or unverified content as trusted.

---

# 18. REPLAY PROTECTION

A malicious client must not be able to repeatedly submit an old valid encrypted message and cause it to appear as a new message.

Implement or preserve replay protections provided by the selected protocol.

The backend should also enforce:

- message IDs
- idempotency where appropriate
- duplicate delivery protection
- sane message sequencing/state handling

Do not rely only on the UI.

---

# 19. SERVER-SIDE AUTHORIZATION

E2EE does NOT eliminate normal application security.

Supabase RLS must still prevent:

- arbitrary users reading ciphertext belonging to other conversations
- arbitrary users inserting into other conversations
- unauthorized deletion
- unauthorized delivery-state manipulation
- unauthorized attachment access
- unauthorized conversation membership changes

The fact that content is encrypted is not an excuse for weak authorization.

---

# 20. SUPABASE RLS AUDIT

Audit:

- conversations
- conversation_members
- devices
- public key/prekey tables
- encrypted messages
- encrypted attachments
- message delivery states
- message reactions if applicable
- read states
- typing/presence states
- blocks
- reports
- deletes
- device registration

Test both:

1. legitimate client behavior
2. malicious direct API/database attempts

A malicious client should not be able to read another user's ciphertext simply because it knows a conversation ID.

---

# 21. REALTIME

If Akọ uses Supabase Realtime:

Realtime should transport encrypted payloads.

The server-side event should not require plaintext message bodies.

Audit:

- INSERT events
- delivery events
- read receipts
- typing indicators
- presence
- reconnect behavior
- duplicate events
- out-of-order events
- offline recovery

Do not accidentally decrypt messages on a server-side realtime handler.

---

# 22. PUSH NOTIFICATIONS

Push notifications are a common E2EE leak.

Do NOT send:

```text
"Emeka: I need the money tomorrow."
```

through a normal push payload.

Prefer a generic notification such as:

> New message

or:

> You have a new message

where appropriate.

The device can then retrieve the encrypted message and decrypt locally.

Audit notification previews on:

- Android
- iOS
- web
- lock screen
- notification history
- wearable integrations where applicable

User notification settings should determine whether previews are shown.

Do not leak plaintext through analytics or notification services.

---

# 23. LOCAL STORAGE

Private decrypted messages may exist on the user's device because the chat UI needs to display them.

Audit local persistence carefully.

Private message data should not casually be stored in:

- plaintext localStorage
- unprotected IndexedDB
- debug files
- analytics caches
- crash dumps
- ordinary logs

Use secure platform-appropriate storage for cryptographic secrets.

For web, carefully evaluate the actual threat model and browser storage limitations. Do not falsely claim hardware-backed secure storage where it is not available.

---

# 24. MEMORY / DEBUGGING

Audit for accidental plaintext leakage through:

- console.log
- debug statements
- network inspection helpers
- error objects
- crash reports
- analytics events
- performance traces
- development-only logging
- React state debugging
- Supabase logs
- Edge Function logs
- server error logs

Search the repository for:

```text
console.log(message
console.log(content
console.log(body
logger.*message
logger.*content
```

and equivalent patterns.

Development logging must not become production privacy leakage.

---

# 25. ADMIN MUST NOT HAVE A SECRET CHAT READER

Akọ Admin should not contain:

- "View user chats"
- "Read private message"
- "Search private messages"
- "Open conversation"
- hidden support-panel access to plaintext

if the goal is true E2EE.

Admin should still be able to manage legitimate metadata required to operate the service.

For example:

- account status
- abuse reports
- delivery health
- message counts
- rate-limit state
- storage usage
- conversation IDs where operationally necessary

But not the plaintext of ordinary private conversations.

---

# 26. REPORTING A MESSAGE

E2EE creates an important product question.

If a user reports a message, the app can allow the reporting user to explicitly submit selected content for moderation.

Example:

```text
User chooses:
Report message

        ↓

Akọ explains:
"To report this message, its content will be
shared with Akọ for review."

        ↓

User confirms

        ↓

Selected content is intentionally submitted
for moderation
```

This preserves the principle that Akọ cannot silently inspect everyone's private conversations.

Do not build a hidden server-side plaintext inspection channel merely for moderation convenience.

---

# 27. BLOCKING

Blocking must continue to work with E2EE.

A blocked user should not be able to:

- send new messages where policy says they should be prevented
- initiate unauthorized new sessions
- access private content through another route

The server can enforce account-level blocking without reading message content.

---

# 28. DELETING MESSAGES

Define:

- delete for me
- delete for everyone, if supported
- retention behavior
- encrypted storage deletion
- local cache deletion
- attachment deletion
- notification behavior

Important:

Deleting server ciphertext does not necessarily erase:

- screenshots
- exported files
- copies on recipient devices
- OS-level backups
- notification history

The UX must not promise impossible deletion guarantees.

---

# 29. BACKUPS

Do not accidentally destroy E2EE by implementing ordinary server-readable chat backups.

If chat backup is introduced:

1. Design it separately.
2. Decide whether backup is also E2EE.
3. Ensure the server does not receive the backup encryption key in plaintext.
4. Define recovery carefully.
5. Document what happens if the user loses the recovery material.

Possible future approaches include:

- device-to-device transfer
- encrypted backup protected by user-controlled recovery material
- secure recovery mechanisms

Do not create a server-readable "backup for convenience" and continue claiming that all chat content is inaccessible to Akọ.

---

# 30. ACCOUNT RECOVERY

Account recovery is a security/product tradeoff.

If a user loses all devices and all cryptographic recovery material, Akọ may not be able to recover old private conversations.

That is not necessarily a defect.

Do not weaken E2EE merely so that:

> "Forgot password" restores every old chat automatically.

Separate:

```text
Account access recovery
```

from:

```text
Cryptographic message recovery
```

and document the difference.

---

# 31. USER-FACING SECURITY REASSURANCE

Akọ should have a subtle system message near the beginning of a private conversation.

The user-provided WhatsApp reference shows the desired interaction pattern:

- subtle system card
- lock icon
- short reassurance
- centered typography
- low visual weight
- "Learn more" affordance
- reassurance appears as part of the conversation rather than as a giant security warning

Use the reference as a UX pattern, NOT as something to copy literally.

Akọ should have its own language and visual identity.

---

# 32. RECOMMENDED AKỌ CHAT MESSAGE

Primary recommendation:

> 🔒 **Messages are end-to-end encrypted.**  
> Only the people in this chat can read them.  
> **Learn more**

A slightly warmer alternative:

> 🔒 **This chat is private.**  
> Messages are end-to-end encrypted and can only be read by the people in this chat.  
> **Learn more**

The second version feels more human.

The first is clearer and closer to established messaging conventions.

Claude should test both against the actual Akọ chat UI and choose the one that fits the interface best.

---

# 33. IMPORTANT WORDING RULE

Only claim what the implementation actually guarantees.

Do not write:

> "No one can ever access your messages."

That is too absolute because:

- the recipient can screenshot/copy them
- a compromised device can expose them
- a reported message can be intentionally submitted
- backups may have separate behavior
- metadata may still exist
- future features may change the trust model

Prefer:

> "Messages are end-to-end encrypted. Only the people in this chat can read them."

If the architecture truly supports the stronger statement:

> "Akọ can't read your messages."

may be used as secondary explanatory copy.

Claude must verify the claim before shipping it.

---

# 34. LEARN MORE PAGE / WEBMASTER PREPARATION

The user intends to later create an Akọ "webmaster" / public information website containing:

- FAQ
- Privacy Policy
- Security
- E2EE explanation
- Terms
- Help
- other public trust/documentation pages

Do NOT build the entire webmaster now unless separately requested.

However, structure the chat's "Learn more" affordance so it can eventually route to an Akọ public security/privacy page.

Potential future information architecture:

```text
ako website
│
├── FAQ
├── Privacy
├── Security
│   └── End-to-end encryption
├── Terms
└── Help
```

The chat UI should not hard-code an architecture that makes this difficult later.

---

# 35. LEARN MORE CONTENT DIRECTION

Future E2EE explainer should answer simply:

### What does end-to-end encryption mean?

Messages are encrypted on your device before they leave it and decrypted only on the devices of people in the conversation.

### Can Akọ read my private chats?

Under the intended architecture, Akọ does not have the private keys needed to decrypt ordinary private messages.

### What about photos and files?

Private chat attachments are encrypted before they are uploaded.

### What about notifications?

Notification previews should not expose message content through ordinary push payloads.

### What about reports?

If you choose to report a message, the content you intentionally submit can be reviewed.

### What about screenshots?

E2EE cannot prevent another person from copying, photographing, or screenshotting information they can see.

This page can be expanded later.

---

# 36. CHAT UI DESIGN PRINCIPLES

The security reassurance should be:

- subtle
- calm
- trustworthy
- readable
- not alarming
- not oversized
- visually integrated
- dismissible only if that fits the chosen UX
- accessible
- consistent with Akọ's design system

Do not make it look like:

- an error
- a warning
- a legal disclaimer
- a promotional banner

It should feel like a quiet statement of how the room works.

---

# 37. AKỌ VISUAL DIRECTION

Preserve the existing Akọ visual language.

Do not copy WhatsApp's:

- exact colors
- exact typography
- exact card shape
- exact illustration
- exact wording
- exact layout

Instead, translate the principle into Akọ:

- soft
- light
- culturally coherent
- understated
- premium
- uncluttered

The user specifically values UI that feels:

> **neat, easy to reach, soft and light.**

The encryption notice should follow that standard.

---

# 38. SECURITY ICON

A small lock icon is appropriate.

It should not dominate the chat.

Possible pattern:

```text
        🔒
Messages are end-to-end encrypted.
Only people in this chat can read them.
              Learn more
```

Claude should use the existing Akọ iconography where possible.

Do not introduce an unrelated icon family just for this component.

---

# 39. MESSAGE UI PLACEMENT

Preferred placement:

- near the beginning of a new private conversation
- before the user's first messages if appropriate
- within the chronological chat stream as a system message
- not permanently occupying the composer area
- not as a persistent top navigation banner unless the existing UX strongly benefits from it

The notice should not reduce useful conversation space after the user understands it.

---

# 40. FIRST-OPEN EXPERIENCE

When a conversation is opened for the first time:

```text
Conversation header

        ↓

Security reassurance

        ↓

Messages

        ↓

Composer
```

If the conversation already contains history, the notice should be positioned according to the established message timeline rather than awkwardly floating over content.

Avoid repeating the notice every time the user opens the same conversation.

---

# 41. LEARN MORE INTERACTION

The "Learn more" action may eventually open:

- an in-app bottom sheet
- an in-app information page
- the future Akọ Security/E2EE webpage

For V1, use the cleanest architecture already present.

Do not create a new navigation system merely for this.

The user should be able to close the explanation and immediately return to the chat.

---

# 42. CRYPTOGRAPHIC STATE PERSISTENCE

Session state must survive normal app usage without exposing secrets.

Audit:

- app restart
- browser refresh
- device sleep
- network disconnect
- backgrounding
- reconnect
- token refresh
- logout
- login
- device migration

The exact persistence mechanism must follow the selected cryptographic library's security model.

Do not serialize sensitive cryptographic state into ordinary server-visible profile fields.

---

# 43. LOGOUT BEHAVIOR

Define what logout means for:

- local decrypted message cache
- device identity
- session state
- cryptographic keys
- incoming messages
- notification handling

Do not accidentally delete necessary cryptographic state during every routine authentication refresh.

Conversely, do not leave sensitive keys exposed indefinitely after a user intentionally removes a device.

---

# 44. COMPROMISED DEVICE MODEL

E2EE protects the transport/server boundary.

It cannot protect a device that is already compromised.

Do not promise otherwise.

The security documentation should explain that:

> E2EE protects messages while they travel between participants and while stored as ciphertext on the service, but a compromised device can still expose information after it has been decrypted.

---

# 45. METADATA MINIMIZATION

E2EE protects content, not necessarily metadata.

Audit what Akọ actually stores about:

- sender
- recipient
- timestamps
- message size
- delivery state
- read state
- device IDs
- IP/network information
- push tokens
- attachments
- conversation membership

Collect only what is required.

Do not claim:

> "Akọ cannot know anything about your chats."

unless that is actually true.

---

# 46. MESSAGE SEARCH

Server-side plaintext search should NOT be used for E2EE private messages.

If message search is eventually supported:

- consider local-only search
- index decrypted local content
- understand browser/device storage risks
- do not upload plaintext search indexes

Do not implement server-side:

```text
WHERE message_body ILIKE '%word%'
```

for E2EE messages.

---

# 47. MESSAGE PREVIEWS

Audit every place where message text might appear:

- chat list
- notifications
- lock screen
- email
- activity feed
- search
- browser title
- browser notification
- recent apps
- analytics
- admin dashboard
- moderation dashboard

The chat list may need a local decrypted preview.

Do not send that preview to the backend unnecessarily.

---

# 48. CHAT LIST ARCHITECTURE

If the chat list currently displays:

> Emeka — "I think the course should..."

ensure that this preview is generated locally when possible.

The server should not need plaintext merely to display the user's own chat list.

If server-side unread counts are needed, they can be maintained without message plaintext.

---

# 49. TYPING INDICATORS

Typing indicators do not need message plaintext.

They can remain ordinary realtime metadata.

But audit:

- authorization
- spam/rate limiting
- privacy
- blocked users
- offline behavior

Do not accidentally mix typing payloads with encrypted message content.

---

# 50. READ RECEIPTS

Read receipts are metadata, not message content.

If supported, define:

- who can see them
- whether they can be disabled
- behavior for blocked users
- delivery/read state

Do not claim that read receipts are E2EE-protected simply because the message content is.

They may be encrypted or protected in transit, but their exact privacy behavior is a separate design question.

---

# 51. VOICE NOTES

Voice notes must be encrypted before server storage/delivery.

Do not upload raw audio and then encrypt a message containing the audio URL.

Correct direction:

```text
Microphone
 ↓
Audio file
 ↓
Local encryption
 ↓
Encrypted attachment
 ↓
Storage
 ↓
Recipient download
 ↓
Local decryption
 ↓
Playback
```

---

# 52. MEDIA PROCESSING

Be extremely careful with server-side processing.

If the server currently:

- generates thumbnails
- transcodes video
- compresses images
- extracts metadata
- scans audio
- generates previews

then true E2EE may be compromised if those operations require plaintext.

Move processing client-side where practical.

Where a server-side operation is unavoidable, document exactly what content is exposed and whether that feature is compatible with the E2EE promise.

Do not silently weaken the privacy model.

---

# 53. IMAGE THUMBNAILS

If private image messages are E2EE:

- generate thumbnails locally where practical
- encrypt the thumbnail if it leaves the device
- do not upload plaintext thumbnails as a hidden shortcut

Audit image caching separately.

---

# 54. DOCUMENT PREVIEWS

PDF/document previews can leak content.

If private documents are E2EE:

- avoid server-side plaintext document preview generation
- render locally where practical
- cache securely
- clean up temporary plaintext files where possible

---

# 55. AUDIO / VIDEO CALLS

Do not automatically claim that calls are E2EE simply because messages are.

Calls require a separate media security architecture.

If Akọ does not yet implement E2EE calling, the UI must not say:

> "Messages and calls are end-to-end encrypted."

Instead say:

> "Messages are end-to-end encrypted."

Only extend the claim to calls after the calling architecture has been independently audited.

---

# 56. GROUP CHAT FUTURE-PROOFING

If groups are already present or planned:

Do not simply extend a 1:1 encryption implementation without reviewing the group protocol.

Group E2EE introduces:

- membership changes
- sender authentication
- key distribution
- key rotation
- new member access
- removed member access
- historical message access
- device changes
- group state synchronization

Use an established group messaging construction/protocol rather than inventing one.

---

# 57. GROUP MEMBER REMOVAL

Future group E2EE must define:

If Alice is removed from a group, can Alice decrypt future messages?

The expected answer should normally be no.

That requires appropriate key/session rotation.

Do not assume deleting Alice's database membership row achieves cryptographic removal.

---

# 58. NEW MEMBER ACCESS

Future groups must define whether a new member can decrypt historical messages.

This should be an explicit product/security decision.

Do not accidentally give a new device historical access simply because it receives a current group key.

---

# 59. CRYPTOGRAPHIC VERSIONING

Every encrypted payload should have a protocol/version mechanism appropriate to the selected implementation.

This allows future upgrades without ambiguity.

Do not make the application assume:

```text
version = 1 forever
```

Define migration behavior.

---

# 60. KEY ROTATION

Document:

- identity key lifecycle
- prekey replenishment
- session reset
- device replacement
- cryptographic version upgrades

Never rotate keys casually in a way that permanently destroys recoverability without a product reason.

Never keep obsolete secrets longer than necessary.

---

# 61. RANDOMNESS AND NONCES

Use only cryptographically secure randomness from the selected library/platform.

Never manually improvise nonce generation.

Never reuse nonces with encryption schemes where nonce uniqueness is required.

Let mature cryptographic libraries manage these details wherever possible.

---

# 62. PASSWORD-BASED ENCRYPTION

Do not do:

```text
messageKey = SHA256(userPassword)
```

or similar.

User passwords are not messaging session keys.

If a password or recovery secret is used to protect local key material, use a properly reviewed password-based key derivation construction and appropriate parameters.

Prefer established library implementations.

---

# 63. SUPABASE EDGE FUNCTIONS

Audit every Edge Function touching messaging.

Edge Functions may:

- authenticate requests
- validate authorization
- route ciphertext
- manage prekey publication
- manage delivery metadata

They must not:

- decrypt messages
- log plaintext
- store private keys
- generate user message keys server-side
- expose service-role powers to clients

Service-role credentials must remain server-side.

---

# 64. SERVICE ROLE KEY

Never put:

```text
SUPABASE_SERVICE_ROLE_KEY
```

or equivalent privileged credentials in:

- browser JavaScript
- mobile client bundle
- public repository
- chat payload
- logs

The client must never receive backend master privileges.

---

# 65. CLIENT TAMPERING TEST

Assume a malicious user controls their own client.

They can:

- modify JavaScript
- alter requests
- change IDs
- replay requests
- call Supabase APIs directly
- manipulate local state
- bypass UI checks

Test that this cannot grant:

- access to another conversation's plaintext
- unauthorized ciphertext access
- unauthorized conversation membership
- another user's device keys
- another user's encrypted attachments

---

# 66. KEY SERVER ATTACK MODEL

Assume an attacker gains database read access.

They should see:

```text
ciphertext
metadata
```

not:

```text
plaintext
private keys
session secrets
```

This is one of the core benefits of E2EE.

Run a thought experiment:

> "If an attacker dumped the messaging tables tonight, could they read users' old conversations?"

The desired answer should be:

> No, not from the database alone.

Document any exceptions.

---

# 67. SERVER COMPROMISE MODEL

Assume an attacker gains backend execution capability.

Ask:

- Can they retrieve private message keys?
- Can they decrypt stored messages?
- Can they intercept future sessions?
- Can they substitute public keys?
- Can they impersonate devices?
- Can they silently downgrade cryptographic versions?
- Can they force session resets?
- Can they send malicious prekeys?

The selected protocol must be evaluated against these threats.

This is why identity authentication and device verification matter.

---

# 68. KEY DIRECTORY SECURITY

If the backend stores public identity keys and prekeys:

Audit:

- who can publish them
- who can replace them
- whether signatures are verified
- whether malicious key substitution is detectable
- how identity changes are surfaced
- whether an attacker can swap Bob's public key with their own

Do not assume that "public key" means "automatically trusted key."

---

# 69. SECURITY VERIFICATION

Plan a user-accessible security verification mechanism for mature versions.

Possible model:

```text
Chat
  ↓
Contact info
  ↓
Encryption / Security
  ↓
Verify security code
  ↓
QR or code comparison
```

The implementation must follow the selected protocol's actual identity-verification model.

Do not display a green "Verified" badge merely because a key exists.

---

# 70. SESSION ESTABLISHMENT FAILURE

If encryption cannot be established:

Do not silently fall back to plaintext.

Correct behavior:

```text
E2EE session unavailable
        ↓
Retry / repair / explain
        ↓
Do NOT send plaintext
```

There must be no "fallback to ordinary chat" path.

---

# 71. ENCRYPTION FAILURE UX

If encryption fails, show a calm actionable state.

Example:

> Couldn't securely send this message.  
> Please try again.

Do not expose cryptographic internals to ordinary users.

Developer diagnostics can exist separately without leaking secrets.

---

# 72. OFFLINE MESSAGING

Test:

- sender offline
- recipient offline
- both offline
- intermittent connection
- airplane mode
- reconnect
- duplicate reconnect
- app killed before send completes
- app killed after ciphertext upload
- recipient opens after hours/days

Messages must remain correctly encrypted and delivered.

---

# 73. ORDERING

Test:

- rapid messages
- simultaneous messages
- delayed network
- retries
- duplicated realtime events
- out-of-order network delivery

The UI should eventually converge to the correct conversation state.

Do not rely on timestamp ordering alone if the protocol/application requires stronger sequencing.

---

# 74. IDEMPOTENCY

Message sending should be idempotent.

A network retry must not create five copies of one user action.

Use stable message IDs / client-generated identifiers or the selected architecture's equivalent.

Audit:

- send retry
- upload retry
- realtime duplicate
- refresh during send
- app restart during send

---

# 75. TRANSACTIONAL MESSAGE DELIVERY

Do not claim a message is delivered before the system actually knows it has been accepted.

Define:

```text
composing
→ encrypting
→ encrypted locally
→ sending
→ server accepted
→ delivered
→ read
```

The exact states should match the existing Akọ UX.

Cryptographic operations must not be hidden behind fake loading states.

---

# 76. DO NOT USE FAKE ENCRYPTION LOADING

Never:

```text
setTimeout(() => {
  show "Encrypted"
}, 500)
```

Encryption state must reflect the real cryptographic operation.

The UI can feel smooth, but state must be truthful.

---

# 77. PERFORMANCE

E2EE should not make Akọ chat feel heavy.

Measure:

- session creation time
- message encryption latency
- decryption latency
- attachment encryption
- attachment decryption
- battery usage
- memory usage
- large media handling
- scrolling performance
- low-end Android behavior

Use asynchronous/background work where appropriate.

Do not block the entire UI while encrypting a large video.

---

# 78. LARGE ATTACHMENTS

Do not load enormous media entirely into memory if avoidable.

Use appropriate:

- streaming
- chunking
- background processing
- progressive upload

while maintaining cryptographic correctness.

Do not invent insecure chunk encryption merely for performance.

---

# 79. CHAT CACHE

If messages are cached locally:

- understand what is plaintext
- understand who can access the cache
- clear it appropriately
- avoid logging it
- avoid putting it in analytics
- consider device-level encryption capabilities

Document the threat model.

---

# 80. SCREENSHOTS

A screenshot is not automatically preventable.

On supported native platforms, privacy-oriented screenshot protections may be considered later, but do not falsely promise that E2EE prevents screenshots.

The recipient can always:

- screenshot
- photograph the screen
- copy text
- record audio

This should be clear in the privacy documentation where appropriate.

---

# 81. CHAT EXPORT

If export is ever implemented:

Treat it as a deliberate plaintext extraction.

The user is intentionally moving decrypted content outside the E2EE boundary.

The UX should make this clear.

Do not silently upload exports to Akọ.

---

# 82. ANALYTICS

Analytics must never contain:

- message body
- message text
- decrypted attachment content
- voice transcript
- private document content

Acceptable analytics might include:

- message sent
- message delivered
- message read
- encryption success/failure
- attachment size bucket
- performance timing

Use anonymized/aggregated data where possible.

---

# 83. ERROR REPORTING

Crash/error services can accidentally capture:

- React state
- route state
- message objects
- decrypted content

Configure them carefully.

Redact private message content.

Test intentionally by throwing errors while a message is open.

Verify what reaches the error provider.

---

# 84. THIRD-PARTY SDK AUDIT

Audit every SDK touching the chat UI.

Ask:

> Could this SDK receive message content?

Review:

- analytics
- crash reporting
- session replay
- heatmaps
- advertising
- performance monitoring
- customer support tools

Disable recording of private chat screens/content where necessary.

Do not allow session-replay tooling to silently record private messages.

---

# 85. SESSION REPLAY

This deserves special attention.

If Akọ uses a session replay SDK:

Private chat must be excluded or fully masked.

Do not allow:

```text
User types:
"My password is..."
```

to appear in a third-party session replay dashboard.

The same applies to private chat attachments.

---

# 86. SUPPORT TOOLS

Support staff must not be able to open private conversations merely because they are support staff.

If a support workflow requires user-provided content, the user should intentionally submit it.

---

# 87. LEGAL / PRIVACY LANGUAGE

The future privacy policy must accurately describe:

- E2EE
- metadata
- storage
- retention
- reporting
- backups
- device security
- third-party services
- notifications
- account recovery

Do not publish security claims before the technical implementation has been verified.

---

# 88. SECURITY CLAIM CHECKLIST

Before publishing:

> "Akọ can't read your messages"

verify:

- server has no private keys
- database has no plaintext
- Edge Functions cannot decrypt
- logs contain no plaintext
- analytics contain no plaintext
- push notifications contain no plaintext
- attachments are encrypted
- backups do not bypass E2EE
- support/admin tools cannot decrypt
- message search does not upload plaintext
- error reporting does not leak plaintext

---

# 89. TEST: DATABASE DUMP

Create a test environment.

Send:

> "AKO_E2EE_TEST_MESSAGE_123"

Then inspect:

- database rows
- Supabase logs
- Edge Function logs
- realtime payloads
- storage
- analytics
- error logs

The exact plaintext should not appear anywhere server-side unless it was intentionally submitted for a user-initiated report/test.

---

# 90. TEST: NETWORK INSPECTION

Inspect the client/server traffic.

Expected:

```text
ciphertext
```

not:

```text
Hello Emeka
```

Do this for:

- text
- voice
- photo
- video
- document

---

# 91. TEST: MALICIOUS DATABASE READ

As an authorized backend/database tester:

1. obtain the encrypted message row
2. attempt to decrypt without device private keys
3. verify that it is not possible

Do not weaken the database to make this test pass.

---

# 92. TEST: CLIENT TAMPERING

Modify the client to attempt:

- reading another user's messages
- changing conversation ID
- changing sender ID
- inserting plaintext
- substituting another public key
- retrieving another user's attachments

Expected result:

```text
DENIED
```

---

# 93. TEST: PLAINTEXT FALLBACK

Force:

- key failure
- prekey failure
- malformed session
- expired session
- missing device key
- network interruption

Verify:

> No plaintext message is sent.

---

# 94. TEST: NOTIFICATION LEAK

Send:

> "Meet me behind the office at 8."

Inspect:

- Android notification payload
- lock-screen notification
- server logs
- push provider payload
- browser notification

No plaintext should be transmitted through the server push payload unless the user has explicitly chosen a design that makes that content visible locally and the architecture still protects it appropriately.

Preferred default:

> New message

---

# 95. TEST: ATTACHMENT LEAK

Send a private photograph.

Inspect:

- Supabase Storage
- database
- CDN/storage URLs
- logs
- thumbnails
- previews

A database/storage attacker should not be able to simply open the original attachment.

---

# 96. TEST: ADMIN

Attempt to inspect a user's private chat through every Admin page.

Expected:

> There is no plaintext chat viewer.

---

# 97. TEST: REPORT

Send a message.

Report it intentionally.

Confirm:

1. ordinary unreported message remains E2EE.
2. report flow clearly tells user content is being submitted.
3. only the selected/reportable content is submitted.
4. moderation can review what was intentionally reported.
5. this does not create a hidden universal chat-decryption mechanism.

---

# 98. TEST: DEVICE CHANGE

Simulate:

- reinstall
- new phone
- new browser
- second device
- revoked device

Verify that identity changes are handled safely and visibly.

---

# 99. TEST: CONCURRENCY

Run:

- 100+ simultaneous sends
- simultaneous session establishment
- duplicate sends
- retries
- rapid messages
- attachment uploads

Verify:

- no duplicate plaintext
- no key corruption
- no session-state races
- no authorization bypass
- no cross-conversation delivery

---

# 100. TEST: LOW-END DEVICE

Test on realistic lower-end Android hardware.

Verify:

- chat remains responsive
- scrolling remains smooth
- encryption does not freeze composer
- large media does not crash app
- battery use remains reasonable

---

# 101. TEST: WEB BROWSER

If web chat is supported:

Test:

- refresh
- multiple tabs
- browser restart
- private/incognito limitations
- local storage clearing
- device/browser key lifecycle
- session expiration

Document browser-specific security limitations honestly.

---

# 102. TEST: NATIVE APP

Before native release:

Test:

- Android
- iOS

and verify cryptographic behavior is consistent.

Do not assume the web implementation's key storage automatically maps safely to native.

---

# 103. TEST: USER LOGOUT

Verify:

- server authentication ends
- local key state follows defined lifecycle
- no private keys leak to server
- no unintended plaintext remains in logs
- reopening the app follows the documented recovery/session behavior

---

# 104. TEST: ACCOUNT DELETION

Define what happens to:

- encrypted messages
- conversation metadata
- attachments
- device keys
- public keys
- prekeys
- local caches
- recipient-side copies

Do not claim that deleting an account can erase copies already held by other participants.

---

# 105. THREAT MODEL

Claude must explicitly evaluate:

### Threat A
Database dump.

### Threat B
Malicious client.

### Threat C
Compromised server.

### Threat D
Compromised recipient device.

### Threat E
Compromised sender device.

### Threat F
Malicious administrator.

### Threat G
Stolen session token.

### Threat H
Public-key substitution.

### Threat I
Replay attack.

### Threat J
Message ordering attack.

### Threat K
Push notification leakage.

### Threat L
Attachment leakage.

### Threat M
Analytics/session replay leakage.

### Threat N
Backup leakage.

### Threat O
Device replacement.

Document what E2EE protects against and what it does not.

---

# 106. AUTH TOKEN THEFT

A stolen Supabase auth token must not automatically provide the attacker with the user's historical plaintext messages.

The architecture should maintain a meaningful separation between:

```text
authentication authorization
```

and:

```text
cryptographic decryption capability
```

This is a core security property.

---

# 107. ZERO SERVER DECRYPTION PATH

Search the entire codebase for any function resembling:

```text
decryptMessage()
decryptChat()
decryptAttachment()
getPrivateKey()
deriveMessageKey()
```

on the backend.

If server-side decryption exists, investigate it.

There should be no ordinary server-side plaintext decryption path.

---

# 108. NO SECRET ADMIN OVERRIDE

There must be no:

```text
ADMIN_CAN_READ_MESSAGES=true
```

type mechanism.

No service-role endpoint should secretly decrypt messages.

No hidden database function should possess users' private keys.

No support backdoor.

No emergency plaintext reader.

If a future legal/compliance requirement conflicts with E2EE, treat it as a fundamental architecture/product decision, not a hidden admin feature.

---

# 109. MODERATION PHILOSOPHY

Akọ can moderate the platform without architecting universal surveillance.

Public content:

```text
Visible to platform
→ normal moderation/reporting
```

Private chat:

```text
E2EE
→ platform cannot ordinarily read it
→ user-controlled reporting when needed
```

This should become a deliberate privacy principle.

---

# 110. SPAM / ABUSE CONTROLS WITHOUT READING CONTENT

Akọ can still fight abuse through:

- rate limiting
- account reputation
- blocking
- reporting
- recipient controls
- invitation controls
- suspicious behavior detection
- device/session security
- message volume limits
- attachment limits
- account age/standing
- automated metadata signals

Do not solve every abuse problem by decrypting everyone.

---

# 111. SPAM MESSAGE REPORTING

If a user receives unwanted messages:

Provide:

- block
- report
- mute
- archive
- delete

A report can intentionally submit relevant content if the user chooses.

---

# 112. MESSAGE REQUESTS

If Akọ has message requests:

The encryption architecture must work before the recipient accepts the conversation.

Do not send plaintext to a server because the recipient has not yet accepted the request.

Define:

- prekey availability
- request state
- blocked users
- deleted requests
- expiration

---

# 113. PRIVACY SETTINGS

Future chat privacy settings may include:

- who can message me
- who can add me to groups
- read receipts
- typing indicators
- notification previews
- disappearing messages
- blocked users

These are separate from E2EE.

Do not confuse privacy controls with cryptographic guarantees.

---

# 114. DISAPPEARING MESSAGES

If implemented later:

Define:

- expiration timer
- sender/recipient behavior
- offline messages
- attachments
- local cache
- backups
- notifications
- screenshots
- quoted messages

Do not claim "disappearing" means impossible to preserve.

---

# 115. EPHEMERAL MESSAGE KEY HANDLING

If disappearing messages are implemented, ensure cryptographic state does not accidentally retain unnecessary recoverable plaintext.

Follow the chosen protocol/library's recommendations.

---

# 116. ENCRYPTED STORAGE VS E2EE

Claude must include this distinction in code documentation:

```text
TLS
=
protects data in transit.

Database encryption
=
protects stored data from some storage-level threats.

E2EE
=
protects message content from the service itself.
```

Akọ needs all appropriate layers, but they solve different problems.

---

# 117. SECURITY DOCUMENTATION IN REPOSITORY

Create/maintain a concise developer security document describing:

- selected protocol
- selected library
- key lifecycle
- message flow
- attachment flow
- device model
- server responsibilities
- server non-responsibilities
- recovery model
- reporting model
- known limitations

Do not document private secrets.

---

# 118. DEPENDENCY GOVERNANCE

For the cryptographic library:

Monitor:

- security advisories
- CVEs
- maintainer activity
- release history
- compatibility
- dependency tree

Pin/lock versions appropriately.

Do not automatically upgrade a cryptographic library in production without regression/security testing.

Do not remain on a vulnerable version merely because it is convenient.

---

# 119. CRYPTO LIBRARY REVIEW

Before selecting a library, Claude must evaluate:

- project maturity
- security audits
- known vulnerabilities
- platform support
- browser support
- native support
- WASM/native implementation if applicable
- random number generation
- key storage requirements
- protocol completeness
- multi-device support
- group support
- maintenance

If there is no sufficiently trustworthy implementation for a required platform, stop and report the architectural limitation rather than inventing crypto.

---

# 120. SECURITY REVIEW

Before launch, obtain an independent security/cryptography review if reasonably possible.

At minimum:

- experienced security engineer review
- cryptographic architecture review
- dependency review
- penetration testing
- malicious-client testing
- database dump test
- notification leakage test
- attachment leakage test

For a feature whose core promise is "Akọ cannot read your chats," independent review is highly valuable.

---

# 121. DEFINITION OF "DONE"

E2EE is NOT done because:

- a lock icon appears
- the database column is named `encrypted_message`
- HTTPS is enabled
- AES is used somewhere
- Supabase storage encryption is enabled
- Claude says it is encrypted

E2EE is done only when the architecture and tests demonstrate that ordinary Akọ backend infrastructure does not possess the keys required to decrypt private message content.

---

# 122. FINAL PRE-LAUNCH CHECKLIST

### Cryptography

- [ ] Mature protocol selected
- [ ] Mature implementation selected
- [ ] No custom cryptography
- [ ] Identity keys implemented
- [ ] Prekeys implemented where required
- [ ] Ratcheting/session management implemented
- [ ] Replay protection implemented
- [ ] Identity-change handling implemented
- [ ] Key versioning implemented

### Server

- [ ] No plaintext message storage
- [ ] No server decryption path
- [ ] No private keys server-side
- [ ] RLS audited
- [ ] Edge Functions audited
- [ ] Realtime audited
- [ ] Logs audited
- [ ] Analytics audited
- [ ] Admin audited

### Attachments

- [ ] Images encrypted
- [ ] Videos encrypted
- [ ] Audio encrypted
- [ ] Voice notes encrypted
- [ ] Documents encrypted
- [ ] Thumbnails reviewed
- [ ] Previews reviewed
- [ ] Storage access audited

### Notifications

- [ ] Push payloads do not leak plaintext
- [ ] Lock-screen behavior tested
- [ ] Browser notification behavior tested

### Client

- [ ] Private keys protected
- [ ] Local storage reviewed
- [ ] Debug logging removed/redacted
- [ ] Crash reporting redacted
- [ ] Session replay disabled/masked
- [ ] Cache reviewed

### Product

- [ ] Subtle encryption notice exists
- [ ] Learn More exists
- [ ] Wording matches actual guarantees
- [ ] No false security claims
- [ ] Reporting behavior documented
- [ ] Recovery behavior documented
- [ ] Backup behavior documented

### Testing

- [ ] Database dump test
- [ ] Network inspection
- [ ] Malicious client test
- [ ] Notification leak test
- [ ] Attachment leak test
- [ ] Admin test
- [ ] Replay test
- [ ] Concurrency test
- [ ] Offline test
- [ ] Device-change test
- [ ] Android test
- [ ] iOS test
- [ ] Web test if supported

---

# 123. REQUIRED FINAL AUDIT REPORT

After implementation, Claude must create:

`AKO_E2EE_MESSAGING_FINAL_AUDIT.md`

The report must include:

## 1. What existed before

## 2. What was changed

## 3. Cryptographic protocol selected

## 4. Library selected and why

## 5. Key architecture

## 6. Message flow

## 7. Attachment flow

## 8. Server capabilities

## 9. What the server cannot decrypt

## 10. Metadata still visible to Akọ

## 11. Backup behavior

## 12. Account recovery behavior

## 13. Device-change behavior

## 14. Reporting behavior

## 15. Admin limitations

## 16. Notification privacy

## 17. Test results

## 18. Remaining limitations

## 19. Security risks

## 20. Recommended independent review

## 21. GO / CONDITIONAL GO / NO-GO

---

# 124. REQUIRED PRODUCT STATEMENT

If—and only if—the implementation passes the technical audit, the intended product statement is:

> **Messages are end-to-end encrypted. Only the people in this chat can read them.**

Potential secondary explanation:

> **Akọ can't read your private messages.**

Only publish the second sentence after verifying the architecture supports it.

---

# 125. DESIGN PRINCIPLE

Akọ should not make privacy feel like a technical lecture.

The user should simply feel:

> "This conversation is mine."

The security architecture does the difficult work underneath.

The UI quietly communicates the promise.

---

# 126. CORE PRINCIPLE

> **Encrypt before Akọ sees it.**

That is the mental model Claude should carry through the entire implementation.

---

# 127. FINAL CLAUDE INSTRUCTION

Do not treat this document as a blind list of features to code.

First understand Akọ's existing messaging architecture.

Then:

1. audit
2. identify gaps
3. choose the correct mature cryptographic implementation
4. design the migration
5. implement carefully
6. preserve good existing work
7. test maliciously
8. inspect every data path
9. verify that plaintext cannot escape through logs, notifications, analytics, storage, admin tools or attachments
10. test again
11. document limitations
12. only then make the user-facing E2EE claim

Do not sacrifice cryptographic correctness for convenience.

Do not weaken E2EE to make moderation easier.

Do not invent cryptography.

Do not create a hidden admin backdoor.

Do not claim security properties that have not been verified.

The standard is not:

> "The chat looks encrypted."

The standard is:

> **"Akọ genuinely does not have the keys required to read ordinary private conversations."**

---

# 128. PRODUCT + SECURITY NORTH STAR

Akọ is a social platform where people can reason publicly, discover one another, build Projects, exchange value, and communicate privately.

The privacy boundary should be clear:

**Public Akọ:**

> Ideas can be seen, discussed, discovered and moderated according to platform rules.

**Private Akọ:**

> Conversations are end-to-end encrypted and designed so Akọ cannot ordinarily read them.

That distinction should be intentional, technically real, and easy for users to understand.
