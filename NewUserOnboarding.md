# Akọ New User Onboarding & Personalization

> **Purpose:** Define the first-time-user onboarding experience for Akọ.
>
> The goal is to prevent the "empty social network" problem by giving every new user an initial set of interests and relevant people to follow before they enter the main application.
>
> Akọ should not ask a new user:
>
> > "Who do you want to follow?"
>
> when the user has no idea who is on the platform yet.
>
> Instead, Akọ should first learn what the user is interested in, then use those interests to recommend relevant people.
>
> ---
>
> # 1. CORE ONBOARDING FLOW
>
> The intended flow is:
>
> ```text
> Create Account
>       ↓
> Welcome
>       ↓
> Select Interests
>       ↓
> Find Relevant People
>       ↓
> Follow People
>       ↓
> Building Your Akọ
>       ↓
> Initial Feed
>       ↓
> Main App
> ```
>
> The order is intentional.
>
> **Interests must be collected BEFORE suggested people are generated.**
>
> This allows Akọ to recommend people based on what the user actually cares about.
>
> ---
>
> # 2. PRODUCT PRINCIPLE
>
> The onboarding should answer three questions:
>
> ### What do I care about?
>
> → Interests
>
> ### Who are my people?
>
> → Relevant people
>
> ### What will Akọ show me?
>
> → Personalized initial feed
>
> The user should leave onboarding feeling:
>
> > **"Akọ already knows what I'm interested in and is helping me find my people."**
>
> This is an important expression of the Akọ concept of finding your **trybe**.
>
> ---
>
> # 3. FIRST-TIME USER DETECTION
>
> A user should only see onboarding when onboarding has not been completed.
>
> Example:
>
> ```text
> onboarding_completed = false
> ```
>
> After successful completion:
>
> ```text
> onboarding_completed = true
> ```
>
> ### Requirements
>
> - [ ] New accounts are identified as first-time users.
> - [ ] Existing users who completed onboarding do not see onboarding again.
> - [ ] Refreshing the browser does not restart onboarding.
> - [ ] Closing/reopening the application does not restart completed onboarding.
> - [ ] Onboarding completion is persisted server-side where appropriate.
> - [ ] Do not rely exclusively on localStorage for important application state.
> - [ ] Partial onboarding can be safely resumed.
>
> ---
>
> # 4. ONBOARDING ENTRY
>
> After successful account creation and authentication:
>
> ```text
> Account Created
>       ↓
> Authentication confirmed
>       ↓
> Check onboarding status
>       ↓
> Incomplete → Onboarding
> Complete → Main App
> ```
>
> ### Requirements
>
> - [ ] Newly created users are redirected into onboarding.
> - [ ] New users do not first land on an empty feed.
> - [ ] Existing users bypass onboarding.
> - [ ] Authentication state is resolved before routing.
> - [ ] Direct navigation does not create inconsistent onboarding state.
>
> ---
>
> # 5. STEP 1 — WELCOME
>
> Keep this screen short.
>
> Possible copy:
>
> > ## Welcome to Akọ
> >
> > **A Reason to Reason.**
> >
> > Tell us what interests you. We'll help you find your people.
>
> CTA:
>
> ```text
> Get started
> ```
>
> ### Requirements
>
> - [ ] Akọ branding is visible.
> - [ ] User understands why onboarding exists.
> - [ ] User understands that interests will be used to personalize recommendations.
> - [ ] Welcome screen does not become a long product tutorial.
>
> ---
>
> # 6. STEP 2 — SELECT INTERESTS
>
> This is the first meaningful onboarding step.
>
> Possible copy:
>
> > ## What do you reason about?
> >
> > Pick the things you're interested in. We'll use them to help you find relevant people and shape your Akọ.
>
> Display selectable topic chips/cards.
>
> Example:
>
> ```text
> Technology
> Business
> Science
> Books
> Art
> Music
> Culture
> History
> Philosophy
> Education
> Entrepreneurship
> Design
> Film
> Writing
> Money
> Innovation
> Sports
> Career
> ```
>
> The actual list should use the topics that exist in Akọ.
>
> ### Requirements
>
> - [ ] User can select multiple interests.
> - [ ] Selected state is visually obvious.
> - [ ] User can deselect interests.
> - [ ] Minimum selection is defined.
> - [ ] Maximum selection is defined if necessary.
> - [ ] Continue button behaves according to selection requirements.
> - [ ] Selected interests are persisted.
> - [ ] Duplicate interests are prevented.
> - [ ] Invalid topic IDs are rejected server-side.
> - [ ] User cannot modify another user's interests.
>
> ---
>
> # 7. INTEREST DATA MODEL
>
> Interests should preferably use stable IDs rather than arbitrary strings supplied by the client.
>
> Example:
>
> ```text
> interests
> ├── id
> ├── name
> └── slug
> ```
>
> User-interest relationship:
>
> ```text
> user_interests
> ├── user_id
> ├── interest_id
> └── created_at
> ```
>
> Recommended invariant:
>
> ```text
> UNIQUE(user_id, interest_id)
> ```
>
> if compatible with the existing schema.
>
> ### Security
>
> - [ ] RLS protects user-interest relationships.
> - [ ] User can only modify their own interests.
> - [ ] Topic IDs are validated.
> - [ ] Duplicate relationships are prevented.
>
> ---
>
> # 8. STEP 3 — RECOMMEND RELEVANT PEOPLE
>
> After the user selects interests, Akọ should generate a list of people relevant to those interests.
>
> Possible copy:
>
> > ## Find your people
> >
> > Based on what you're interested in, here are some people you might enjoy reasoning with.
>
> This is **not** simply a list of the most popular users.
>
> Relevance should be considered.
>
> ---
>
> # 9. RECOMMENDATION SOURCES
>
> People recommendations can come from multiple sources.
>
> ### Source A — Interest Matching
>
> Match users against the interests selected by the new user.
>
> Example:
>
> ```text
> New user:
> Technology
> Business
> Entrepreneurship
>
> Recommended:
> @Chidi
> Technology
> Entrepreneurship
> ```
>
> ### Source B — Admin-Curated Suggestions
>
> Admin can deliberately mark profiles as suggested.
>
> ### Source C — Activity / Quality Signals
>
> Future recommendation systems may consider:
>
> - useful posts
> - engagement
> - consistency
> - topic relevance
> - follows
> - discussions
> - project activity
>
> ### Source D — Social Graph
>
> Future recommendations may consider:
>
> - mutual follows
> - similar users
> - users followed by people with similar interests
>
> ---
>
> # 10. ADMIN-CURATED SUGGESTED PROFILES
>
> Akọ should provide an Admin interface where administrators can manually designate profiles as suggested users.
>
> This gives Akọ editorial control over the early community.
>
> This is especially useful while the platform is still growing and the recommendation system does not yet have enough behavioral data.
>
> ---
>
> ## Admin functionality
>
> Admin should be able to:
>
> - [ ] Add a profile to the suggested-user pool.
> - [ ] Remove a profile from the suggested-user pool.
> - [ ] Activate/deactivate a suggestion.
> - [ ] Set suggestion priority where appropriate.
> - [ ] View which interests/categories are associated with the profile.
> - [ ] Search for users.
> - [ ] View currently suggested profiles.
>
> Example:
>
> ```text
> Suggested Profiles
>
> ┌─────────────────────────────────────┐
> │ @Chidi                              │
> │ Technology • Business               │
> │ Suggested: YES                      │
> │ Priority: 10                        │
> │ Active: YES                         │
> └─────────────────────────────────────┘
> ```
>
> ---
>
> # 11. ADMIN SUGGESTIONS MUST COMPLEMENT RELEVANCE
>
> Admin-curated suggestions should NOT automatically replace interest-based relevance.
>
> Preferred recommendation model:
>
> ```text
> User Interests
>       ↓
> Relevant Users
>       +
> Admin-Curated Users
>       ↓
> Ranking
>       ↓
> Suggested People
> ```
>
> Admin selection is a signal, not an unconditional override.
>
> Example:
>
> A user selects:
>
> ```text
> Books
> Philosophy
> History
> ```
>
> A strongly relevant author/reader should generally rank above an unrelated profile simply because an administrator marked that profile as suggested.
>
> Admin curation can boost discovery, but it should not destroy relevance.
>
> ---
>
> # 12. RECOMMENDATION RANKING
>
> The recommendation system should eventually consider multiple signals.
>
> Possible ranking factors:
>
> ```text
> Interest Match
>       +
> Admin Suggestion
>       +
> Profile Quality
>       +
> Activity
>       +
> Engagement
>       +
> Social Graph
> ```
>
> For MVP, keep this simple.
>
> A reasonable initial implementation could be:
>
> ```text
> 1. Strong interest matches
> 2. Admin-curated profiles relevant to selected interests
> 3. Other active/relevant profiles
> ```
>
> Do not over-engineer the recommendation engine for MVP.
>
> ---
>
> # 13. SUGGESTED PEOPLE UI
>
> Each profile should show:
>
> - profile image
> - display name
> - username
> - short bio
> - relevant interests where useful
> - Follow button
>
> Example:
>
> ```text
> ┌────────────────────────────┐
> │       Profile Image        │
> │                            │
> │  Chidi                     │
> │  @chidi                    │
> │                            │
> │  Technology • Business     │
> │                            │
> │        [ Follow ]          │
> └────────────────────────────┘
> ```
>
> ---
>
> # 14. FOLLOW BEHAVIOR
>
> User should be able to follow several recommended people.
>
> ### Requirements
>
> - [ ] Follow button updates immediately.
> - [ ] Follow relationship persists server-side.
> - [ ] Follow action is authorized.
> - [ ] User cannot follow themselves.
> - [ ] Duplicate follows are prevented.
> - [ ] Follow operation is idempotent.
> - [ ] Failed requests do not incorrectly update UI state.
> - [ ] Already-followed users are displayed correctly.
> - [ ] User can continue without following anyone if this remains the chosen product behavior.
>
> Recommended database invariant:
>
> ```text
> UNIQUE(follower_id, following_id)
> ```
>
> if compatible with the existing schema.
>
> ---
>
> # 15. HOW MANY PEOPLE SHOULD BE SUGGESTED?
>
> For MVP, start with approximately:
>
> ```text
> 6–12 people
> ```
>
> This should be tested.
>
> The purpose is to give the user a useful starting network, not overwhelm them.
>
> Possible CTA:
>
> ```text
> Continue
> ```
>
> Optionally:
>
> ```text
> Continue · 5 following
> ```
>
> ---
>
> # 16. NO MATCHES / FEW MATCHES
>
> If the user's interests produce very few relevant profiles:
>
> Do not show a broken or empty recommendation screen.
>
> Fallback:
>
> ```text
> Strong interest matches
>       ↓
> Admin-curated profiles
>       ↓
> Active/recommended profiles
>       ↓
> Broader community suggestions
> ```
>
> The user should still be able to continue.
>
> Example:
>
> > We found a few people you may enjoy.
>
> [profiles]
>
> ```text
> Continue
> ```
>
> ---
>
> # 17. STEP 4 — BUILDING YOUR AKỌ
>
> After interests and follows are completed, show a short transition/loading state.
>
> Possible copy:
>
> > ## Building your Akọ...
>
> or:
>
> > ## Finding your trybe...
>
> or:
>
> > ## Preparing your feed...
>
> The text can be tested later.
>
> The loading state should correspond to real work where possible:
>
> - saving interests
> - saving follows
> - preparing recommendation data
> - fetching initial posts
> - preparing feed preferences
>
> ### Requirements
>
> - [ ] Loading state appears after onboarding submission.
> - [ ] Duplicate submission is prevented.
> - [ ] Server operations complete safely.
> - [ ] Errors can be retried.
> - [ ] User cannot become permanently trapped in loading state.
> - [ ] Loading state does not pretend to perform nonexistent work.
>
> ---
>
> # 18. INITIAL FEED
>
> Once onboarding is complete:
>
> ```text
> onboarding_completed = true
> ```
>
> Then redirect the user into the main Akọ experience.
>
> The initial feed should use onboarding information where possible.
>
> Primary signals:
>
> ```text
> Followed people
>       +
> Selected interests
>       +
> Public/recommended content
> ```
>
> ---
>
> # 19. INITIAL FEED FALLBACK
>
> A new user should not receive a completely empty feed if enough public content exists.
>
> Recommended fallback:
>
> ```text
> Posts from followed users
>       ↓
> Interest-based posts
>       ↓
> Recommended posts
>       ↓
> Public/trending posts
> ```
>
> The exact feed-ranking algorithm can evolve later.
>
> ---
>
> # 20. DISCOVER REMAINS IMPORTANT
>
> Onboarding does not replace Discover.
>
> Discover should continue to help users find:
>
> - people
> - posts
> - topics
> - projects
> - communities
>
> The onboarding simply provides the user's first social graph.
>
> Users should be able to expand their network after entering the main app.
>
> ---
>
> # 21. PARTIAL ONBOARDING
>
> Users may leave before completing onboarding.
>
> Example:
>
> ```text
> Account created
> ↓
> Interests selected
> ↓
> App closed
> ```
>
> On next login:
>
> ```text
> Resume onboarding
> ```
>
> or another intentionally designed behavior.
>
> ### Requirements
>
> - [ ] Partial state is handled safely.
> - [ ] Refresh does not corrupt state.
> - [ ] Closing the app does not corrupt state.
> - [ ] Network failures can be retried.
> - [ ] Duplicate follows are impossible.
> - [ ] Duplicate interests are impossible.
> - [ ] Completed steps are not unnecessarily repeated.
>
> ---
>
> # 22. SECURITY REQUIREMENTS
>
> Assume the user can completely bypass the UI.
>
> The frontend must NOT be treated as a security boundary.
>
> Test:
>
> - [ ] Client cannot create a follow for another user.
> - [ ] Client cannot modify another user's interests.
> - [ ] Client cannot mark another user as followed without authorization.
> - [ ] Client cannot manipulate recommendation ownership.
> - [ ] Client cannot alter another user's onboarding state.
> - [ ] Client cannot insert arbitrary interest IDs.
> - [ ] Client cannot create duplicate follow relationships.
> - [ ] RLS policies are restrictive and tested.
> - [ ] Server-side authorization exists where required.
>
> ---
>
> # 23. RLS
>
> Review RLS for:
>
> ```text
> users/profiles
> interests
> user_interests
> follows
> onboarding state
> ```
>
> ### Requirements
>
> - [ ] RLS enabled where required.
> - [ ] Users can only modify their own interests.
> - [ ] Users cannot modify another user's follows.
> - [ ] Users cannot impersonate another user by modifying IDs.
> - [ ] Admin-only recommendation controls are protected.
> - [ ] Admin recommendation settings cannot be modified by ordinary users.
>
> ---
>
> # 24. ADMIN SECURITY
>
> The Admin Suggested Profiles page is privileged functionality.
>
> ### Requirements
>
> - [ ] Only authorized administrators can access it.
> - [ ] Admin status is determined server-side.
> - [ ] Client-side hiding of the admin page is NOT treated as security.
> - [ ] Admin API/database operations verify authorization.
> - [ ] Ordinary users cannot mark themselves as admin-suggested.
> - [ ] Ordinary users cannot change suggestion priority.
> - [ ] Ordinary users cannot activate/deactivate suggestions.
> - [ ] Admin changes are auditable where appropriate.
>
> ---
>
> # 25. ANALYTICS
>
> Track onboarding behavior to understand whether it works.
>
> Possible events:
>
> ```text
> onboarding_started
> onboarding_welcome_completed
> onboarding_interests_viewed
> onboarding_interest_selected
> onboarding_interests_completed
> onboarding_people_viewed
> onboarding_user_followed
> onboarding_people_completed
> onboarding_build_started
> onboarding_completed
> onboarding_abandoned
> ```
>
> Useful metrics:
>
> ```text
> completion rate
> average interests selected
> average people followed
> onboarding abandonment rate
> time to completion
> first-feed engagement
> first-session retention
> ```
>
> Do not collect unnecessary personal information.
>
> ---
>
> # 26. PRODUCT EXPERIMENTS
>
> The following can be tested later:
>
> ### Interest selection
>
> - minimum 3
> - minimum 5
> - no minimum
>
> ### Suggested people
>
> - 6 profiles
> - 8 profiles
> - 12 profiles
>
> ### Copy
>
> ```text
> Find your people
> ```
>
> vs.
>
> ```text
> Find your trybe
> ```
>
> ### Loading screen
>
> ```text
> Building your Akọ...
> ```
>
> vs.
>
> ```text
> Finding your trybe...
> ```
>
> Do not prematurely optimize these choices.
>
> Measure user behavior.
>
> ---
>
> # 27. MVP IMPLEMENTATION
>
> Keep the first version simple.
>
> ### Backend
>
> - [ ] Onboarding completion state
> - [ ] User-interest relationship
> - [ ] Follow relationship
> - [ ] Interest matching
> - [ ] Admin suggested-user flag/configuration
> - [ ] Recommendation query/function
> - [ ] Appropriate RLS policies
> - [ ] Server-side authorization
>
> ### Frontend
>
> - [ ] Welcome screen
> - [ ] Interest selection
> - [ ] Suggested people screen
> - [ ] Follow interaction
> - [ ] Loading state
> - [ ] Feed redirect
> - [ ] Error handling
> - [ ] Resume behavior
> - [ ] Mobile responsiveness
>
> ### Admin
>
> - [ ] Suggested profiles management page
> - [ ] Search/select users
> - [ ] Enable/disable suggestion
> - [ ] Optional priority
> - [ ] Optional interest association
>
> ---
>
> # 28. DO NOT OVERBUILD THE RECOMMENDATION ENGINE
>
> For the first release, do not build an unnecessarily complex machine-learning recommendation system.
>
> MVP can use:
>
> ```text
> Interest overlap
>       +
> Admin curation
>       +
> Basic activity/relevance
> ```
>
> This is enough to create a useful first experience.
>
> As Akọ gains users and behavioral data, recommendations can become more sophisticated.
>
> ---
>
> # 29. TEST SCENARIOS
>
> ## Test 1 — Brand-new user
>
> ```text
> Create account
> → Welcome
> → Select interests
> → Relevant people appear
> → Follow people
> → Loading
> → Feed
> ```
>
> Expected:
>
> ```text
> PASS
> ```
>
> ---
>
> ## Test 2 — Existing user
>
> ```text
> Login
> → Feed
> ```
>
> Expected:
>
> ```text
> Onboarding does not appear.
> ```
>
> ---
>
> ## Test 3 — Interest relevance
>
> User selects:
>
> ```text
> Technology
> ```
>
> Recommended users should have meaningful relevance to Technology where data exists.
>
> ---
>
> ## Test 4 — Multiple interests
>
> User selects:
>
> ```text
> Books
> Philosophy
> History
> ```
>
> Recommendation engine should consider all selected interests.
>
> ---
>
> ## Test 5 — Admin suggested profile
>
> Admin marks:
>
> ```text
> @Example
> Suggested = true
> ```
>
> Profile should be eligible for recommendation according to the recommendation rules.
>
> ---
>
> ## Test 6 — Admin suggestion relevance
>
> User selects:
>
> ```text
> Technology
> ```
>
> Admin-selected Technology profile should be eligible for strong ranking.
>
> An unrelated profile should not automatically dominate simply because it is admin-selected.
>
> ---
>
> ## Test 7 — Duplicate follow
>
> Attempt:
>
> ```text
> Follow @Example
> Follow @Example again
> ```
>
> Expected:
>
> ```text
> Only one follow relationship exists.
> ```
>
> ---
>
> ## Test 8 — Unauthorized follow
>
> Attempt to create:
>
> ```text
> follower_id = another user's ID
> ```
>
> Expected:
>
> ```text
> Request rejected.
> ```
>
> ---
>
> ## Test 9 — Unauthorized interest modification
>
> Attempt to modify another user's interests.
>
> Expected:
>
> ```text
> Request rejected.
> ```
>
> ---
>
> ## Test 10 — Refresh during onboarding
>
> Refresh while selecting interests.
>
> Expected:
>
> ```text
> State remains consistent.
> ```
>
> ---
>
> ## Test 11 — Network interruption
>
> Disconnect network during onboarding completion.
>
> Expected:
>
> ```text
> No corrupted state.
> Safe retry.
> ```
>
> ---
>
> # 30. DEFINITION OF DONE
>
> Onboarding is complete when:
>
> - [ ] New users enter onboarding automatically.
> - [ ] Welcome screen works.
> - [ ] User selects interests BEFORE people are recommended.
> - [ ] Interests are persisted.
> - [ ] Relevant people are generated from interests.
> - [ ] Admin-curated profiles can participate in recommendations.
> - [ ] Admin suggestions do not completely destroy relevance.
> - [ ] User can follow recommended people.
> - [ ] Follow relationships are persisted.
> - [ ] Duplicate follows are prevented.
> - [ ] Loading state works.
> - [ ] Feed is opened after onboarding.
> - [ ] Feed uses onboarding information.
> - [ ] Completed users bypass onboarding.
> - [ ] Partial onboarding is handled safely.
> - [ ] RLS is reviewed.
> - [ ] Authorization is reviewed.
> - [ ] Admin functionality is protected.
> - [ ] Mobile experience works.
> - [ ] No critical security issues remain.
>
> ---
>
> # 31. CLAUDE IMPLEMENTATION INSTRUCTION
>
> Before implementing this feature:
>
> 1. Inspect the existing repository.
> 2. Inspect the existing user/profile schema.
> 3. Inspect existing follows functionality.
> 4. Inspect existing interests/topics functionality.
> 5. Inspect existing feed logic.
> 6. Inspect existing admin pages.
> 7. Inspect existing RLS policies.
> 8. Reuse existing architecture where appropriate.
> 9. Do not create duplicate systems unnecessarily.
>
> Before creating migrations:
>
> - [ ] Inspect current database schema.
> - [ ] Inspect existing migrations.
> - [ ] Check whether an equivalent table/field already exists.
> - [ ] Follow existing naming conventions.
>
> ---
>
> # 32. CLAUDE SECURITY AUDIT INSTRUCTION
>
> After implementation, audit the feature as if the client were malicious.
>
> Do not assume:
>
> ```text
> "The UI prevents it."
> ```
>
> is a security control.
>
> Verify that:
>
> - [ ] user identity comes from authenticated context
> - [ ] authorization is server-side
> - [ ] RLS is correct
> - [ ] admin privileges cannot be forged
> - [ ] user IDs cannot be manipulated
> - [ ] interest IDs are validated
> - [ ] duplicate relationships are prevented
> - [ ] concurrent requests are safe
> - [ ] retrying requests is safe
> - [ ] onboarding state cannot be manipulated for another user
>
> Test backend endpoints directly where practical.
>
> ---
>
> # 33. FINAL UX PRINCIPLE
>
> The first Akọ experience should feel like a guided introduction to the community.
>
> Not:
>
> ```text
> Create account
> ↓
> Empty feed
> ↓
> "Who do I follow?"
> ```
>
> Instead:
>
> ```text
> Create account
> ↓
> "What are you interested in?"
> ↓
> "Here are people who reason about those things."
> ↓
> "Who do you want to follow?"
> ↓
> "We're preparing your Akọ."
> ↓
> Personalized feed
> ```
>
> The desired feeling is:
>
> **"I just arrived, and Akọ already helped me find my people."**
>
> ---
>
> # 34. FUTURE DIRECTION
>
> As Akọ grows, the onboarding recommendation system can evolve from simple rules into a richer discovery system.
>
> Future signals may include:
>
> - interests
> - followed users
> - mutual follows
> - post engagement
> - discussion participation
> - project activity
> - course/book/room interests
> - creator quality
> - topic affinity
> - communities
> - recommendation feedback
>
> But the principle should remain:
>
> ```text
> Understand the person
>        ↓
> Understand what they care about
>        ↓
> Help them find their people
>        ↓
> Give them something worth engaging with
> ```
>
> **Akọ — A Reason to Reason.**
