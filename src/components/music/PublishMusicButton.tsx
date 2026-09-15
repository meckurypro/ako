// src/components/music/PublishMusicButton.tsx
//
// Entry point for "Publish Music to Akọ" on an eligible Audio
// Project's own detail page (owner-only). Self-contained: checks
// project_media_details itself via useMediaDetails, so dropping
// this into ProjectDetail.tsx is a single conditional line — see
// PATCHES.md.

import { useState } from "react";
import { Music } from "lucide-react";
import { useMediaDetails } from "../../hooks/useProjectTypeDetails";
import { useMyPublishedMusic } from "../../hooks/useMusicCatalogue";
import { PublishMusicSheet } from "./PublishMusicSheet";

export function PublishMusicButton({ projectId }: { projectId: string }) {
  const { data: mediaDetails } = useMediaDetails(projectId);
  const { data: myMusic } = useMyPublishedMusic();
  const [open, setOpen] = useState(false);

  if (!mediaDetails?.has_audio) return null;

  const alreadyPublished = myMusic?.find(
    (m) => m.project_id === projectId && m.publication_status === "published"
  );

  return (
    <div className="mb-4">
      {alreadyPublished ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent-soft text-accent text-sm">
          <Music size={16} />
          Published to the Akọ catalogue as "{alreadyPublished.title}"
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-ink"
        >
          <Music size={16} className="text-accent" />
          Publish Music to Akọ
        </button>
      )}

      {open && <PublishMusicSheet onClose={() => setOpen(false)} />}
    </div>
  );
}
