import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Users, UserCircle2, UserX, VolumeX, AlertTriangle, LogOut, KeyRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  useTogglePrivateAccount,
  useToggleHideFollowersList,
  useToggleHideFollowingList,
  useBlockedList,
  useMutedList,
  useToggleBlock,
  useToggleMute,
  useChangePassword,
  useDeactivateAccount,
} from "../hooks/usePrivacy";
import { PasswordField } from "../components/PasswordField";
import { Avatar } from "../components/Avatar";

function useOwnPrivacySetting() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["own-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_private, hide_followers_list, hide_following_list")
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

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  pending: boolean;
  error?: string | null;
}

function ToggleRow({ icon, title, description, checked, onToggle, pending, error }: ToggleRowProps) {
  return (
    <div className="bg-surface rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-sm font-medium text-ink">{title}</p>
            <p className="text-xs text-ink-muted">{description}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={pending}
          aria-pressed={checked}
          className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 disabled:opacity-60 ${
            checked ? "bg-accent" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-canvas transition-transform ${
              checked ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {error && <p className="text-danger text-xs mt-2">{error}</p>}
    </div>
  );
}

export function Settings() {
  const navigate = useNavigate();
  const { data: privacy } = useOwnPrivacySetting();
  const togglePrivate = useTogglePrivateAccount();
  const toggleHideFollowers = useToggleHideFollowersList();
  const toggleHideFollowing = useToggleHideFollowingList();
  const { data: blocked } = useBlockedList();
  const { data: muted } = useMutedList();
  const deactivate = useDeactivateAccount();
  const changePassword = useChangePassword();

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

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

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    navigate("/login");
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordSuccess(false);
    changePassword.reset();

    if (newPassword.length < 8) {
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      // surfaced via changePassword.error below
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Privacy Settings</h2>
        </div>

        <ToggleRow
          icon={<Lock size={18} className="text-ink-muted" />}
          title="Private account"
          description="Only followers can see your posts"
          checked={!!privacy?.is_private}
          onToggle={() => togglePrivate.mutate(!privacy?.is_private)}
          pending={togglePrivate.isPending}
          error={togglePrivate.isError ? "Couldn't update this setting. Try again." : null}
        />

        <ToggleRow
          icon={<Users size={18} className="text-ink-muted" />}
          title="Hide followers list"
          description="Others won't be able to see who follows you"
          checked={!!privacy?.hide_followers_list}
          onToggle={() => toggleHideFollowers.mutate(!privacy?.hide_followers_list)}
          pending={toggleHideFollowers.isPending}
          error={toggleHideFollowers.isError ? "Couldn't update this setting. Try again." : null}
        />

        <ToggleRow
          icon={<UserCircle2 size={18} className="text-ink-muted" />}
          title="Hide following list"
          description="Others won't be able to see who you follow"
          checked={!!privacy?.hide_following_list}
          onToggle={() => toggleHideFollowing.mutate(!privacy?.hide_following_list)}
          pending={toggleHideFollowing.isPending}
          error={toggleHideFollowing.isError ? "Couldn't update this setting. Try again." : null}
        />

        <div className="mb-6" />

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

        <div className="border-t border-border pt-6 mb-6">
          <button
            onClick={() => {
              setShowPasswordForm((v) => !v);
              setPasswordSuccess(false);
              changePassword.reset();
            }}
            className="flex items-center gap-2 text-sm font-medium text-ink"
          >
            <KeyRound size={16} className="text-ink-muted" />
            Change password
          </button>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="mt-4">
              <PasswordField
                id="current_password"
                label="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <PasswordField
                id="new_password"
                label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              {changePassword.isError && (
                <p className="text-danger text-sm mb-4" role="alert">
                  {changePassword.error instanceof Error
                    ? changePassword.error.message
                    : "Couldn't change your password."}
                </p>
              )}
              {passwordSuccess && (
                <p className="text-accent text-sm mb-4">Password updated.</p>
              )}
              <button
                type="submit"
                disabled={changePassword.isPending}
                className="w-full bg-accent text-canvas py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {changePassword.isPending ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>

        <div className="border-t border-border pt-6 mb-6">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            <LogOut size={16} className="text-ink-muted" />
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
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
