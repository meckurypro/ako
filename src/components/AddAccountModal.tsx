// src/components/AddAccountModal.tsx
import { useState } from "react";
import { X } from "lucide-react";
import { Modal } from "./Modal";
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
//
// Built on the shared <Modal> wrapper — see Modal.tsx for what that
// centralizes. This file previously hand-rolled its own version
// without a <Portal>, which meant opening it from anywhere already
// rendering inside SwipeableTabs' translateX'd pane (e.g. the account
// switcher from ProfilePage) clipped/offset it instead of centering
// on the real viewport.
export function AddAccountModal({ onClose, onAdded }: AddAccountModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addAccount = useAddAccount();

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
    <Modal onClose={onClose} ariaLabel="Add account">
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
    </Modal>
  );
}
