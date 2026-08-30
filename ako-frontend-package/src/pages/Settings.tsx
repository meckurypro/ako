import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, UserX, VolumeX, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useTogglePrivateAccount, useBlockedList, useMutedList, useToggleBlock, useToggleMute, useDeactivateAccount } from "../hooks/usePrivacy";
import { Avatar } from "../components/Avatar";

function useOwnPrivacySetting() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["own-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_private")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

function UnblockButton({ userId }: { userId: string }) {
  const toggle = useToggleBlock(userId);
  return (
    <button
      onClick={() => toggle.mutate(true)}
      disabled={toggle.isPending}
      className="text-sm text-accent font-medium"
    >
      Unblock
    </button>
  );
}

function UnmuteButton({ userId }: { userId: string }) {
  const toggle = useToggleMute(userId);
  return (
    <button
      onClick={() => toggle.mutate(true)}
      disabled={toggle.isPending}
      className="text-sm text-accent font-medium"
    >
      Unmute
    </button>
  );
}

export function Settings() {
  const navigate = useNavigate();
  const { data: privacy } = useOwnPrivacySetting();
  const togglePrivate = useTogglePrivateAccount();
  const { data: blocked } = useBlockedList();
  const { data: muted } = useMutedList();
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
          <h2 className="font-display text-xl text-ink">Settings & Privacy</h2>
        </div>

        <div className="bg-surface rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock size={18} className="text-ink-muted" />
            <div>
              <p className="text-sm font-medium text-ink">Private account</p>
              <p className="text-xs text-ink-muted">Only followers can see your posts</p>
            </div>
          </div>
          <button
            onClick={() => togglePrivate.mutate(!privacy?.is_private)}
            disabled={togglePrivate.isPending}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              privacy?.is_private ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-canvas transition-transform ${
                privacy?.is_private ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <h3 className="text-sm font-medium text-ink-muted mb-2 flex items-center gap-1.5">
          <UserX size={14} />
          Blocked accounts
        </h3>
        <div className="space-y-2 mb-6">
          {!blocked || blocked.length === 0 ? (
            <p className="text-sm text-ink-muted">No blocked accounts.</p>
          ) : (
            blocked.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-surface rounded-xl p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
                  <span className="text-sm text-ink">{p.display_name}</span>
                </div>
                <UnblockButton userId={p.id} />
              </div>
            ))
          )}
        </div>

        <h3 className="text-sm font-medium text-ink-muted mb-2 flex items-center gap-1.5">
          <VolumeX size={14} />
          Muted accounts
        </h3>
        <div className="space-y-2 mb-8">
          {!muted || muted.length === 0 ? (
            <p className="text-sm text-ink-muted">No muted accounts.</p>
          ) : (
            muted.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-surface rounded-xl p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
                  <span className="text-sm text-ink">{p.display_name}</span>
                </div>
                <UnmuteButton userId={p.id} />
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border pt-6">
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
    </div>
  );
}
