// src/components/AddAccountModal.tsx
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { useAddAccount } from "../hooks/useAccountSwitcher";

interface AddAccountModalProps {
  onClose: () => void;
  // Called after a successful add+switch — the caller decides where
  // that lands (e.g. AccountSwitcher navigates to the new account's
  // own profile), this modal only owns the sign-in form itself.
  onAdded: () => void;
}

// Sign-in for a SECOND personal account, from inside the switcher
// (see AccountSwitcher.tsx). Deliberately a plain email/password form
// rather than reusing the full Login page — this needs to stay a
// modal over whatever the person was already doing, not a navigation.
export function AddAccountModal({ onClose, onAdded }: AddAccountModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addAccount = useAddAccount();

  useBackDismiss(onClose);
  useScrollLock();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addAccount.mutateAsync({ email: email.trim(), password });
      onAdded();
    } catch (err: any) {
      setError(err.message ?? "Couldn't sign into that account.");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-canvas/70 backdrop-blur-overlay z-50 overflow-y-auto px-4 py-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add account"
    >
      <div
        className="w-full max-w-sm mx-auto bg-canvas rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-ink">Add account</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-muted">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-ink-muted mb-4">
          Sign into another personal account. Your current account stays saved on this device —
          switch back to it anytime from the same menu.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={addAccount.isPending || !email.trim() || !password}
            className="w-full bg-accent text-canvas rounded-xl py-3 text-sm font-medium disabled:opacity-60"
          >
            {addAccount.isPending ? "Signing in…" : "Add account"}
          </button>
        </form>
      </div>
    </div>
  );
}
