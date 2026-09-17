// src/pages/onboarding/Welcome.tsx
import { useNavigate } from "react-router-dom";
import { Wordmark } from "../../components/Wordmark";
import { Button } from "../../components/Button";
import { AuthPattern } from "../../components/AuthPattern";

// Step 1 of NewUserOnboarding.md — deliberately just a landing beat,
// not a tutorial (see spec §5's own requirement not to let this become
// a long product walkthrough).
//
// Same auth-screen background treatment as Login/SignUp/VerifyEmail
// (see AuthPattern.tsx) — onboarding is a direct continuation of that
// flow, so it shouldn't suddenly drop to a bare canvas.
export function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-canvas px-6 text-center overflow-hidden">
      <AuthPattern />
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-10">
          <Wordmark />
        </div>

        <h1 className="font-display text-2xl text-ink mb-3">Welcome to Akọ</h1>
        <p className="text-ink-muted mb-10 max-w-xs">
          Tell us what interests you. We'll help you find your people.
        </p>

        <div className="w-full max-w-xs">
          <Button onClick={() => navigate("/onboarding/interests")}>Get started</Button>
        </div>
      </div>
    </div>
  );
}
