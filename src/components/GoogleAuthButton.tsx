// src/components/GoogleAuthButton.tsx
import { useState } from "react";
import { signInWithGoogle } from "../lib/googleAuth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

interface GoogleAuthButtonProps {
  /** Where the visitor was headed (already run through safeReturnPath). */
  returnTo?: string | null;
  /** "Continue with Google" on sign-up pages reads "Sign up with Google". */
  label?: string;
}

/**
 * The primary way in. Google is the first and most prominent action on Login
 * and SignUp; email is the quieter alternative below it (see AuthOrDivider and
 * the "Continue with email" reveal in those pages).
 */
export function GoogleAuthButton({ returnTo, label = "Continue with Google" }: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    const message = await signInWithGoogle(returnTo);
    // On success the browser is already navigating away — only a failure returns here.
    if (message) {
      setLoading(false);
      setError(message);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        // Google's own light / dark button styles, matched to the app theme: a light button on the light theme, a
        // dark one on the dark theme (never the inverse, which is what bg-ink / text-canvas produced).
        className="w-full h-12 px-6 rounded-xl border border-[#747775] bg-white text-[#1F1F1F] dark:border-[#8E918F] dark:bg-[#131314] dark:text-[#E3E3E3] font-body font-semibold flex items-center justify-center gap-3 transition-[transform,background-color,opacity] active:scale-[0.99] hover:bg-[#F2F2F2] dark:hover:bg-[#1E1F20] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <GoogleIcon />
        {loading ? "Redirecting…" : label}
      </button>

      {error && (
        <p className="text-danger text-sm mt-3 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** The quiet "or" rule between the primary Google action and the email alternative. */
export function AuthOrDivider() {
  return (
    <div className="flex items-center gap-3 my-5" aria-hidden="true">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs uppercase tracking-wider text-ink-muted">or</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
