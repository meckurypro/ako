# Haptics — spec for the React Native rewrite

Not implemented on web on purpose. `navigator.vibrate()` is Android-WebView-only
(iOS Safari/WebViews ignore it entirely), and this app is moving to a full
React Native rewrite rather than a Capacitor wrap — so a web haptics
abstraction would be thrown away, not carried forward. What *does* carry
forward is the decision below: which moments get haptic feedback, and what
kind. Implement this directly against `expo-haptics` (or the bare
`react-native-haptic-feedback` if the app ends up without Expo) when the
native build starts.

Event names match `src/lib/sounds.ts` exactly — haptics and sound should
almost always fire together, from the same call site, so keeping one
taxonomy for both avoids the two ever drifting apart.

| Event | Haptic | Expo Haptics call |
|---|---|---|
| `like` | light tap | `impactAsync(ImpactFeedbackStyle.Light)` |
| `follow` | medium tap | `impactAsync(ImpactFeedbackStyle.Medium)` |
| `message-sent` | none | — a tap already has its own visual feedback; a haptic here reads as noisy on a high-frequency action |
| `message-received` | none | incoming messages should feel like the OS notification, not an in-app buzz — leave this to the system push notification, not this event |
| `gift-sent` | success notification | `notificationAsync(NotificationFeedbackType.Success)` |
| `gift-received` | success notification | `notificationAsync(NotificationFeedbackType.Success)` |
| `unlock-success` | success notification | `notificationAsync(NotificationFeedbackType.Success)` — the highest-stakes moment (money changed hands), pair with the fullest haptic in the set |
| `error` | error notification | `notificationAsync(NotificationFeedbackType.Error)` |
| `room-join` | medium tap | `impactAsync(ImpactFeedbackStyle.Medium)` |
| `room-leave` | none | leaving is a dismissal, not an achievement — a haptic here feels like the app is confirming something the user already knows they just did |

The existing long-press-to-open-sheet haptic in `ReactionTray.tsx`
(`navigator.vibrate(15)`) is a *gesture-recognition* haptic (confirms "yes,
that was a long press"), not an event haptic — it stays a light
`impactAsync(ImpactFeedbackStyle.Light)` in the RN version, same role.

## Why "none" for three events

Haptics are easy to overuse — a phone that buzzes on every message and every
send stops feeling premium and starts feeling like a slot machine. The three
"none" rows above are deliberate omissions, not gaps: message-sent/received
already have sound + a bubble animation carrying the feedback, and
room-leave has no positive moment to reinforce. Revisit this table if user
testing says otherwise, but don't add haptics back into these three just to
make the table look more complete.
