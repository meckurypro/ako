# AKỌ — Micro-Interactions, Motion & Sound System Audit Specification

## 1. Purpose

This document turns Claude into more than an implementer.

For this task, Claude should approach Akọ as a **product animator, interaction designer, motion designer, frontend engineer, and systems thinker**.

The objective is not to make Akọ flashy.

The objective is to make Akọ feel **alive**.

Small actions should have small, satisfying responses.

Buttons should feel like they belong to the same product.

Interactions should acknowledge the user's action.

Loading should communicate that something is happening.

Success should feel complete.

Nothing should feel unnecessarily animated.

The guiding principle is:

> **Add life, not noise.**

---

# 2. Core Motion Philosophy

Akọ should feel:

- responsive;
- tactile;
- intentional;
- warm;
- modern;
- confident;
- lightweight;
- culturally distinct without turning every interaction into a cultural animation.

Avoid:

- excessive bouncing;
- constant floating elements;
- long transitions;
- animation everywhere;
- distracting particle effects;
- gimmicky motion;
- animations that delay interaction;
- motion that makes the application feel like a game when it is not.

The user should often **feel** the interaction before consciously noticing the animation.

---

# 3. Audit First

Claude must read the actual repository before implementing motion.

Inspect:

### Frontend
- buttons
- links
- cards
- icons
- forms
- modals
- drawers
- sheets
- dropdowns
- tabs
- navigation
- reactions
- comments
- reposts
- bookmarks
- shares
- follows
- gifting
- wallet
- Projects
- promotion
- chat
- notifications
- loading states
- error states
- success states
- empty states
- upload states
- authentication states

### Existing motion
Search for:

- CSS transitions
- CSS animations
- Tailwind animation utilities
- keyframes
- Framer Motion / Motion
- React Spring
- animation libraries
- transition components
- skeleton loaders
- spinners
- pulse effects
- sound/audio utilities
- haptic abstractions if present
- reusable interaction components

### Sounds
**Search the repository for all existing sound/audio assets.**

Do not assume what they are from filenames alone.

Inspect:

- file names
- formats
- duration
- usage
- context
- whether they are already wired
- whether multiple sounds are variants of the same interaction

Claude should make intelligent use of the sounds already in the repository rather than importing random new sounds unnecessarily.

---

# 4. The Goal Is a Motion Language

Do not animate each button independently.

Akọ needs a coherent **motion language**.

For example:

```text
Tap
 ↓
tiny physical response
 ↓
state change
 ↓
subtle confirmation
```

A Support button, Repost button, Bookmark button, and Follow button should feel like members of the same family.

They can have different visual responses while sharing the same interaction principles.

---

# 5. Interaction Hierarchy

Use motion intensity according to importance.

### Level 0 — No animation
For:

- purely informational content
- tiny repeated updates
- situations where motion adds no value

### Level 1 — Micro response
For:

- button press
- icon tap
- toggle
- bookmark
- follow

### Level 2 — Meaningful response
For:

- Support
- Disagree
- Push Back
- Repost
- Share
- Send
- Save

### Level 3 — Celebration
For:

- successful purchase
- successful gift
- important achievement
- meaningful completion

Level 3 should be rare.

---

# 6. Button Press Language

Buttons should acknowledge touch/click.

Possible behavior:

```text
idle
 ↓
pressed
 ↓
released
 ↓
new state
```

Use subtle:

- scale
- opacity
- elevation
- background transition
- icon movement

Avoid exaggerated button deformation.

The user should never feel that the UI is slowing them down.

---

# 7. Button Consistency

Audit all interactive buttons.

They should share:

- press behavior
- hover behavior where applicable
- focus behavior
- disabled behavior
- loading behavior
- success behavior where appropriate

Do not create:

```text
Button A → shrinks
Button B → flashes
Button C → spins
Button D → bounces
```

unless there is a meaningful product reason.

Create a coherent system.

---

# 8. Like / Support Interaction

Audit the actual reaction model in Akọ.

For Support:

Possible micro interaction:

```text
tap
 ↓
icon responds
 ↓
state changes
 ↓
small visual confirmation
```

Keep it fast.

Do not turn every support into a large celebration.

If a sound exists that naturally fits, consider a **very short, subtle sound**.

Sound must not be mandatory.

---

# 9. Disagree Interaction

Disagree should feel different from Support without becoming aggressive.

Use a restrained state transition.

Avoid:

- shaking the screen;
- angry animation;
- destructive visual treatment.

The product philosophy is discussion, not conflict theater.

---

# 10. Push Back Interaction

Push Back should feel like a meaningful intellectual interaction.

A subtle visual response can distinguish it from ordinary reactions.

Again:

> signal meaning, not drama.

---

# 11. Repost Interaction

Repost is an important social action.

Potential interaction:

```text
tap repost
 ↓
icon rotates/moves subtly
 ↓
state confirms
 ↓
reposted content updates
```

The animation should communicate:

> "This action happened."

Not:

> "LOOK AT THIS GIANT ANIMATION."

If there is an appropriate repository sound, evaluate it.

---

# 12. Bookmark / Save

Bookmarking should feel tactile.

Possible:

```text
tap
 ↓
icon fills/changes
 ↓
tiny scale response
 ↓
optional subtle sound
```

Do not use a large animation.

The saved state should remain visually obvious after the micro-interaction ends.

---

# 13. Follow

Follow is a relationship action.

Possible:

```text
Follow
 ↓
button compresses
 ↓
state changes
 ↓
subtle confirmation
```

If the button changes to Following, transition the visual state rather than instantly replacing it with no feedback.

Unfollow should generally be calmer.

---

# 14. Share

Share should communicate that the action has completed.

Possible:

```text
Share
 ↓
icon responds
 ↓
share sheet/modal
```

If using native/browser share, animate the Akọ control but do not interfere with the operating system's UI.

---

# 15. Send

Sending a message or content should feel immediate.

Possible:

```text
Send
 ↓
button/icon responds
 ↓
content enters conversation
 ↓
composer clears
```

Do not delay message delivery merely for animation.

Animation must follow or accompany the actual state transition.

---

# 16. Comment Submission

When a comment is submitted:

```text
Submit
 ↓
loading state
 ↓
backend success
 ↓
comment appears
 ↓
composer returns to ready state
```

The new comment can enter the thread with a subtle motion.

Avoid dramatic entrance animations for every comment.

---

# 17. Gifting

Gifting is one place where Akọ can have a little more personality.

The gift is culturally meaningful.

Still, keep V1 restrained.

Possible:

```text
Select gift
 ↓
gift selection responds
 ↓
Confirm
 ↓
transaction processes
 ↓
gift confirmation
```

The actual cultural artifact animations can become richer in later versions.

Do not overbuild the entire gifting animation system if the repository does not currently support it.

---

# 18. Wallet

Financial interfaces should feel trustworthy.

Use:

- clean transitions
- number changes
- subtle confirmation
- restrained success states

Avoid playful financial animations that could make money movement feel unserious.

For example:

```text
Gift received
Balance updates
```

can have a subtle transition.

A withdrawal should feel precise and trustworthy, not celebratory.

---

# 19. Project Actions

Audit:

- create
- save
- publish
- update
- join
- purchase
- bookmark
- share
- affiliate fork
- complete

Each should communicate state changes.

Example:

```text
Publish
 ↓
Processing
 ↓
Published
 ↓
View Project
```

---

# 20. Promotion Actions

Audit:

- Promote
- targeting
- budget
- submit
- review
- approval
- pause
- resume
- terminate
- extend

Motion should communicate operational state.

For example:

```text
Submit
 ↓
In Review
```

The state change should be clear without excessive animation.

---

# 21. Loading State — Database Writes

This is a **hard requirement**.

> **Whenever a user performs an action that writes to the database, the UI must clearly communicate that the action is being processed.**

Examples:

- creating a post
- commenting
- replying
- reacting
- following
- reposting
- bookmarking
- sending a message
- sending a gift
- purchasing
- joining a Project
- creating/editing a Project
- updating profile
- changing settings
- promoting
- requesting withdrawal
- admin actions
- any other meaningful write

Claude must audit the codebase for database writes and ensure appropriate loading/processing feedback exists.

---

# 22. Do Not Fake Loading

Loading animation must represent actual operation state.

Do not:

```text
click
 ↓
setTimeout(1000)
 ↓
pretend success
```

The animation must be tied to the real async operation.

```text
action starts
 ↓
loading
 ↓
actual response
 ├── success
 └── error
```

---

# 23. Prevent Double Submission

When a write is processing:

- disable or guard duplicate actions where appropriate;
- preserve accessibility;
- show processing state;
- prevent accidental duplicate transactions.

This is particularly important for:

- payments
- gifts
- withdrawals
- promotions
- publishing
- messages
- follow/reaction actions

Motion and loading state should reinforce the actual protection.

---

# 24. Loading Animation Language

Create a consistent loading language.

Possible levels:

### Inline action loading
Small spinner/progress indicator inside button.

### Content loading
Skeleton or shimmer.

### Page loading
Lightweight transition/skeleton.

### Full operation
Progress state where necessary.

Do not use a giant spinner for every operation.

---

# 25. Skeletons

Audit existing skeleton loaders.

Skeletons should resemble the structure being loaded.

Do not make every page use the same generic rectangle skeleton.

For:

- Feed
- Profile
- Project
- Chat
- Notifications
- Wallet

use appropriate structures.

---

# 26. Optimistic UI

Claude should identify actions where optimistic UI improves perceived responsiveness.

Potential candidates:

- Support
- Disagree
- Push Back
- Follow
- Bookmark
- Repost

But do **not** use optimistic UI carelessly for financial or irreversible actions.

For critical operations:

```text
request
 ↓
server confirmation
 ↓
state update
```

may be more appropriate.

Claude must inspect the existing architecture.

---

# 27. Rollback Animation

If optimistic state is used and the backend rejects it:

```text
optimistic state
 ↓
server rejection
 ↓
state rollback
```

The rollback should be visually coherent and not jarring.

Do not let the UI remain falsely "liked", "followed", "saved", etc.

---

# 28. Success Feedback

Successful writes should produce an appropriate response.

Not every action needs a toast.

Possible responses:

- state change
- icon transition
- inline confirmation
- subtle toast
- content insertion
- navigation
- sound

Use the smallest effective response.

---

# 29. Error Feedback

Errors should also have a consistent motion language.

Example:

```text
processing
 ↓
error
 ↓
subtle error state
 ↓
retry/recover
```

Avoid violent shaking or excessive red flashing.

Errors should feel calm and actionable.

---

# 30. Sound System Audit

**Search the repository for all audio/sound files.**

Inspect:

- `.mp3`
- `.wav`
- `.ogg`
- `.m4a`
- other audio formats
- audio utility modules
- existing sound references

Create an inventory.

For each sound determine:

- what it appears to represent;
- duration;
- volume;
- whether it is appropriate for UI;
- where it could naturally fit;
- whether it should be trimmed/normalized if necessary.

Do not blindly play every sound because it exists.

---

# 31. Sound Philosophy

Sound should be:

- subtle;
- intentional;
- optional;
- short;
- coherent;
- context-sensitive.

A sound should answer:

> **Why does this interaction deserve sound?**

If the answer is unclear, don't use sound.

---

# 32. Suggested Sound Opportunities

Evaluate existing repository sounds for:

- successful gift
- message sent
- notification received
- Support
- Repost
- bookmark
- successful Project purchase
- successful withdrawal request
- promotion submission
- important admin/system announcement

Not all need sound.

Choose only the ones where the existing asset genuinely fits.

---

# 33. Sound Must Never Block UI

Audio playback should never be required for the interaction to complete.

Bad:

```text
click
 ↓
wait for audio
 ↓
complete action
```

Correct:

```text
click
 ↓
action proceeds
 ├── optional sound
 └── visual response
```

---

# 34. Respect User Preferences

Audit/create an appropriate sound preference.

Users should be able to mute UI sounds without disabling:

- notification center
- push notifications
- important system communication

Do not assume sound permission exists.

Browsers may block autoplay/audio until user interaction.

Handle this gracefully.

---

# 35. Sound Volume

UI sounds should be appropriately mixed.

Avoid:

- loud clicks
- long audio
- distorted sounds
- sounds that dominate conversation/media
- sound loops

If repository assets are louder than appropriate, Claude should consider safe client-side volume control or preprocessing where justified.

Do not modify original source assets destructively without reason.

---

# 36. Sound Deduplication

Avoid sound spam.

Examples:

- 20 realtime notifications should not produce 20 overlapping sounds.
- rapid reactions should not become a machine-gun of clicks.
- scrolling should not make sound.
- repeated feed updates should remain silent.

Bundle or suppress where appropriate.

---

# 37. Motion + Sound Synchronization

When both are used:

```text
user action
 ↓
visual response
 + 
subtle sound
```

They should feel like one interaction.

Do not make audio lag behind the UI.

Do not make the UI wait for audio.

---

# 38. Realtime Activity

Audit realtime events.

Not every realtime event needs animation.

For meaningful realtime updates:

- new message
- notification
- comment
- relevant feed update

use subtle arrival motion.

Avoid constant feed movement.

---

# 39. New Message Animation

New messages should appear naturally.

Possible:

```text
new message
 ↓
small opacity/translate transition
```

Avoid large message bubbles flying across the screen.

If the conversation is active, sound should be optional and intelligently suppressed.

---

# 40. Notification Arrival

A new notification can produce:

- unread badge transition
- subtle icon response
- notification list insertion
- optional sound

Do not make the entire screen shake or flash.

---

# 41. Badge Animation

Unread badges should transition when counts change.

Example:

```text
0 → 1
```

may have a tiny scale/fade.

But:

```text
1 → 2 → 3 → 4 → 5
```

should not cause constant exaggerated motion.

---

# 42. Navigation Motion

Audit route transitions.

Use subtle transitions where they improve continuity.

Avoid long page transitions that make navigation feel slow.

The motion should communicate:

> "You moved somewhere."

not:

> "Please wait while the animation finishes."

---

# 43. Modal Motion

Modals should:

- enter smoothly;
- exit smoothly;
- preserve focus;
- not feel disconnected from the trigger.

Use appropriate direction:

- centered dialog → scale/fade
- bottom sheet → slide
- side drawer → slide

Respect reduced-motion preferences.

---

# 44. Dropdowns / Menus

Menus should appear quickly.

A tiny fade/translate is enough.

Do not animate menus for 500ms.

---

# 45. Tabs

Tab transitions should feel immediate.

The active indicator can animate between tabs.

Do not animate entire pages unnecessarily.

---

# 46. Cards

Clickable cards may have:

- subtle hover
- press
- elevation
- image movement

Avoid cards jumping around.

---

# 47. Image Loading

Audit image loading.

Use:

- placeholder
- fade-in
- aspect-ratio preservation

Avoid layout shifts.

---

# 48. Avatar / Profile Motion

Keep subtle.

Profile interactions should not feel like a gaming interface.

---

# 49. Feed Scrolling

Do not animate the feed unnecessarily.

Avoid:

- parallax everywhere
- floating elements
- auto-playing visual effects
- excessive scroll-linked animation

Performance and reading clarity come first.

---

# 50. Reduced Motion

Respect:

```text
prefers-reduced-motion
```

where applicable.

Users who request reduced motion should receive:

- minimal transitions
- no unnecessary transforms
- no intense animation
- no decorative motion that causes discomfort

Functionality must remain identical.

---

# 51. Animation Performance

Audit animation properties.

Prefer performant properties such as:

- transform
- opacity

Avoid expensive continuous layout animation where unnecessary.

Do not animate:

- huge DOM trees
- expensive filters
- layout properties continuously
- large images unnecessarily

The app should remain smooth on ordinary phones.

---

# 52. Mobile Performance

Akọ must feel lightweight.

Test motion on realistic mobile hardware.

Do not optimize animation for a powerful development laptop only.

Audit:

- dropped frames
- long tasks
- battery impact
- memory
- GPU usage
- scrolling performance

---

# 53. Avoid Animation Dependencies Unless Needed

Inspect existing libraries first.

If the repository already has a good animation system, use it.

Do not install multiple overlapping animation libraries without strong justification.

For simple effects, CSS may be better.

---

# 54. Central Motion Tokens

If appropriate for the current architecture, define shared motion values.

Conceptually:

```text
duration-fast
duration-normal
ease-standard
ease-emphasized
press-scale
```

Claude should use the existing design system if one exists.

Do not introduce duplicate token systems.

---

# 55. Interaction Primitives

If the codebase supports it, create reusable primitives such as:

```text
AnimatedButton
PressableIcon
LoadingButton
AnimatedToggle
SuccessFeedback
ErrorFeedback
```

But only if they genuinely reduce duplication.

Do not create abstraction for abstraction's sake.

---

# 56. Action State Machine

For database writes, think in states:

```text
idle
 ↓
pending
 ↓
success
```

or:

```text
idle
 ↓
pending
 ↓
error
 ↓
retry
```

The visual treatment should correspond to the actual state.

---

# 57. Button State Model

A reusable action should conceptually support:

```text
idle
hover
pressed
pending
success
error
disabled
```

Not every button needs every state.

The component architecture should make appropriate states easy.

---

# 58. Financial Action Motion

For:

- purchase
- gift
- withdrawal
- payout
- wallet transfer

prefer:

```text
precise
clear
trustworthy
```

over:

```text
playful
bouncy
celebratory
```

A successful gift may deserve more personality because of its social/cultural meaning.

A withdrawal should remain calm.

---

# 59. Admin Motion

Admin is an operational interface.

Use motion to clarify:

- loading
- approval
- rejection
- save
- status changes

Avoid decorative motion that slows admins down.

---

# 60. Upload Progress

Audit:

- image upload
- video
- audio
- file
- Project assets
- profile media

A real upload should show:

```text
waiting
 ↓
uploading
 ↓
processing
 ↓
complete
```

If backend processing continues after upload, show that distinction.

---

# 61. Long Operations

For operations that can take meaningful time:

- show progress where available;
- allow safe navigation where appropriate;
- preserve operation state;
- do not force users to stare at a spinner.

Examples:

- media processing
- Project publishing
- promotion processing
- payment verification

---

# 62. Avoid Fake Success

Never animate success before the server confirms it for important operations.

For example:

```text
Gift icon celebrates
```

must not happen as final confirmation if the gift transaction later fails.

Optimistic micro-feedback can be used only where rollback is safe and clearly handled.

---

# 63. Motion and Accessibility

Do not communicate critical state only through animation.

Example:

Bad:

> icon turns green

Better:

> icon turns green + accessible state/text updates

---

# 64. Interaction Sound Ownership

Sounds should have a clear owner.

Avoid multiple components independently playing the same sound for one action.

Example:

```text
Gift action
 ↓
transaction system
 ↓
gift success event
 ↓
single feedback layer
```

not:

```text
button sound
+ modal sound
+ wallet sound
+ notification sound
```

for one action.

---

# 65. Event-Based Feedback

Where appropriate, feedback should follow actual events.

Example:

```text
post.created
 ↓
post appears
 ↓
success feedback
```

rather than:

```text
button.clicked
 ↓
success animation
```

This is particularly important for asynchronous actions.

---

# 66. Do Not Animate Database Activity Itself

The fact that a database write happened is not necessarily something the user needs to see.

Animate the **user-facing state transition**.

Good:

```text
Follow button
Following
```

Bad:

```text
Database write spinner
```

The implementation can be technically tied to a database mutation while the UX communicates the meaningful product action.

---

# 67. Motion Consistency Audit

After implementation, Claude should test representative actions side by side:

- Support
- Disagree
- Push Back
- Repost
- Bookmark
- Follow
- Share
- Send
- Comment
- Gift

Ask:

> Do these feel like they belong to the same application?

If not, unify them.

---

# 68. Sound Consistency Audit

Test all chosen sounds together.

Ask:

> Does this sound like one product?

Avoid an assortment of unrelated stock sound effects.

Existing repository assets should form the primary sound vocabulary where they fit.

---

# 69. Cultural Restraint

Akọ has a strong cultural visual identity.

Do not make every click:

- drum
- masquerade
- cowrie
- bell
- traditional sound

That would quickly become gimmicky.

Cultural motion/sound should be reserved for moments where it genuinely strengthens meaning.

The everyday UI should remain modern and restrained.

---

# 70. V1 vs Future Motion

Do not overbuild.

### V1
Focus on:

- button press feedback
- reaction states
- repost
- bookmark
- follow
- share
- send
- comment
- database-write loading
- success/error states
- realtime arrival
- notification badge
- existing repository sound integration
- consistent transitions

### Later
Potentially explore:

- richer gift animations
- animated cultural artifacts
- more expressive Project completion
- advanced sound design
- haptics
- richer motion storytelling

Use actual user behavior to decide what deserves more animation.

---

# 71. Performance Budget

Claude should establish practical constraints.

Avoid:

- long blocking animations
- excessive simultaneous animations
- unnecessary animation on scroll
- large JS animation workloads
- sound assets loaded globally when unnecessary

Lazy-load larger audio/animation assets where appropriate.

---

# 72. Bundle Size

Audit whether animation/audio changes increase bundle size significantly.

Prefer:

- existing assets
- CSS for simple effects
- lazy loading
- code splitting
- reusable primitives

Do not add a 500KB dependency for a 100-line interaction system if unnecessary.

---

# 73. Testing

Add tests where useful.

### Functional
- click triggers action
- loading appears
- success appears
- error appears
- duplicate action prevented
- rollback works

### Accessibility
- reduced motion
- keyboard
- screen reader state
- focus

### Performance
- mobile rendering
- repeated interactions
- long feed scrolling

### Audio
- muted state
- blocked autoplay
- missing asset
- repeated events
- device volume

---

# 74. Failure Testing

Intentionally make writes fail.

Verify:

```text
click
 ↓
loading
 ↓
failure
 ↓
error feedback
 ↓
retry
```

Test:

- network failure
- Supabase error
- validation failure
- authorization failure
- timeout
- duplicate request
- offline state

---

# 75. Reconnect Testing

Test:

```text
action
 ↓
connection lost
 ↓
reconnect
```

Ensure visual state does not remain falsely pending or successful.

---

# 76. Sound Failure Must Not Break Features

If a sound fails to load:

- action still succeeds;
- UI still works;
- no uncaught errors;
- no broken state.

Sound is enhancement, not infrastructure.

---

# 77. Animation Failure Must Not Break Features

Likewise, if animation is unavailable:

- functionality remains intact;
- state remains clear;
- accessibility remains intact.

Motion is presentation.

---

# 78. Final Repository Audit

Claude must search the entire codebase after implementation for:

- inconsistent transition classes
- duplicate animation logic
- arbitrary animation durations
- unused animation imports
- unused sound files
- sound references
- buttons without loading state
- database writes without pending state
- writes with fake loading
- actions with no feedback
- actions with excessive feedback
- direct `setTimeout` used as fake async state
- duplicate audio playback
- inaccessible animated states

---

# 79. Final Interaction Inventory

Produce a final inventory like:

| Action | Current | Motion | Sound | Loading | Success | Error | Decision |
|---|---|---|---|---|---|---|---|
| Support | Audit | ✓ | optional | ✓ | ✓ | ✓ | Keep/upgrade |
| Repost | Audit | ✓ | optional | ✓ | ✓ | ✓ | Keep/upgrade |
| Bookmark | Audit | ✓ | optional | ✓ | ✓ | ✓ | Keep/upgrade |
| Follow | Audit | ✓ | optional | ✓ | ✓ | ✓ | Keep/upgrade |
| Comment | Audit | ✓ | no/optional | ✓ | ✓ | ✓ | Keep/upgrade |
| Message | Audit | ✓ | optional | ✓ | ✓ | ✓ | Keep/upgrade |
| Gift | Audit | richer | selected | ✓ | ✓ | ✓ | Keep/upgrade |
| Purchase | Audit | restrained | selected | ✓ | ✓ | ✓ | Keep/upgrade |
| Withdrawal | Audit | restrained | usually no | ✓ | ✓ | ✓ | Keep/upgrade |

The actual table must be generated from the real codebase.

---

# 80. Final Audit Report

Claude must report:

## Already Good
Existing motion/sound infrastructure worth preserving.

## Better Than Specification
Existing implementation that is stronger than this baseline.

## Missing
Interactions without appropriate feedback.

## Inconsistent
Interactions that behave differently without reason.

## Excessive
Animation/sound that should be reduced.

## Broken
Loading/feedback that does not reflect actual state.

## Performance Risks
Motion/audio that may hurt mobile performance.

## Accessibility Risks
Reduced-motion/focus/audio issues.

## Sound Opportunities
Good uses of existing repository sounds.

## Product Opportunities
Small interactions that could make Akọ feel more alive.

---

# 81. Definition of Done

This work is complete only when:

- Claude has audited the actual repository;
- existing animation infrastructure has been understood;
- existing sound assets have been inventoried;
- unnecessary new dependencies have been avoided;
- common button interaction behavior is coherent;
- Support has appropriate feedback;
- Disagree has appropriate feedback;
- Push Back has appropriate feedback;
- Repost has appropriate feedback;
- Bookmark has appropriate feedback;
- Follow has appropriate feedback;
- Share has appropriate feedback;
- Send has appropriate feedback;
- comments have appropriate feedback;
- Projects have appropriate feedback;
- gifting has appropriate feedback;
- wallet actions have appropriate feedback;
- promotion actions have appropriate feedback;
- admin actions have appropriate feedback;
- meaningful database writes show real pending/loading state;
- loading state is tied to actual async state;
- fake `setTimeout` loading is not used as a substitute for real state;
- duplicate writes are guarded;
- important financial actions are not falsely shown as successful;
- success states are coherent;
- error states are actionable;
- optimistic UI is used only where safe;
- rollback works where optimistic UI exists;
- realtime events have appropriate arrival feedback;
- notification badges update naturally;
- skeletons are appropriate to content;
- route transitions are restrained;
- modals/drawers animate appropriately;
- reduced-motion preferences are respected;
- animation performs well on mobile;
- existing repository sounds are used intelligently where they genuinely fit;
- sound is optional/muteable where appropriate;
- sound cannot break functionality;
- repeated events do not create sound spam;
- audio does not block database operations;
- animation does not block database operations;
- no major action feels visually dead;
- no interaction feels unnecessarily theatrical;
- the motion language feels like one product;
- the sound language feels like one product;
- cultural identity is respected without turning every interaction into a cultural gimmick;
- final interaction inventory is produced;
- final audit report is produced.

---

# 82. Final Instruction to Claude

**Do not turn Akọ into an animation demo.**

Turn it into an application that feels **alive**.

Read the repository.

Understand the existing design system.

Understand the existing components.

Understand the actual database mutations.

Understand the existing sounds.

Then improve the interaction layer systematically.

Think:

```text
User action
     ↓
Immediate acknowledgement
     ↓
Real operation
     ↓
Actual backend result
     ↓
Meaningful state transition
```

The user should never wonder:

> "Did that button work?"

And they should rarely think:

> "Oh, that's an animation."

The ideal reaction is simply:

> **"This feels good."**

Make the buttons feel related.

Make the actions feel tactile.

Make database writes feel responsive.

Make successful actions feel complete.

Make failures feel understandable.

Use sound where it adds meaning.

Use motion where it adds life.

Leave everything else alone.

**Small details. Strong system. No noise.**

Akọ should feel like a living product—not because everything moves, but because **the interface responds intelligently to what the user does.**
