// src/pages/Landing.tsx
//
// The public front door at "/". Signed-out visitors used to be bounced straight to /login, which left Google's
// OAuth brand review (and anyone arriving from a shared link or a search result) with nothing but a sign-in form.
// Google requires the app's home page to be public, to say what the app does, and to link to the privacy policy
// and terms — this page does exactly that. Signed-in visitors never see it: HomeGate sends them through the same
// RequireAuth -> HomeRedirect path "/" always used.
import { Link } from "react-router-dom";
import { BookOpen, Gift, MessageCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { RequireAuth } from "../components/RequireAuth";
import { HomeRedirect } from "../components/RequireFullAccess";
import { Wordmark } from "../components/Wordmark";
import { AuthPattern } from "../components/AuthPattern";
import { AuthOrDivider, GoogleAuthButton } from "../components/GoogleAuthButton";

const HIGHLIGHTS = [
  {
    icon: BookOpen,
    title: "Discover and share",
    text: "Posts, books, courses, events, rooms, gigs and music, all in one place.",
  },
  {
    icon: MessageCircle,
    title: "Connect with people",
    text: "Follow creators, message them, and join live rooms and meetings.",
  },
  {
    icon: Gift,
    title: "Support creators",
    text: "Send gifts, buy projects and earn from what you create.",
  },
];

export function Landing() {
  return (
    <div className="relative min-h-screen flex flex-col items-center px-6 bg-canvas overflow-hidden">
      <AuthPattern />

      <main className="relative z-10 w-full max-w-md flex-1 flex flex-col justify-center py-12">
        <div className="mb-8">
          <Wordmark />
        </div>

        <h1 className="font-display text-3xl text-ink text-center leading-tight">
          A home for people who learn and people who influence
        </h1>
        <p className="text-center text-[15px] leading-relaxed text-ink-muted mt-4">
          Akọ is a pan-African platform to discover and share projects, books, courses, events and more, and to
          connect with the creators and communities you care about.
        </p>

        <ul className="mt-8 space-y-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
              <Icon size={20} className="text-accent mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-ink">{title}</p>
                <p className="text-sm text-ink-muted mt-0.5">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <GoogleAuthButton />
          <AuthOrDivider />
          <Link
            to="/login"
            className="w-full h-[52px] px-6 rounded-full border border-border text-ink font-body text-base font-medium flex items-center justify-center hover:bg-surface transition-colors"
          >
            Log in with email
          </Link>
          <p className="text-center text-sm text-ink-muted mt-5">
            New to Akọ?{" "}
            <Link to="/signup" className="text-accent font-medium hover:underline">
              Create an account
            </Link>
          </p>
          <p className="text-center text-xs text-ink-muted mt-4">
            Continuing with Google shares your name and email address with Akọ. See how we use them in our{" "}
            <a href="/privacy" className="text-accent hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </main>

      <footer className="relative z-10 w-full max-w-md pb-8 text-center text-xs text-ink-muted">
        <a href="/privacy" className="hover:text-accent hover:underline">
          Privacy Policy
        </a>
        <span className="mx-2" aria-hidden="true">
          ·
        </span>
        <a href="/terms" className="hover:text-accent hover:underline">
          Terms of Service
        </a>
      </footer>
    </div>
  );
}

/** What "/" renders: the public landing page when signed out, the usual signed-in redirect otherwise. */
export function HomeGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!user) return <Landing />;

  return (
    <RequireAuth>
      <HomeRedirect />
    </RequireAuth>
  );
}
