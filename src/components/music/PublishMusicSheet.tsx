// src/components/music/PublishMusicSheet.tsx
//
// "Publish Music to Akọ" — the full creator flow described in
// done/AKO_MUSIC_CATALOGUE_AND_CREATOR_DISCOVERY_SYSTEM.md §4-9:
// pick an existing Audio Project → title/artist/cover → select the
// best 60 seconds → tag contributors → usage mode → accept the
// rights declaration + licence → publish.
//
// This is a publishing layer over an existing Audio Project, not a
// new upload flow — the source audio always comes from a Project the
// user already owns (see useMyAudioProjects). All rights/ownership/
// split/price validation happens server-side in the publish-music
// edge function; this component's own checks only exist to give a
// fast, friendly error before that round trip.

import { useEffect, useState } from "react";
import { Music, ChevronRight, FileAudio } from "lucide-react";
import { Portal } from "../Portal";
import { Avatar } from "../Avatar";
import { useBackDismiss } from "../../hooks/useBackDismiss";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useToast } from "../Toast";
import { useMyProfile } from "../../hooks/useProfile";
import { useGetProjectFile } from "../../hooks/useProjects";
import { resolveFunctionErrorMessage } from "../../lib/functionErrors";
import {
  useCurrentLicenceAgreement,
  useMyAudioProjects,
  usePublishMusic,
  useUploadCatalogueAsset,
} from "../../hooks/useMusicCatalogue";
import { ClipSelector } from "./ClipSelector";
import { ContributorPicker } from "./ContributorPicker";
import type { ContributorDraft, EligibleAudioProject } from "../../types/music";

interface PublishMusicSheetProps {
  onClose: () => void;
  onPublished?: (catalogueId: string) => void;
  // When opened from a specific Audio Project's own page (the normal
  // case — PublishMusicButton), preselect that Project instead of
  // making the owner re-find it in the generic picker below. Omitted
  // when opened from a context with no single Project in scope (e.g.
  // a future "Publish Music" entry point from a general music hub).
  projectId?: string;
}

type ClipState = { startSeconds: number; durationSeconds: number; blob: Blob } | null;

export function PublishMusicSheet({ onClose, onPublished, projectId }: PublishMusicSheetProps) {
  const toast = useToast();
  const { data: me } = useMyProfile();
  const { data: eligibleProjects, isLoading: loadingProjects } = useMyAudioProjects();
  const { data: licence } = useCurrentLicenceAgreement();
  const getProjectFile = useGetProjectFile();
  const uploadAsset = useUploadCatalogueAsset();
  const publishMusic = usePublishMusic();

  const [project, setProject] = useState<EligibleAudioProject | null>(null);
  const [signedAudioUrl, setSignedAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [clip, setClip] = useState<ClipState>(null);
  const [contributors, setContributors] = useState<ContributorDraft[]>([]);
  const [usageMode, setUsageMode] = useState<"free" | "paid">("free");
  const [priceUsd, setPriceUsd] = useState("");
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useBackDismiss(onClose);
  useScrollLock();

  // Default: publisher tags themselves as Artist — matches the most
  // common case and gives the split-total UI something sane to start
  // from, but is fully editable in ContributorPicker.
  useEffect(() => {
    if (me && contributors.length === 0) {
      setContributors([
        {
          contributor_id: me.id,
          username: me.username,
          display_name: me.display_name,
          avatar_url: me.avatar_url,
          role: "artist",
          split_percent: 100,
        },
      ]);
      setArtistName((prev) => prev || me.display_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  // Preselect the Project this sheet was opened for, the moment it
  // shows up in the eligible list — same selection path as a manual
  // pick, just automatic, so the owner lands straight on the
  // title/clip/contributors step for the song they were already
  // looking at instead of a generic "which Project?" picker.
  useEffect(() => {
    if (!projectId || project) return;
    const match = eligibleProjects?.find((p) => p.id === projectId);
    if (match) handleSelectProject(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, eligibleProjects, project]);

  async function handleSelectProject(p: EligibleAudioProject) {
    setProject(p);
    setTitle((prev) => prev || p.title);
    setAudioError(null);
    setSignedAudioUrl(null);

    if (!p.audio_file_path) {
      setAudioError(
        "This Project only has a link to the full track, not an uploaded file — upload an audio file to it first so Akọ can pick a real 30-second clip."
      );
      return;
    }
    try {
      const url = await getProjectFile.mutateAsync({ projectId: p.id, kind: "audio", action: "stream" });
      setSignedAudioUrl(url);
    } catch (err) {
      setAudioError(await resolveFunctionErrorMessage(err, "Couldn't load this Project's audio."));
    }
  }

  async function handlePublish() {
    setError(null);

    if (!project) return setError("Select a Project first.");
    if (!title.trim()) return setError("Add a song title.");
    if (!artistName.trim()) return setError("Add a primary artist name.");
    if (!clip) return setError("Select the 30-second clip first.");
    if (contributors.length === 0) return setError("Tag at least one contributor.");
    if (!contributors.some((c) => c.role === "artist")) return setError("At least one contributor must be tagged Artist.");
    if (!rightsAccepted) return setError("Accept the rights declaration to publish.");

    let price: number | null = null;
    if (usageMode === "paid") {
      price = Number(priceUsd);
      if (!Number.isFinite(price) || price <= 0) return setError("Set a usage price greater than $0.");
      const splitTotal = contributors.reduce((sum, c) => sum + (c.split_percent || 0), 0);
      if (Math.abs(splitTotal - 100) > 0.01) return setError(`Contributor splits must total exactly 100% (currently ${splitTotal}%).`);
    }

    try {
      const clipPath = await uploadAsset.mutateAsync({ blob: clip.blob, extension: "wav" });
      let coverPath: string | null = null;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop() || "jpg";
        coverPath = await uploadAsset.mutateAsync({ blob: coverFile, extension: ext });
      }

      const result = await publishMusic.mutateAsync({
        project_id: project.id,
        title: title.trim(),
        primary_artist_name: artistName.trim(),
        cover_image_path: coverPath,
        clip_file_path: clipPath,
        clip_start_seconds: clip.startSeconds,
        clip_duration_seconds: clip.durationSeconds,
        usage_mode: usageMode,
        usage_price_usd: price,
        rights_declaration_accepted: true,
        contributors,
      });

      toast(`${title.trim()} is live in the Akọ catalogue.`, { variant: "success" });
      onPublished?.(result.catalogue.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish this song.");
    }
  }

  const isPublishing = uploadAsset.isPending || publishMusic.isPending;

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />

        <div className="relative w-full max-w-xl bg-surface rounded-t-3xl border border-border max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <Music size={18} className="text-accent" />
              <h2 className="font-display text-lg text-ink">Publish Music to Akọ</h2>
            </div>
            <button onClick={onClose} className="text-sm text-ink-muted">
              Close
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-4 py-4">
            {!project ? (
              <ProjectPicker
                projects={eligibleProjects}
                isLoading={loadingProjects}
                onSelect={handleSelectProject}
              />
            ) : (
              <div>
                <button onClick={() => setProject(null)} className="text-xs text-accent mb-4">
                  ← Choose a different Project
                </button>

                {audioError && <p className="text-sm text-danger mb-4">{audioError}</p>}

                {signedAudioUrl && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-ink-muted mb-1.5">Song title</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={100}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm text-ink"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-ink-muted mb-1.5">Primary artist</label>
                      <input
                        value={artistName}
                        onChange={(e) => setArtistName(e.target.value)}
                        maxLength={80}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm text-ink"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-ink-muted mb-1.5">
                        Cover art <span className="font-normal">(optional)</span>
                      </label>
                      <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm text-ink-muted cursor-pointer">
                        <FileAudio size={16} />
                        {coverFile ? coverFile.name : "Choose image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>

                    <div className="mb-4 rounded-xl border border-border overflow-hidden">
                      <ClipSelector
                        audioUrl={signedAudioUrl}
                        onConfirm={(result) => setClip(result)}
                        onCancel={() => setClip(null)}
                      />
                      {clip && (
                        <p className="text-xs text-accent px-4 pb-3">
                          Clip set: {clip.startSeconds.toFixed(0)}s–{(clip.startSeconds + clip.durationSeconds).toFixed(0)}s
                        </p>
                      )}
                    </div>

                    <ContributorPicker contributors={contributors} onChange={setContributors} usageMode={usageMode} />

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-ink-muted mb-1.5">Usage</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setUsageMode("free")}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
                            usageMode === "free" ? "bg-accent text-canvas border-accent" : "bg-canvas text-ink-muted border-border"
                          }`}
                        >
                          Free — discovery
                        </button>
                        <button
                          onClick={() => setUsageMode("paid")}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
                            usageMode === "paid" ? "bg-accent text-canvas border-accent" : "bg-canvas text-ink-muted border-border"
                          }`}
                        >
                          Paid usage
                        </button>
                      </div>
                      <p className="text-xs text-ink-muted mt-1.5">
                        {usageMode === "free"
                          ? "Free usage is promotion and discovery — Akọ doesn't owe you money when someone uses it."
                          : "People will see this price before using the song in a post."}
                      </p>
                      {usageMode === "paid" && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-ink-muted">$</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={priceUsd}
                            onChange={(e) => setPriceUsd(e.target.value)}
                            placeholder="0.00"
                            className="w-24 px-3 py-2 rounded-xl border border-border bg-canvas text-sm text-ink"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mb-4 p-3 rounded-xl bg-canvas border border-border">
                      <p className="text-xs text-ink-muted leading-relaxed">{licence?.body}</p>
                    </div>

                    <label className="flex items-start gap-2 mb-4">
                      <input
                        type="checkbox"
                        checked={rightsAccepted}
                        onChange={(e) => setRightsAccepted(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span className="text-xs text-ink">
                        I confirm I own or control the rights necessary to publish this music on Akọ and authorize its use in
                        Akọ posts under the Akọ Music Licence.
                      </span>
                    </label>

                    {error && <p className="text-sm text-danger mb-3">{error}</p>}

                    <button
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="w-full py-3 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-50"
                    >
                      {isPublishing ? "Publishing…" : "Publish to Akọ"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

function ProjectPicker({
  projects,
  isLoading,
  onSelect,
}: {
  projects: EligibleAudioProject[] | undefined;
  isLoading: boolean;
  onSelect: (p: EligibleAudioProject) => void;
}) {
  if (isLoading) {
    return <p className="text-sm text-ink-muted text-center py-8">Loading your Projects…</p>;
  }
  if (!projects || projects.length === 0) {
    return (
      <p className="text-sm text-ink-muted text-center py-8">
        You don't have an Audio Project yet. Create a Media Project with an audio channel first, then come back here to
        publish it to the catalogue.
      </p>
    );
  }
  return (
    <div>
      <p className="text-sm text-ink-muted mb-3">Choose the Audio Project you're publishing from.</p>
      <div className="space-y-1">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-canvas text-left"
          >
            <Avatar src={p.thumbnail_url} name={p.title} size="sm" />
            <span className="flex-1 text-sm text-ink truncate">{p.title}</span>
            <ChevronRight size={16} className="text-ink-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}
