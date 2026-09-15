// src/pages/admin/AdminProfileAds.tsx
//
// Manages the reserved ad slot on a user's own profile toolbar (see
// ProfileAdSlot.tsx). Targeting reuses the exact same AudiencePicker
// used for the notification blast and email campaigns — "all" /
// "by account type" / "an organisation's followers" / "manually
// selected" — so this page follows that established pattern exactly
// rather than inventing a parallel one.
import { useRef, useState } from "react";
import { ArrowLeft, Trash2, Upload } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { AudiencePicker } from "../../components/admin/AudiencePicker";
import { ToggleSwitch } from "../../components/admin/ToggleSwitch";
import { Button } from "../../components/Button";
import { useToast } from "../../components/Toast";
import type { AudienceInput } from "../../hooks/useAdminComms";
import {
  useAdminAdCreatives,
  useUploadAdMedia,
  useSaveAdCreative,
  useToggleAdCreative,
  useDeleteAdCreative,
  publicUrlFor,
  type AdCreative,
} from "../../hooks/useAdCreatives";

const EMPTY_AUDIENCE: AudienceInput = { audience_type: "all", audience_filter: {}, manual_recipient_ids: [] };

function audienceSummary(c: AdCreative): string {
  if (c.audience_type === "all") return "All users";
  if (c.audience_type === "tier") return `Tier: ${c.audience_filter.tier ?? "—"}`;
  if (c.audience_type === "page_followers") return "An organisation's followers";
  return `${c.manual_recipient_ids.length} specific ${c.manual_recipient_ids.length === 1 ? "user" : "users"}`;
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function AdminProfileAds() {
  const smartBack = useSmartBack();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: creatives, isLoading } = useAdminAdCreatives();
  const uploadMedia = useUploadAdMedia();
  const saveCreative = useSaveAdCreative();
  const toggleCreative = useToggleAdCreative();
  const deleteCreative = useDeleteAdCreative();

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [audience, setAudience] = useState<AudienceInput>(EMPTY_AUDIENCE);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
  }

  function resetForm() {
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setLinkUrl("");
    setAudience(EMPTY_AUDIENCE);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCreate() {
    if (!pendingFile) return toast("Choose an image or video first.", { variant: "error" });
    if (audience.audience_type === "tier" && !audience.audience_filter.tier)
      return toast("Pick an account type.", { variant: "error" });
    if (audience.audience_type === "page_followers" && !audience.audience_filter.page_id)
      return toast("Pick an organisation.", { variant: "error" });
    if (audience.audience_type === "manual" && audience.manual_recipient_ids.length === 0)
      return toast("Search and select at least one user.", { variant: "error" });

    try {
      const { path, media_type } = await uploadMedia.mutateAsync(pendingFile);
      await saveCreative.mutateAsync({
        media_type,
        media_path: path,
        link_url: normalizeUrl(linkUrl),
        is_active: true,
        ...audience,
      });
      toast("Ad creative added.", { variant: "success" });
      resetForm();
    } catch (err: any) {
      toast(err.message ?? "Couldn't save that creative.", { variant: "error" });
    }
  }

  async function handleDelete(creative: AdCreative) {
    if (!confirm("Remove this ad creative? This can't be undone.")) return;
    await deleteCreative.mutateAsync(creative);
  }

  const busy = uploadMedia.isPending || saveCreative.isPending;

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Profile ads</h2>
        </div>
        <p className="text-sm text-ink-muted mb-6">
          Controls the reserved ad slot on a user's own profile toolbar. Nothing shows there unless a
          creative below is active and actually targets the viewer — leaving everything off (or deactivating
          every creative) keeps the slot transparent. The master switch is in{" "}
          <span className="font-medium text-ink">Admin › Feature flags › Content › Profile ad slot</span>.
        </p>

        {/* New creative */}
        <div className="bg-surface rounded-xl border border-border p-4 mb-6">
          <p className="text-sm font-medium text-ink mb-3">Add a creative</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
            id="ad-media-input"
          />
          {pendingPreviewUrl ? (
            <div className="mb-1">
              {pendingFile?.type.startsWith("video/") ? (
                <video src={pendingPreviewUrl} className="w-full h-14 object-cover rounded-lg" muted loop autoPlay playsInline />
              ) : (
                <img src={pendingPreviewUrl} alt="" className="w-full h-14 object-cover rounded-lg" />
              )}
            </div>
          ) : (
            <label
              htmlFor="ad-media-input"
              className="flex items-center justify-center gap-2 h-14 rounded-lg border border-dashed border-border text-sm text-ink-muted mb-1 cursor-pointer"
            >
              <Upload size={16} />
              Choose image or video
            </label>
          )}
          <p className="text-xs text-ink-muted mb-3">
            Aspect ratio: fixed height, flexible width — aim for a wide banner around{" "}
            <span className="font-medium text-ink">8:1</span> (e.g. 960×120px, or 1920×240px for retina). It's
            cropped to fill the slot (not stretched or letterboxed), so keep the important part centered.
          </p>
          {pendingFile && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-accent font-medium mb-4"
            >
              Choose a different file
            </button>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-ink mb-1.5">Link (optional)</label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="e.g. brand.com/promo"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-canvas text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:border-accent"
            />
            <p className="text-xs text-ink-muted mt-1">
              Where tapping the ad takes the user. Leave blank and it won't be clickable at all — just visuals.
            </p>
          </div>

          <div className="mb-4">
            <AudiencePicker value={audience} onChange={setAudience} />
          </div>

          <Button loading={busy} onClick={handleCreate}>
            Add creative
          </Button>
        </div>

        {/* Existing creatives */}
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-2 px-1">
          All creatives
        </p>
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !creatives || creatives.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">No ad creatives yet.</p>
        ) : (
          <div className="space-y-2">
            {creatives.map((c) => (
              <div key={c.id} className="flex items-center gap-3 bg-surface rounded-xl border border-border p-3">
                {c.media_type === "video" ? (
                  <video src={publicUrlFor(c.media_path)} className="w-16 h-10 object-cover rounded-md shrink-0" muted playsInline />
                ) : (
                  <img src={publicUrlFor(c.media_path)} alt="" className="w-16 h-10 object-cover rounded-md shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{audienceSummary(c)}</p>
                  <p className="text-xs text-ink-muted capitalize">
                    {c.media_type} · {c.link_url ? "links out" : "not clickable"}
                  </p>
                </div>
                <ToggleSwitch
                  checked={c.is_active}
                  disabled={toggleCreative.isPending}
                  onChange={(next) => toggleCreative.mutate({ id: c.id, is_active: next })}
                />
                <button
                  onClick={() => handleDelete(c)}
                  className="text-ink-muted p-1.5"
                  aria-label="Delete creative"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
