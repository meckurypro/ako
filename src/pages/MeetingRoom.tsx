// src/pages/MeetingRoom.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Video } from "lucide-react";
import { useProject, useHasPurchased } from "../hooks/useProjects";
import { useMeetingDetails } from "../hooks/useProjectTypeDetails";

function useCountdown(target: string | null | undefined) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  useEffect(() => {
    if (!target) return;
    const tick = () => setRemainingMs(new Date(target).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return remainingMs;
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

// STUB: the actual video call is not wired up — that needs a
// provider decision (LiveKit/Daily/Agora/100ms, discussed earlier
// and still open). This page handles everything around the call —
// access gating and the countdown — and drops in a placeholder where
// the embedded call would go once a provider is picked.
export function MeetingRoom() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId);
  const { data: details } = useMeetingDetails(projectId);
  const hasPurchasedQuery = useHasPurchased(projectId ?? "");
  const hasAccess = !!hasPurchasedQuery.data;

  const remainingMs = useCountdown(details?.scheduled_at);
  const isLive = remainingMs !== null && remainingMs <= 0;

  if (!project || !details) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-3">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-1">{project.title}</h2>
        <p className="text-sm text-ink-muted mb-6">
          {new Date(details.scheduled_at).toLocaleString()}
        </p>

        {!hasAccess ? (
          <div className="flex flex-col items-center text-center gap-2 mt-10">
            <Lock size={24} className="text-ink-muted" />
            <p className="text-sm text-ink-muted">Buy access to this meeting to join.</p>
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="text-accent text-sm font-medium"
            >
              Go to project page
            </button>
          </div>
        ) : !isLive ? (
          <div className="flex flex-col items-center text-center gap-2 mt-10">
            <p className="text-xs text-ink-muted uppercase tracking-wide">Starts in</p>
            <p className="font-display text-4xl text-ink">
              {remainingMs !== null ? formatCountdown(remainingMs) : "…"}
            </p>
          </div>
        ) : (
          <div className="aspect-video w-full rounded-xl border border-border bg-surface flex flex-col items-center justify-center gap-2 text-ink-muted">
            <Video size={28} />
            <p className="text-sm">Live now — video call goes here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
