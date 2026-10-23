// src/pages/Landing.tsx
//
// The public front door at "/". Signed-out visitors used to be bounced straight to /login, which left Google's
// OAuth brand review (and anyone arriving from a shared link or a search result) with nothing but a sign-in form.
// Google requires the app's home page to be public, to say what the app does, and to link to the privacy policy
// and terms — the footer links do that. The page itself is just the statement and the ways in. Signed-in
// visitors never see it: HomeGate sends them through the same RequireAuth -> HomeRedirect path "/" always used.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { RequireAuth } from "../components/RequireAuth";
import { HomeRedirect } from "../components/RequireFullAccess";
import { Wordmark } from "../components/Wordmark";
import { AuthPattern } from "../components/AuthPattern";
import { AuthOrDivider, GoogleAuthButton } from "../components/GoogleAuthButton";

// "A Reason To Reason", one word per line, all lowercase.
const WORDS = ["a", "reason", "to", "reason"];

const TYPE_MS = 120; // per letter typed
const WIPE_MS = 65; // per letter wiped — quicker than typing, like holding backspace
const HOLD_MS = 950; // how long a finished word stays before it is wiped
const GAP_MS = 280; // beat between a word disappearing and the next one starting
const START_MS = 500;

type Phase = "typing" | "holding" | "wiping";

/**
 * The typewriter. Each word is typed on its own line, rests, is wiped, and then the cursor drops to the next
 * line for the next word. After the last word it starts over from the top.
 */
function useTypewriter() {
  const [line, setLine] = useState(0);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        if (!started) {
          setStarted(true);
          return;
        }
        const word = WORDS[line];
        if (phase === "typing") {
          if (count < word.length) setCount(count + 1);
          else setPhase("holding");
        } else if (phase === "holding") {
          setPhase("wiping");
        } else if (count > 0) {
          setCount(count - 1);
        } else {
          setLine((line + 1) % WORDS.length);
          setPhase("typing");
        }
      },
      !started
        ? START_MS
        : phase === "typing"
          ? count < WORDS[line].length
            ? TYPE_MS
            : HOLD_MS
          : phase === "holding"
            ? 0
            : count > 0
              ? WIPE_MS
              : GAP_MS
    );
    return () => window.clearTimeout(timer);
  }, [started, line, count, phase]);

  // The cursor only blinks when nothing is being typed or wiped (the rests and the gaps).
  const resting = !started || (phase === "typing" && count === WORDS[line].length) || phase === "holding" || (phase === "wiping" && count === 0);
  return { line, count, resting };
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function Statement() {
  const reduced = usePrefersReducedMotion();
  const { line, count, resting } = useTypewriter();

  return (
    <h1
      aria-label="A reason to reason"
      // Pure black on the light theme, pure white on the dark one, in the logo's lettering.
      className="font-logo font-bold lowercase text-black dark:text-white text-left tracking-tight leading-[1.02] text-[clamp(3.75rem,22vw,7.5rem)]"
    >
      {WORDS.map((word, i) => {
        const shown = reduced ? word : i === line ? word.slice(0, count) : "";
        return (
          // Every line keeps its height even while empty, so the statement never jumps as words come and go.
          <span key={i} aria-hidden="true" className="block min-h-[1.02em] whitespace-pre">
            {shown}
            {!reduced && i === line && (
              <span
                // Same colour as the text (currentColor), fainter. Solid while typing/wiping, blinking at rest.
                className="inline-block w-[0.075em] h-[0.78em] -mb-[0.02em] ml-[0.06em] align-baseline rounded-[1px] bg-current opacity-[0.38]"
                style={resting ? { animation: "ako-cursor-blink 1.05s step-end infinite" } : undefined}
              />
            )}
          </span>
        );
      })}
    </h1>
  );
}

export function Landing() {
  return (
    <div className="relative min-h-screen flex flex-col items-center px-6 bg-canvas overflow-hidden">
      <AuthPattern />

      <header className="relative z-10 w-full max-w-md pt-8">
        <Wordmark size="sm" />
      </header>

      <main className="relative z-10 w-full max-w-md flex-1 flex flex-col justify-center py-8">
        <Statement />
      </main>

      <div className="relative z-10 w-full max-w-md pb-6">
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
      </div>

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
