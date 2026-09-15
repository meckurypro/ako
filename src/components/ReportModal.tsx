// src/components/ReportModal.tsx
//
// Opened from a profile's three-dot menu (not from individual post/
// project cards — see AKO bug notes: reporting was deliberately kept
// off the feed/card surfaces to avoid a stray tap turning into an
// accidental report). Two-step flow: pick which of this profile's
// posts or projects you're reporting, then pick a reason and submit.
import { useState } from "react";
import { ChevronLeft, Flag, Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { useUserPostsWithArchived } from "../hooks/usePosts";
import { useUserProjects } from "../hooks/useProjects";
import { useReportReasons, useSubmitReport } from "../hooks/useReports";

type TargetKind = "post" | "project";

interface ReportTarget {
  kind: TargetKind;
  id: string;
  label: string;
}

export function ReportModal({ profileId, onClose }: { profileId: string; onClose: () => void }) {
  const [step, setStep] = useState<"kind" | "target" | "reason">("kind");
  const [kind, setKind] = useState<TargetKind | null>(null);
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [details, setDetails] = useState("");

  const toast = useToast();
  const { data: posts, isLoading: postsLoading } = useUserPostsWithArchived(profileId, false);
  const { data: projects, isLoading: projectsLoading } = useUserProjects(profileId, false);
  const { data: reasons, isLoading: reasonsLoading } = useReportReasons();
  const submitReport = useSubmitReport();

  async function handleSubmit() {
    if (!target || !reasonId) return;
    try {
      await submitReport.mutateAsync({
        targetType: target.kind,
        targetId: target.id,
        reasonId,
        details,
      });
      toast("Report submitted. Thanks for flagging this.", { variant: "success" });
      onClose();
    } catch {
      toast("Couldn't submit your report. Try again.", { variant: "error" });
    }
  }

  return (
    <Modal onClose={onClose} ariaLabel="Report content" maxWidthClass="max-w-md">
      <div className="flex items-center gap-2 mb-4">
        {step !== "kind" && (
          <button
            type="button"
            onClick={() => setStep(step === "reason" ? "target" : "kind")}
            className="text-ink-muted -ml-1 p-1"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <Flag size={18} className="text-danger" />
        <h2 className="font-display text-lg text-ink">Report</h2>
      </div>

      {step === "kind" && (
        <div className="space-y-2">
          <p className="text-sm text-ink-muted mb-3">What are you reporting?</p>
          <button
            type="button"
            onClick={() => {
              setKind("post");
              setStep("target");
            }}
            className="w-full text-left px-4 py-3 rounded-xl bg-canvas border border-border hover:border-accent text-ink"
          >
            A post
          </button>
          <button
            type="button"
            onClick={() => {
              setKind("project");
              setStep("target");
            }}
            className="w-full text-left px-4 py-3 rounded-xl bg-canvas border border-border hover:border-accent text-ink"
          >
            A project
          </button>
        </div>
      )}

      {step === "target" && kind === "post" && (
        <TargetList
          isLoading={postsLoading}
          emptyLabel="No posts to report."
          items={(posts ?? []).map((p) => ({
            kind: "post" as const,
            id: p.id,
            label: p.heading?.trim() || p.content.slice(0, 80) || "Untitled post",
          }))}
          onPick={(t) => {
            setTarget(t);
            setStep("reason");
          }}
        />
      )}

      {step === "target" && kind === "project" && (
        <TargetList
          isLoading={projectsLoading}
          emptyLabel="No projects to report."
          items={(projects ?? []).map((p) => ({ kind: "project" as const, id: p.id, label: p.title }))}
          onPick={(t) => {
            setTarget(t);
            setStep("reason");
          }}
        />
      )}

      {step === "reason" && target && (
        <div>
          <p className="text-sm text-ink-muted mb-3 line-clamp-1">Reporting: {target.label}</p>

          {reasonsLoading && <p className="text-ink-muted text-sm py-4 text-center">Loading reasons…</p>}

          <div className="space-y-1.5 mb-3">
            {reasons?.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setReasonId(r.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border ${
                  reasonId === r.id ? "border-accent bg-accent-soft" : "border-border bg-canvas"
                }`}
              >
                <p className="text-sm font-medium text-ink">{r.label}</p>
                {r.description && <p className="text-xs text-ink-muted mt-0.5">{r.description}</p>}
              </button>
            ))}
          </div>

          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add details (optional, required for 'Other')"
            rows={3}
            className="w-full bg-canvas border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted resize-none mb-3"
          />

          <button
            type="button"
            disabled={!reasonId || submitReport.isPending}
            onClick={() => void handleSubmit()}
            className="w-full flex items-center justify-center gap-2 bg-danger text-canvas rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {submitReport.isPending && <Loader2 size={16} className="animate-spin" />}
            Submit report
          </button>
        </div>
      )}
    </Modal>
  );
}

function TargetList({
  isLoading,
  emptyLabel,
  items,
  onPick,
}: {
  isLoading: boolean;
  emptyLabel: string;
  items: ReportTarget[];
  onPick: (t: ReportTarget) => void;
}) {
  if (isLoading) return <p className="text-ink-muted text-sm py-6 text-center">Loading…</p>;
  if (items.length === 0) return <p className="text-ink-muted text-sm py-6 text-center">{emptyLabel}</p>;

  return (
    <div className="space-y-1.5 max-h-72 overflow-y-auto">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onPick(item)}
          className="w-full text-left px-3.5 py-2.5 rounded-xl bg-canvas border border-border hover:border-accent text-sm text-ink line-clamp-2"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
