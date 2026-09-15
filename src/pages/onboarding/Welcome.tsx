// src/pages/onboarding/Welcome.tsx
import { useNavigate } from "react-router-dom";
import { Wordmark } from "../../components/Wordmark";
import { Button } from "../../components/Button";

// Step 1 of NewUserOnboarding.md — deliberately just a landing beat,
// not a tutorial (see spec §5's own requirement not to let this become
// a long product walkthrough).
export function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-6 text-center">
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
  );
}
