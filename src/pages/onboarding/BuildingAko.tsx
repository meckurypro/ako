// src/pages/onboarding/BuildingAko.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompleteOnboarding } from "../../hooks/useOnboarding";
import { Wordmark } from "../../components/Wordmark";
import { Button } from "../../components/Button";

const MIN_DISPLAY_MS = 1100;

// Step 4 — interests and follows are already persisted (previous
// steps write as the user picks them), so the one thing actually left
// to do here is flip the completion flag server-side. That's real
// work, not a fake delay (spec §17's "does not pretend to perform
// nonexistent work") — the minimum display time just keeps it from
// flashing on a fast connection.
export function BuildingAko() {
  const navigate = useNavigate();
  const completeOnboarding = useCompleteOnboarding();
  const [failed, setFailed] = useState(false);
  const cancelledRef = useRef(false);

  const run = useCallback(async () => {
    setFailed(false);
    const startedAt = Date.now();
    try {
      await completeOnboarding.mutateAsync();

      const elapsed = Date.now() - startedAt;
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, MIN_DISPLAY_MS - elapsed)));

      if (!cancelledRef.current) navigate("/feed", { replace: true });
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
      if (!cancelledRef.current) setFailed(true);
    }
  }, [completeOnboarding, navigate]);

  useEffect(() => {
    cancelledRef.current = false;
    run();
    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="mb-8">
        <Wordmark asIcon iconTagline={false} />
      </div>

      {!failed ? (
        <>
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="font-display text-xl text-ink mb-2">Building your Akọ…</h2>
          <p className="text-ink-muted text-sm max-w-xs">Getting your feed ready.</p>
        </>
      ) : (
        <>
          <h2 className="font-display text-xl text-ink mb-2">Something went wrong</h2>
          <p className="text-ink-muted text-sm max-w-xs mb-6">
            We couldn't finish setting up your Akọ. Check your connection and try again.
          </p>
          <div className="w-40">
            <Button onClick={run} loading={completeOnboarding.isPending}>
              Try again
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
