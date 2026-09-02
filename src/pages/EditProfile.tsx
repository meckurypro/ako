import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Camera, Shield } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useUpdateProfile, useUpdateProfileRoles } from "../hooks/useProfile";
import { useUploadAvatar } from "../hooks/useUploadAvatar";
import { useRoles } from "../hooks/useRoles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { PROFILE_ROLES_SELECT } from "../lib/profileRoles";
import { FormField } from "../components/FormField";
import { Button } from "../components/Button";
import { Avatar } from "../components/Avatar";

// Own-profile lookup by id, since this page doesn't have :username in the URL
function useOwnProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["own-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`*, ${PROFILE_ROLES_SELECT}`)
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function EditProfile() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useOwnProfile();
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
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
      // reset so selecting the same file again still fires onChange
      e.target.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

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
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-6">Edit profile</h2>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col items-center mb-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative"
            >
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

          {error && (
            <p className="text-danger text-sm mb-4" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={updateProfile.isPending || updateProfileRoles.isPending}>
            Save changes
          </Button>
        </form>

        <Link
          to="/settings"
          className="flex items-center gap-2 justify-center text-sm text-ink-muted mt-6"
        >
          <Shield size={16} />
          Privacy Settings
        </Link>
      </div>
    </div>
  );
}
