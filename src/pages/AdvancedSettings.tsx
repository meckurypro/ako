import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useDeactivateAccount } from "../hooks/usePrivacy";

export function AdvancedSettings() {
  const navigate = useNavigate();
  const deactivate = useDeactivateAccount();

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  async function handleDeactivate() {
    setDeactivating(true);
    setDeactivateError(null);
    try {
      await deactivate.mutateAsync();
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err) {
      setDeactivateError(err instanceof Error ? err.message : "Couldn't deactivate account.");
      setDeactivating(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Advanced Settings</h2>
        </div>

        {!showDeactivateConfirm ? (
          <button
            onClick={() => setShowDeactivateConfirm(true)}
            className="text-sm text-danger font-medium"
          >
            Deactivate account
          </button>
        ) : (
          <div className="bg-danger/10 rounded-xl p-4">
            <div className="flex gap-2 mb-2">
              <AlertTriangle size={18} className="text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-ink">
                This signs you out everywhere and hides your profile and posts. Your wallet
                and transaction history are kept for financial record-keeping — this can't be
                undone from the app.
              </p>
            </div>
            {deactivateError && <p className="text-danger text-sm mb-2">{deactivateError}</p>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="flex-1 bg-danger text-canvas py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {deactivating ? "Deactivating…" : "Confirm deactivation"}
              </button>
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="flex-1 bg-canvas border border-border text-ink-muted py-2.5 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
