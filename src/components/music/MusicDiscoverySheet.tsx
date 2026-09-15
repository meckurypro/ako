// src/components/music/MusicDiscoverySheet.tsx
//
// The lightweight surface a tapped attribution opens (see
// done/AKO_MUSIC_CATALOGUE_AND_CREATOR_DISCOVERY_SYSTEM.md §12).
// Core loop: Music → Artist → Profile → Projects. A musician remains
// an Akọ creator — this links straight to their existing profile
// rather than inventing a separate musician-account surface.

import { useNavigate } from "react-router-dom";
import { Music as MusicIcon, X } from "lucide-react";
import { Portal } from "../Portal";
import { Avatar } from "../Avatar";
import { useBackDismiss } from "../../hooks/useBackDismiss";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useMusicCatalogueEntry, useRecordMusicUsageEvent } from "../../hooks/useMusicCatalogue";
import { CONTRIBUTOR_ROLE_LABELS } from "../../types/music";

interface MusicDiscoverySheetProps {
  catalogueId: string;
  onClose: () => void;
}

export function MusicDiscoverySheet({ catalogueId, onClose }: MusicDiscoverySheetProps) {
  const navigate = useNavigate();
  const { data: entry } = useMusicCatalogueEntry(catalogueId);
  const recordUsage = useRecordMusicUsageEvent();

  useBackDismiss(onClose);
  useScrollLock();

  if (!entry) return null;

  const artist = entry.contributors.find((c) => c.role === "artist");
  const featured = entry.contributors.filter((c) => c.role === "featured_artist");

  function visitProfile() {
    if (!artist) return;
    recordUsage.mutate({ catalogueId: entry!.id, eventType: "profile_visit" });
    navigate(`/profile/${artist.contributor.username}`);
    onClose();
  }

  function visitProject() {
    recordUsage.mutate({ catalogueId: entry!.id, eventType: "project_visit" });
    navigate(`/projects/${entry!.project_id}`);
    onClose();
  }

  function useInPost() {
    navigate("/compose", { state: { attachMusicCatalogueId: entry!.id } });
    onClose();
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />

        <div className="relative w-full max-w-xl bg-surface rounded-t-3xl border border-border">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
            <h2 className="font-display text-lg text-ink">Song</h2>
            <button onClick={onClose} className="p-1 text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="px-4 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-14 h-14 rounded-xl bg-accent-soft flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={entry.cover_url ? { backgroundImage: `url(${entry.cover_url})`, backgroundSize: "cover" } : undefined}
              >
                {!entry.cover_url && <MusicIcon size={20} className="text-accent" />}
              </div>
              <div className="min-w-0">
                <p className="text-base font-medium text-ink truncate">{entry.title}</p>
                <p className="text-sm text-ink-muted truncate">
                  {entry.primary_artist_name}
                  {featured.length > 0 && ` · feat. ${featured.map((f) => f.contributor.display_name).join(", ")}`}
                </p>
              </div>
            </div>

            {entry.contributors.length > 0 && (
              <div className="mb-5 space-y-1.5">
                {entry.contributors.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Avatar src={c.contributor.avatar_url} name={c.contributor.display_name} size="sm" />
                    <p className="text-sm text-ink">
                      {c.contributor.display_name}{" "}
                      <span className="text-ink-muted">· {CONTRIBUTOR_ROLE_LABELS[c.role]}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <button onClick={useInPost} className="w-full py-3 rounded-full bg-accent text-canvas text-sm font-medium">
                Use in my post
              </button>
              {artist && (
                <button onClick={visitProfile} className="w-full py-3 rounded-full bg-accent-soft text-accent text-sm font-medium">
                  View creator
                </button>
              )}
              <button onClick={visitProject} className="w-full py-3 rounded-full border border-border text-ink text-sm font-medium">
                View Audio Project
              </button>
            </div>

            <p className="text-[11px] text-ink-muted text-center mt-4">
              This music belongs to its creator — Akọ hosts it under the Akọ Music Licence.
            </p>
          </div>
        </div>
      </div>
    </Portal>
  );
}
