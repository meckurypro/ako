// src/components/GuestPassSheet.tsx
import { useState } from "react";
import { X, Copy, Check, Share2, KeyRound, Clock, Eye } from "lucide-react";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { Portal } from "./Portal";
import { Button } from "./Button";
import { useToast } from "./Toast";
import { useCountdown, formatCountdown } from "../hooks/useCountdown";
import {
  useCreateGuestPass,
  useGuestPasses,
  useRevokeGuestPass,
  type GuestPassRow,
} from "../hooks/useGuestPass";
import { GUEST_PASS_HOURS, getGuestPassUrl } from "../lib/guestPass";

interface GuestPassSheetProps {
  projectId: string;
  projectTitle: string;
  isPrivate: boolean;
  isPaid: boolean;
  onClose: () => void;
}

function PassRow({
  row,
  onRevoke,
  revoking,
  fresh,
}: {
  row: GuestPassRow;
  onRevoke: () => void;
  revoking: boolean;
  fresh: boolean;
}) {
  const toast = useToast();
  const remaining = useCountdown(row.expires_at);
  const [copied, setCopied] = useState(false);
  const url = getGuestPassUrl(row.token);
  const live = remaining === null || remaining > 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast("Pass link copied.", { variant: "success" });
    } catch {
      // Clipboard blocked — the link is still visible on screen to copy by hand.
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "Guest Pass", text: "Open this on Akọ — no account needed.", url });
    } catch {
      // Dismissed, or sharing unavailable — nothing to do.
    }
  }

  return (
    <div className={`rounded-2xl border bg-canvas px-3.5 py-3 ${fresh ? "border-accent/60" : "border-border"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <Clock size={14} className={live ? "text-accent" : "text-ink-muted"} />
          {live ? (remaining === null ? "…" : `${formatCountdown(remaining)} left`) : "Expired"}
        </div>
        <div className="flex items-center gap-1 text-xs text-ink-muted">
          <Eye size={13} />
          {row.open_count} {row.open_count === 1 ? "open" : "opens"}
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-muted break-all select-all">{url}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => void copy()}
          disabled={!live}
          className="flex items-center gap-1.5 rounded-full bg-accent text-canvas px-3.5 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy link"}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={() => void share()}
            disabled={!live}
            className="flex items-center gap-1.5 rounded-full bg-accent-soft text-accent px-3.5 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            <Share2 size={14} />
            Share
          </button>
        )}
        <button
          onClick={onRevoke}
          disabled={revoking}
          className="ml-auto text-sm font-medium text-danger disabled:opacity-50"
        >
          Revoke
        </button>
      </div>
    </div>
  );
}

/**
 * Creator-side Guest Pass manager. "Make a link anyone can open for 6 hours — no account needed — even if this
 * project is private." Opened from the project's kebab menu and from Edit project. Passes are minted and revoked
 * server-side (create_project_guest_pass / revoke_project_guest_pass); the list only ever shows live ones.
 */
export function GuestPassSheet({ projectId, projectTitle, isPrivate, isPaid, onClose }: GuestPassSheetProps) {
  useBackDismiss(onClose);
  const toast = useToast();
  const { data: passes, isLoading } = useGuestPasses(projectId);
  const create = useCreateGuestPass(projectId);
  const revoke = useRevokeGuestPass(projectId);
  const [freshId, setFreshId] = useState<string | null>(null);

  async function handleCreate() {
    try {
      const row = await create.mutateAsync();
      setFreshId(row.pass_id);
      try {
        await navigator.clipboard.writeText(getGuestPassUrl(row.token));
        toast("Pass link created and copied.", { variant: "success" });
      } catch {
        toast("Pass link created.", { variant: "success" });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't create the pass.", { variant: "error" });
    }
  }

  async function handleRevoke(passId: string) {
    try {
      await revoke.mutateAsync(passId);
      toast("Pass revoked. That link no longer works.", { variant: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't revoke the pass.", { variant: "error" });
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 ako-keyboard-aware z-50 flex items-center justify-center px-6">
        <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-surface rounded-[28px] border border-border max-h-[calc(100dvh-10rem)] flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink flex items-center gap-1.5">
                <KeyRound size={15} className="text-accent" />
                Guest Pass
              </p>
              <p className="text-xs text-ink-muted truncate">{projectTitle}</p>
            </div>
            <button onClick={onClose} className="text-ink-muted" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
            <p className="text-sm text-ink-muted">
              Make a link that anyone can open for {GUEST_PASS_HOURS} hours — no account needed.
              {isPrivate && " It works even though this project is private."} A countdown shows them when it ends.
            </p>
            {isPaid && (
              <p className="mt-2 text-xs text-ink-muted rounded-xl bg-canvas border border-border px-3 py-2">
                This project is paid. Anyone with the link can view its content (and download any files) for free while
                the pass is live.
              </p>
            )}

            <div className="mt-4">
              <Button type="button" loading={create.isPending} onClick={() => void handleCreate()}>
                Create a {GUEST_PASS_HOURS}-hour pass link
              </Button>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              {isLoading ? (
                <p className="text-sm text-ink-muted text-center py-4">Loading…</p>
              ) : !passes?.length ? (
                <p className="text-sm text-ink-muted text-center py-4">No live passes yet.</p>
              ) : (
                <>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Live passes</p>
                  {passes.map((row) => (
                    <PassRow
                      key={row.pass_id}
                      row={row}
                      fresh={row.pass_id === freshId}
                      revoking={revoke.isPending && revoke.variables === row.pass_id}
                      onRevoke={() => void handleRevoke(row.pass_id)}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
