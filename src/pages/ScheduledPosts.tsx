// src/pages/ScheduledPosts.tsx
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft, Send, X } from "lucide-react";
import { useMyScheduledPosts, useDeleteDraftOrScheduledPost } from "../hooks/usePosts";
import { useToast } from "../components/Toast";

function timeUntil(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "publishing shortly";
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${mins} min${mins === 1 ? "" : "s"}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hr${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

/**
 * Scheduled posts get a countdown, not a static timestamp — "in 3
 * hours" is what actually matters to someone checking whether they
 * have time to still change their mind, not the raw date. No
 * "Resume"/edit here on purpose: editing a post that's already
 * queued and passed moderation would mean re-running moderation
 * before it publishes (see add_post_drafts_and_scheduling.sql) — out
 * of scope for this pass, so the only action is Cancel (discard
 * outright, same as a draft) rather than a half-working edit path.
 */
export function ScheduledPosts() {
  const smartBack = useSmartBack();
  const { data: scheduled, isLoading } = useMyScheduledPosts();
  const cancelScheduled = useDeleteDraftOrScheduledPost();
  const toast = useToast();

  function handleCancel(id: string) {
    cancelScheduled.mutate(id, {
      onSuccess: () => toast("Scheduled post cancelled."),
      onError: () => toast("Couldn't cancel that. Try again.", { variant: "error" }),
    });
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 flex items-center gap-3">
        <button onClick={smartBack} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink">Scheduled</h2>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-2">
        {isLoading ? (
          <p className="text-sm text-ink-muted text-center py-10">Loading…</p>
        ) : !scheduled?.length ? (
          <div className="text-center py-16 px-6">
            <Send size={32} className="text-ink-muted mx-auto mb-3" />
            <p className="text-ink font-medium">Nothing scheduled</p>
            <p className="text-sm text-ink-muted mt-1">
              Choose "Schedule…" instead of posting to queue something for later — it'll show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-3">
            {scheduled.map((post) => (
              <div key={post.id} className="rounded-2xl border border-accent/30 bg-accent-soft/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-accent">
                    <Send size={12} />
                    Publishes {post.scheduled_for ? timeUntil(post.scheduled_for) : ""}
                  </span>
                  <button
                    onClick={() => handleCancel(post.id)}
                    aria-label="Cancel scheduled post"
                    className="text-ink-muted"
                  >
                    <X size={16} />
                  </button>
                </div>
                {post.heading && <p className="font-medium text-ink mb-1 line-clamp-1">{post.heading}</p>}
                <p className="text-sm text-ink-muted line-clamp-3">{post.content}</p>
                {post.scheduled_for && (
                  <p className="text-[11px] text-ink-muted mt-2">
                    {new Date(post.scheduled_for).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
