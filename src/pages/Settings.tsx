import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  UserCircle2,
  KeyRound,
  Shield,
  Lock,
  Users,
  UserX,
  VolumeX,
  Palette,
  Sun,
  Moon,
  MonitorSmartphone,
  Check,
  SlidersHorizontal,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useUpdateProfile, useUpdateProfileRoles } from "../hooks/useProfile";
import { useUploadAvatar } from "../hooks/useUploadAvatar";
import { useRoles } from "../hooks/useRoles";
import { PROFILE_ROLES_SELECT } from "../lib/profileRoles";
import { useTheme, type ThemeSetting } from "../hooks/useTheme";
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
import { FormField } from "../components/FormField";
import { Button } from "../components/Button";
import { PasswordField } from "../components/PasswordField";
import { Avatar } from "../components/Avatar";
import { SettingsSection } from "../components/SettingsSection";

// Own-profile lookup by id, since this page doesn't have :username in the URL
function useOwnProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["own-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`*, ${PROFILE_ROLES_SELECT}, is_private, hide_followers_list, hide_following_list`)
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

// Pixel-exact positions rather than a translate-x transform: 44px pill
// (w-11), 20px knob (w-5) needs 2px of breathing room on every side.
// Off sits the knob's left edge at 2px; on sits it at 44 - 20 - 2 = 22px.
// Tailwind v4 renders translate via the CSS `translate` property rather
// than `transform`, so an implicit "as if static" left edge doesn't hold —
// explicit `left` values sidestep that. `overflow-hidden` on the pill is a
// second safety net so the knob can never visually spill past the capsule.
function ToggleRow({ icon, title, description, checked, onToggle, pending, error }: ToggleRowProps) {
  return (
    <div className="bg-canvas rounded-xl p-4 mb-3">
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
          className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 overflow-hidden disabled:opacity-60 ${
            checked ? "bg-accent" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-canvas transition-[left] ${
              checked ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
      {error && <p className="text-danger text-xs mt-2">{error}</p>}
    </div>
  );
}

const THEME_OPTIONS: { value: ThemeSetting; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Light",
    description: "Always use the light theme",
    icon: <Sun size={18} className="text-ink-muted" />,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use the dark theme",
    icon: <Moon size={18} className="text-ink-muted" />,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device's setting",
    icon: <MonitorSmartphone size={18} className="text-ink-muted" />,
  },
];

export function Settings() {
  const navigate = useNavigate();

  // ---- Profile ----
  const { data: profile, isLoading: profileLoading } = useOwnProfile();
  const updateProfile = useUpdateProfile();
  const updateProfileRoles = useUpdateProfileRoles();
  const uploadAvatar = useUploadAvatar();
  const { data: roles } = useRoles();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setWebsiteUrl(profile.website_url ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      const sorted = [...(profile.profile_roles ?? [])].sort(
        (a: any, b: any) => a.position - b.position
      );
      setRoleIds(sorted.map((r: any) => r.role.id));
    }
  }, [profile]);

  function toggleRole(id: string) {
    setRoleIds((prev) => {
      if (prev.includes(id)) return prev.filter((r) => r !== id);
      if (prev.length >= 3) return prev; // cap at 3, ignore further taps
      return [...prev, id];
    });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    try {
      const url = await uploadAvatar.mutateAsync(file);
      setAvatarUrl(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      e.target.value = "";
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSaved(false);

    try {
      await Promise.all([
        updateProfile.mutateAsync({
          display_name: displayName,
          bio,
          website_url: websiteUrl,
          avatar_url: avatarUrl,
        }),
        updateProfileRoles.mutateAsync(roleIds),
      ]);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Couldn't save changes.");
    }
  }

  // ---- Account & security ----
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordSuccess(false);
    changePassword.reset();

    if (newPassword.length < 8) return;

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      // surfaced via changePassword.error below
    }
  }

  // ---- Privacy ----
  const togglePrivate = useTogglePrivateAccount();
  const toggleHideFollowers = useToggleHideFollowersList();
  const toggleHideFollowing = useToggleHideFollowingList();
  const { data: blocked } = useBlockedList();
  const { data: muted } = useMutedList();

  // ---- Appearance ----
  const { theme, setTheme } = useTheme();
  const themeLabel = THEME_OPTIONS.find((o) => o.value === theme)?.label ?? "System";

  // ---- Advanced / danger zone ----
  const deactivate = useDeactivateAccount();
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
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

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Settings</h2>
        </div>

        <div className="flex flex-col gap-3">
          {/* Profile — the section people open most often, so it's the one
              expanded by default; everything else starts collapsed. */}
          <SettingsSection
            icon={<UserCircle2 size={18} />}
            title="Profile"
            summary={displayName || undefined}
            defaultOpen
          >
            <form onSubmit={handleSaveProfile}>
              <div className="flex flex-col items-center mb-6 mt-3">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="relative">
                  <Avatar src={avatarUrl} name={displayName || "?"} size="lg" />
                  <span className="absolute bottom-0 right-0 bg-accent text-canvas rounded-full p-1.5">
                    <Camera size={14} />
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-accent font-medium mt-2"
                  disabled={uploadAvatar.isPending}
                >
                  {uploadAvatar.isPending ? "Uploading…" : "Change photo"}
                </button>
                {uploadError && <p className="text-danger text-sm mt-1">{uploadError}</p>}
              </div>

              <FormField
                id="display_name"
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />

              <div className="mb-4">
                <label htmlFor="bio" className="block text-sm font-medium text-ink-muted mb-1.5">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={280}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink resize-none
                    focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
                <p className="text-xs text-ink-muted mt-1">{bio.length}/280</p>
              </div>

              <FormField
                id="website_url"
                label="Website"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://"
              />

              {roles && roles.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-ink-muted mb-1.5">
                    Job or hobby <span className="text-ink-muted/70">({roleIds.length}/3)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => {
                      const selected = roleIds.includes(role.id);
                      const disabled = !selected && roleIds.length >= 3;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => toggleRole(role.id)}
                          disabled={disabled}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            selected
                              ? "bg-accent text-canvas border-accent"
                              : disabled
                              ? "bg-canvas text-ink-muted/50 border-border cursor-not-allowed"
                              : "bg-canvas text-ink border-border"
                          }`}
                        >
                          {role.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {profileError && (
                <p className="text-danger text-sm mb-4" role="alert">
                  {profileError}
                </p>
              )}
              {profileSaved && <p className="text-accent text-sm mb-4">Profile updated.</p>}

              <Button type="submit" loading={updateProfile.isPending || updateProfileRoles.isPending}>
                Save changes
              </Button>
            </form>
          </SettingsSection>

          {/* Account & security */}
          <SettingsSection icon={<KeyRound size={18} />} title="Account &amp; security">
            <form onSubmit={handleChangePassword} className="mt-3">
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
              {passwordSuccess && <p className="text-accent text-sm mb-4">Password updated.</p>}
              <Button type="submit" loading={changePassword.isPending}>
                Update password
              </Button>
            </form>
          </SettingsSection>

          {/* Privacy */}
          <SettingsSection
            icon={<Shield size={18} />}
            title="Privacy"
            summary={profile?.is_private ? "Private" : "Public"}
          >
            <div className="mt-3">
              <ToggleRow
                icon={<Lock size={18} className="text-ink-muted" />}
                title="Private account"
                description="Only followers can see your posts"
                checked={!!profile?.is_private}
                onToggle={() => togglePrivate.mutate(!profile?.is_private)}
                pending={togglePrivate.isPending}
                error={togglePrivate.isError ? "Couldn't update this setting. Try again." : null}
              />
              <ToggleRow
                icon={<Users size={18} className="text-ink-muted" />}
                title="Hide followers list"
                description="Others won't be able to see who follows you"
                checked={!!profile?.hide_followers_list}
                onToggle={() => toggleHideFollowers.mutate(!profile?.hide_followers_list)}
                pending={toggleHideFollowers.isPending}
                error={toggleHideFollowers.isError ? "Couldn't update this setting. Try again." : null}
              />
              <ToggleRow
                icon={<UserCircle2 size={18} className="text-ink-muted" />}
                title="Hide following list"
                description="Others won't be able to see who you follow"
                checked={!!profile?.hide_following_list}
                onToggle={() => toggleHideFollowing.mutate(!profile?.hide_following_list)}
                pending={toggleHideFollowing.isPending}
                error={toggleHideFollowing.isError ? "Couldn't update this setting. Try again." : null}
              />

              <h3 className="text-sm font-medium text-ink-muted mt-5 mb-2 flex items-center gap-1.5">
                <UserX size={14} />
                Blocked accounts
              </h3>
              <div className="space-y-2 mb-5">
                {!blocked || blocked.length === 0 ? (
                  <p className="text-sm text-ink-muted">No blocked accounts.</p>
                ) : (
                  blocked.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-canvas rounded-xl p-3">
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
              <div className="space-y-2">
                {!muted || muted.length === 0 ? (
                  <p className="text-sm text-ink-muted">No muted accounts.</p>
                ) : (
                  muted.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-canvas rounded-xl p-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
                        <span className="text-sm text-ink">{p.display_name}</span>
                      </div>
                      <UnmuteButton userId={p.id} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </SettingsSection>

          {/* Appearance */}
          <SettingsSection icon={<Palette size={18} />} title="Appearance" summary={themeLabel}>
            <div className="rounded-xl overflow-hidden border border-border mt-3">
              {THEME_OPTIONS.map((opt, i) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  aria-pressed={theme === opt.value}
                  className={`w-full flex items-center gap-3 p-4 text-left bg-canvas ${
                    i > 0 ? "border-t border-border" : ""
                  }`}
                >
                  {opt.icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{opt.label}</p>
                    <p className="text-xs text-ink-muted">{opt.description}</p>
                  </div>
                  {theme === opt.value && <Check size={18} className="text-accent flex-shrink-0" />}
                </button>
              ))}
            </div>
          </SettingsSection>

          {/* Advanced / danger zone — kept last and on its own, the standard
              place for irreversible actions so they're never mistaken for a
              routine toggle. */}
          <SettingsSection icon={<SlidersHorizontal size={18} />} title="Advanced" danger>
            <div className="mt-3">
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
                      and transaction history are kept for financial record-keeping — this can't
                      be undone from the app.
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
          </SettingsSection>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 justify-center text-sm text-ink-muted mt-8 mx-auto disabled:opacity-50"
        >
          <LogOut size={16} />
          {loggingOut ? "Logging out…" : "Log out"}
        </button>
      </div>
    </div>
  );
}
