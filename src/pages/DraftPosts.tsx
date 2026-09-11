// src/pages/DraftPosts.tsx
import { useNavigate } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import { ArrowLeft, FileEdit, Trash2 } from "lucide-react";
import { useMyDraftPosts, useDeleteDraftOrScheduledPost } from "../hooks/usePosts";
import { useToast } from "../components/Toast";

/**
 * Drafts don't render as PostCard — a draft was deliberately never
 * published, so giving it a like button, a share icon, a comment
 * count is actively misleading (there's nothing to like/share/comment
 * on yet, and it isn't visible to anyone but its author regardless).
 * Instead: a plain content preview, a muted "Draft" label instead of
 * a timestamp (a draft's created_at isn't really the interesting date
 * — when they'll finish it is, and nobody knows that), and exactly
 * two actions — resume writing, or discard it outright.
 */
export function DraftPosts() {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { data: drafts, isLoading } = useMyDraftPosts();
  const deleteDraft = useDeleteDraftOrScheduledPost();
  const toast = useToast();

  function handleDiscard(id: string) {
    deleteDraft.mutate(id, {
      onSuccess: () => toast("Draft discarded."),
      onError: () => toast("Couldn't discard that draft. Try again.", { variant: "error" }),
    });
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 flex items-center gap-3">
        <button onClick={smartBack} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink">Drafts</h2>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-2">
        {isLoading ? (
          <p className="text-sm text-ink-muted text-center py-10">Loading…</p>
        ) : !drafts?.length ? (
          <div className="text-center py-16 px-6">
            <FileEdit size={32} className="text-ink-muted mx-auto mb-3" />
            <p className="text-ink font-medium">No drafts yet</p>
            <p className="text-sm text-ink-muted mt-1">
              Start a post and choose "Save as draft" instead of posting — it'll show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="rounded-2xl border border-dashed border-border bg-surface p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted bg-canvas px-2 py-0.5 rounded-full border border-border">
                    Draft
                  </span>
                  {draft.category_id && (
                    <span className="text-[11px] text-ink-muted">
                      {new Date(draft.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {draft.heading && (
                  <p className="font-medium text-ink mb-1 line-clamp-1">{draft.heading}</p>
                )}
                <p className="text-sm text-ink-muted line-clamp-3">
                  {draft.content || "(No text yet — just media or a heading.)"}
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => navigate("/compose", { state: { draftId: draft.id } })}
                    className="flex-1 py-2 rounded-full bg-accent text-canvas text-sm font-medium"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => handleDiscard(draft.id)}
                    aria-label="Discard draft"
                    className="p-2 rounded-full border border-border text-ink-muted"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
