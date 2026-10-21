# Google sign-in — setup

Code is in `src/lib/googleAuth.ts`, `src/components/GoogleAuthButton.tsx` (Login + SignUp) and
`src/pages/auth/AuthCallback.tsx`. Nothing works until the one-time setup below is done.
The native app (`Ako.native`) uses the same Supabase project and the same Google client.

## 1. Google Cloud console
1. APIs & Services → **OAuth consent screen**: app name Akọ, support email, scopes `openid`, `email`, `profile`
   (the defaults — no sensitive scopes, so no Google verification review). Set **Publishing status → In production**,
   otherwise only listed test users can sign in.
2. APIs & Services → Credentials → **Create credentials → OAuth client ID → Web application**.
   - Authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
     (the project ref is the subdomain of `VITE_SUPABASE_URL`).
   - No "Authorized JavaScript origins" needed — the browser never talks to Google directly, Supabase does.
3. Copy the **Client ID** and **Client secret**.

## 2. Supabase dashboard
1. Authentication → Sign In / Providers → **Google** → enable, paste Client ID + Client secret.
2. Authentication → **URL Configuration**
   - Site URL: `https://myako.site`
   - Redirect URLs (add all): `https://myako.site/auth/callback`, `http://localhost:5173/auth/callback`
     (local dev), and for the native app `ako://auth/oauth`.

## 3. Database
Run `supabase/ako_google_auth_signup_defaults.sql` once (SQL editor). Google gives us a name and email but no
username, and the profile can't be created without one — without this, a first-time Google sign-up fails with
"Database error saving new user". It only fills in a username/display name when they're missing, so email
sign-ups are untouched.

Then run `supabase/ako_google_profile_setup.sql` (after the file above). It adds `profiles.profile_setup_completed`
and the `complete_profile_setup()` function behind the "Complete your profile" step.

## Behaviour worth knowing
- A brand-new Google account first lands on `/onboarding/profile` (native: `/onboarding/profile` screen) to choose a
  username and confirm their name, then continues with Welcome → Interests → People. The username the database
  generates from the email is only a placeholder. Returning Google users and email sign-ups never see this step.
- Sign-up and log-in are the same button: first use creates the account, later uses sign in.
- If someone already has an email/password account and signs in with Google using the same (verified) email,
  Supabase links the Google identity to that existing account rather than creating a second one.
- Google sign-ups go through the same onboarding and account-review gate as email sign-ups.
- Not offered in "add another account" mode (`?add=1`) — that flow needs the previous session snapshot, which a
  full-page redirect to Google can't carry. Use email/password there.
