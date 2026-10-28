// src/pages/Landing.tsx
//
// The public front door at "/". Signed-out visitors used to be bounced straight to /login, which left Google's
// OAuth brand review (and anyone arriving from a shared link or a search result) with nothing but a sign-in form.
// Google requires the app's home page to be public, to say what the app does, and to link to the privacy policy
// and terms — the footer links do that. The page itself is just the statement and the ways in. Signed-in
// visitors never see it: HomeGate sends them through the same RequireAuth -> HomeRedirect path "/" always used.
import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { RequireAuth } from "../components/RequireAuth";
import { HomeRedirect } from "../components/RequireFullAccess";
import { Wordmark } from "../components/Wordmark";
import { AuthPattern } from "../components/AuthPattern";
import { AuthOrDivider, GoogleAuthButton } from "../components/GoogleAuthButton";

// "A Reason To Reason", all lowercase like the logo, set as two lines in the display serif, with the second
// "reason" in italic (the verb: the thing you are invited to do).
const LINES: Array<Array<{ text: string; em?: boolean }>> = [[{ text: "a reason" }], [{ text: "to " }, { text: "reason", em: true }]];

// Flattened once: every segment knows which line it sits on and where it starts in the whole run of characters.
type Seg = { text: string; em: boolean; start: number; line: number };
const SEGS: Seg[] = (() => {
  let start = 0;
  return LINES.flatMap((segs, line) =>
    segs.map((s) => {
      const seg = { text: s.text, em: !!s.em, start, line };
      start += s.text.length;
      return seg;
    })
  );
})();
const FULL = SEGS.map((s) => s.text).join("");
const TOTAL = FULL.length;
const LINE_STARTS = new Set(SEGS.filter((s, i) => i === 0 || s.line !== SEGS[i - 1].line).map((s) => s.start));

// Timing. The whole statement is typed first, then HELD so it can actually be read, then dissolved and replayed — it is
// never wiped line by line while you are still reading it. A pass is ~8s, of which ~6s is the finished statement.
const FONT_WAIT_MS = 1200; // the most the typing will wait for the display font before it starts regardless
const FIRST_MS = 280; // before the very first letter (once the font is ready)
const RESTART_MS = 380; // blank beat between one pass and the next
const TYPE_MS = 62; // average per letter typed…
const TYPE_JITTER = 0.4; // …varied by up to ±40%, so it feels typed by a hand rather than clocked
const SPACE_BEAT_MS = 90; // a hair of a pause after a space
const LINE_BEAT_MS = 260; // the cursor drops to the second line, then waits a moment before typing
const GLINT_AFTER_MS = 450; // once complete, a soft wave of light runs across the letters
const HOLD_MS = 5200; // the finished statement stays this long
const LEAVE_MS = 700; // …then dissolves (see .ako-hero.is-leaving)

type Phase = "typing" | "leaving";

/** Types the statement once through, holds it, dissolves it, and starts over. */
function useTypewriter() {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [glint, setGlint] = useState(false);
  const [pass, setPass] = useState(0);
  const [fontReady, setFontReady] = useState(false);

  const done = phase === "typing" && count === TOTAL;

  // The display font (Fraunces) arrives from Google Fonts with font-display: swap. Typing in the fallback serif and then
  // jumping when it swaps in mid-animation looks cheap, so wait for it (capped — a slow font never holds the page up).
  useEffect(() => {
    let alive = true;
    const ready = () => alive && setFontReady(true);
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fonts?.load) {
      ready();
      return;
    }
    const cap = window.setTimeout(ready, FONT_WAIT_MS);
    Promise.all([fonts.load("400 96px Fraunces", "a reason to"), fonts.load("italic 400 96px Fraunces", "reason")]).then(ready, ready);
    return () => {
      alive = false;
      window.clearTimeout(cap);
    };
  }, []);

  useEffect(() => {
    if (!fontReady) return;
    let delay: number;
    let act: () => void;
    if (phase === "typing") {
      if (count < TOTAL) {
        delay =
          count === 0
            ? pass === 0
              ? FIRST_MS
              : RESTART_MS
            : (LINE_STARTS.has(count) ? LINE_BEAT_MS : 0) +
              (FULL.charAt(count - 1) === " " ? SPACE_BEAT_MS : 0) +
              TYPE_MS * (1 + (Math.random() * 2 - 1) * TYPE_JITTER);
        act = () => setCount((c) => c + 1);
      } else {
        delay = HOLD_MS;
        act = () => {
          setGlint(false);
          setPhase("leaving");
        };
      }
    } else {
      delay = LEAVE_MS;
      act = () => {
        setCount(0);
        setPass((p) => p + 1);
        setPhase("typing");
      };
    }
    const timer = window.setTimeout(act, delay);
    return () => window.clearTimeout(timer);
  }, [fontReady, phase, count, pass]);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setGlint(true), GLINT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [done]);

  // The cursor sits on the line of the next letter to be typed (so it drops to line two during the beat, before the
  // first letter lands), and only blinks when nothing is being typed.
  const cursorLine = (SEGS.find((s) => Math.min(count, TOTAL - 1) < s.start + s.text.length) ?? SEGS[SEGS.length - 1]).line;
  const resting = count === 0 || done;
  return { count, phase, glint, cursorLine, resting };
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
  const { count, phase, glint, cursorLine, resting } = useTypewriter();
  const shown = reduced ? TOTAL : count;

  return (
    <h1
      aria-label="A reason to reason"
      // Typography and colour live in .ako-hero (index.css): Fraunces at a mid optical size (the highest one has hairline
      // crossbars that make "reason" read as "rcason"), deep forest green with a sage italic in light mode, warm white
      // with a green italic in dark mode. The only orange is the cursor.
      className={`ako-hero font-display font-normal lowercase text-left leading-[0.98] text-[clamp(3rem,22cqw,6rem)] ${
        !reduced && phase === "leaving" ? "is-leaving" : ""
      } ${!reduced && glint ? "is-glinting" : ""}`}
    >
      {LINES.map((_, li) => (
        // Every line keeps its height even while empty, so the statement never jumps as it is typed.
        <span key={li} aria-hidden="true" className="block min-h-[0.98em] whitespace-pre">
          {SEGS.filter((seg) => seg.line === li).map((seg) => {
            const visible = seg.text.slice(0, Math.max(0, Math.min(seg.text.length, shown - seg.start)));
            return (
              <span key={seg.start} className={seg.em ? "ako-hero-em" : undefined}>
                {reduced
                  ? visible
                  : // Each typed letter is its own inline span (so font kerning is intact): the outer one fades the newest
                    // letter in, the inner one carries the light wave (--i staggers it letter by letter).
                    [...visible].map((ch, j) => (
                      <span key={j} className="ako-letter">
                        <span className="ako-glint" style={{ "--i": seg.start + j } as CSSProperties}>
                          {ch}
                        </span>
                      </span>
                    ))}
              </span>
            );
          })}
          {!reduced && li === cursorLine && (
            // Brand orange. The outer span (re-keyed per line) plays a short "landing" each time the cursor drops to the
            // next line; the inner one is solid while typing and blinks at rest.
            <span key={cursorLine} className="ako-cursor-land inline-block align-baseline ml-[0.08em] -mb-[0.02em]">
              <span
                className="ako-cursor block w-[0.06em] h-[0.66em] rounded-[1px]"
                style={resting ? { animation: "ako-cursor-blink 1.05s step-end infinite" } : undefined}
              />
            </span>
          )}
        </span>
      ))}
    </h1>
  );
}

export function Landing() {
  return (
    <div className="relative min-h-screen flex flex-col items-center px-6 bg-canvas overflow-hidden">
      <AuthPattern />

      <header className="ako-rise relative z-10 w-full max-w-md pt-8" style={{ "--rise-delay": "60ms" } as CSSProperties}>
        <Wordmark size="sm" />
      </header>

      {/* @container: the statement is sized from this column's width (cqw), so it always fits the column. */}
      <main className="@container relative z-10 w-full max-w-md flex-1 flex flex-col justify-center py-8">
        {/* A calm zone: quiets the textile pattern right behind the statement (the italic's hairlines read best on a
            plain ground) and gives it a faint green lift. Behind the text, above the pattern. */}
        <div aria-hidden="true" className="ako-hero-calm pointer-events-none absolute -inset-x-16 -inset-y-8 -z-10" />
        <Statement />
      </main>

      <div className="ako-rise relative z-10 w-full max-w-md pb-6" style={{ "--rise-delay": "520ms" } as CSSProperties}>
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

      <footer
        className="ako-rise relative z-10 w-full max-w-md pb-8 text-center text-xs text-ink-muted"
        style={{ "--rise-delay": "760ms" } as CSSProperties}
      >
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
