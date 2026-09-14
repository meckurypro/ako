// src/pages/NotFound.tsx
import { useNavigate } from "react-router-dom";
import { Compass } from "lucide-react";
import { useSmartBack } from "../hooks/useSmartBack";

/**
 * Catch-all for any URL that doesn't match a route — a mistyped link,
 * a stale bookmark to something that's since been removed outright
 * (not redirected), or a deliberately malformed deep link. Before
 * this existed, App.tsx's <Routes> had no wildcard entry, so any of
 * those cases rendered nothing at all: a blank canvas-colored screen
 * with no heading, no nav, and no way out except the browser's own
 * back button. This gives that dead end a door again.
 */
export function NotFound() {
  const navigate = useNavigate();
  const smartBack = useSmartBack();

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 text-center">
      <span className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-soft text-accent mb-4">
        <Compass size={26} />
      </span>
      <h1 className="font-display text-xl text-ink mb-1">Page not found</h1>
      <p className="text-sm text-ink-muted max-w-xs mb-6">
        That link doesn't lead anywhere — it may be mistyped, or the thing it pointed to
        isn't there anymore.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={smartBack}
          className="px-5 py-2.5 rounded-full border border-border text-sm font-medium text-ink"
        >
          Go back
        </button>
        <button
          onClick={() => navigate("/feed", { replace: true })}
          className="px-5 py-2.5 rounded-full bg-accent text-canvas text-sm font-medium"
        >
          Go to Feed
        </button>
      </div>
    </div>
  );
}
