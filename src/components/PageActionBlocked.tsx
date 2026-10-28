// src/components/PageActionBlocked.tsx
// Shown instead of a creation screen when the person is acting as a page
// but their role on it doesn't include that action. The server refuses the
// action too — this just explains it instead of failing after they've typed.
import { useNavigate } from "react-router-dom";
import { useSwitchActiveMode } from "../hooks/usePages";

export function PageActionBlocked({ pageName, action }: { pageName: string; action: string }) {
  const navigate = useNavigate();
  const switchMode = useSwitchActiveMode();

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-xs space-y-4">
        <p className="text-ink">You don't have permission to {action} as {pageName}.</p>
        <p className="text-sm text-ink-muted">
          Ask a {pageName} admin to change your permissions, or switch back to your personal account.
        </p>
        <button
          type="button"
          disabled={switchMode.isPending}
          onClick={() => switchMode.mutate(null, { onSuccess: () => navigate("/me") })}
          className="w-full bg-cta text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-60"
        >
          Switch to personal account
        </button>
      </div>
    </div>
  );
}
