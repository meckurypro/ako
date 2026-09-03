<!-- README.md -->
# Akọ — "A Reason to Reason"

Akọ is a social app with a built-in creator-monetization layer: a feed
(posts, follows, gifting) plus a **Projects marketplace** where
creators sell access to seven different kinds of content and
experiences.

Stack: React 19 + TypeScript + Vite + Tailwind, on Supabase (Postgres
+ Auth + Storage + Edge Functions).

## Projects marketplace

A project is one of seven types, each with its own access model and,
where it needs one, its own dedicated page:

| Type | What it is | Where it lives |
|---|---|---|
| **Event** | Ticketed — real-world or online, buyer enters an email (their own or someone else's), gets an emailed + downloadable ticket | `pages/TicketView.tsx` |
| **Meeting** | A single scheduled live session; buyers see a countdown, then join | `pages/MeetingRoom.tsx` |
| **Room** | An ongoing paid group — host announcements, scheduled meetings w/ recordings, assignments; members can stream but not download | `pages/Room.tsx` |
| **Course** | Structured modules/lessons; built as a draft, can't be purchased until the host publishes it | `pages/Course.tsx` |
| **Audio / Video / File** | A single deliverable — link or upload, gated by price | `components/project-types/DeliverableFields.tsx` (shared form), unlocked inline from `ProjectCard` |

All seven share the same base fields (title, thumbnail, description,
topics, price/promo) from `pages/CreateProject.tsx`, which switches in
the right type-specific fields from `components/project-types/`.

**Access model:** every project can be viewed freely; unlocking the
actual content (file, link, ticket, room, course) costs the price the
host set, or is free if price is 0. Every unlock — paid or free — is
logged to `project_access_events` and surfaced as a public count on
`ProjectCard` and `ProjectDetail` (see `hooks/useProjectAccess.ts`).
Users can also save any project for later (`hooks/useSavedProjects.ts`,
mirrors the existing post-bookmarking pattern).

The **Activity** tab on a user's own profile (after Posts and
Projects) lists every Event ticket, Meeting, and Room meeting they
have upcoming or attended — see `hooks/useActivity.ts`.

## Database

Two migrations on top of the original schema, run in order via the
Supabase SQL editor (not committed as versioned migrations here):

1. `ako_projects_v2_migration.sql` — new `project_type`/`status`
   values, `project_access_events`, `saved_projects`,
   `project_event_details` + `event_tickets`,
   `project_meeting_details`, `room_members` + `room_posts` +
   `room_meetings`, `assignments` + `assignment_submissions`,
   `course_modules` + `course_lessons`.
2. `ako_projects_v2_rls.sql` — RLS policies for all of the above.
   Notable ones: `event_tickets` has no client write policy at all
   (issued only by the purchase edge function via the service role);
   course module/lesson content is only readable by the owner or a
   buyer, with no public syllabus preview yet.

## Known gaps (as of this build)

- **The purchase edge function hasn't been extended yet.** Buying an
  Event doesn't issue a ticket, buying a Room doesn't grant
  membership, and nothing yet blocks buying an unpublished Course.
  The frontend (`TicketView`, `Room`) is already built to handle this
  correctly once it's wired up — they show "processing" / "members
  only" rather than breaking.
- **No video provider is picked yet** (LiveKit / Daily / Agora / 100ms
  under consideration). `MeetingRoom.tsx` and Room meeting recordings
  are placeholder boxes until that's decided.
- **Room's chat composer is text-only.** Audio/video/image/voice-note
  posting needs a media-upload flow, blocked on the same provider
  decision above for anything that isn't a plain file upload.
- Event/Meeting cancellation-with-refund (host's choice per
  cancellation) has schema support (`cancelled_at`,
  `event_tickets.refunded_at`) but no UI yet.

---

## Development

Vite + React, minimal template setup. Two official plugins available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### React Compiler

Not enabled here because of its impact on dev & build performance. To
add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the Oxlint configuration

For type-aware lint rules, install `oxlint-tsgolint` and edit
`.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
