// src/pages/Archive.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArchiveRestore, Trash2, X, CheckSquare, ChevronDown } from "lucide-react";
import {
  useArchivedConversations,
  useMarkArchiveSeen,
  useUpdateConversationState,
  useBulkUpdateConversationState,
  type ArchivedConversationSummary,
} from "../hooks/useMessaging";
import { useAuth } from "../hooks/useAuth";
import { useUserPostsWithArchived } from "../hooks/usePosts";
import { useUserProjects } from "../hooks/useProjects";
import { Avatar } from "../components/Avatar";
import { ProjectCard } from "../components/ProjectCard";
import { ArchivedPostModal } from "../components/ArchivedPostModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { PostWithAuthor } from "../types/database";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Collapsible section header — same accordion chrome as the Topics
// list on Discover (chevron rotate + grid-rows expand), so browsing
// archived content feels like the same pattern the user already knows
// from there.
function SectionHeader({
  label,
  count,
  isOpen,
  onToggle,
}: {
  label: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between py-4 text-left">
      <h3 className="font-display text-base text-ink">
        {label} <span className="text-ink-muted font-sans text-sm">({count})</span>
      </h3>
      <ChevronDown
        size={18}
        className={`text-ink-muted transition-transform duration-300 ease-in-out ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function AccordionBody({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

export function Archive() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: archived, isLoading } = useArchivedConversations();
  const markSeen = useMarkArchiveSeen();
  const updateConversationState = useUpdateConversationState();
  const bulkUpdateConversationState = useBulkUpdateConversationState();

  // Requests from people who don't follow the user back land in the
  // same archived-conversations query as manually archived chats (see
  // useArchivedConversations) — split them apart here so requests
  // stay up top as their own always-visible group, and everything
  // else archived collapses into the "Archived messages" accordion.
  const requests = archived?.filter((c) => c.is_request) ?? [];
  const archivedMessages = archived?.filter((c) => !c.is_request) ?? [];

  // useUserPostsWithArchived(userId, true) returns active + archived
  // together (see usePosts.ts) — this screen only ever wants the
  // archived half, so filter client-side rather than changing what
  // the hook returns for its other callers.
  const { data: allPosts } = useUserPostsWithArchived(user?.id ?? "", true);
  const archivedPosts = allPosts?.filter((p) => p.is_archived) ?? [];

  const { data: allProjects } = useUserProjects(user?.id ?? "", true);
  const archivedProjects = allProjects?.filter((p) => p.status === "archived") ?? [];

  const [openSection, setOpenSection] = useState<"posts" | "projects" | "messages" | null>(null);
  function toggleSection(section: "posts" | "projects" | "messages") {
    setOpenSection((curr) => (curr === section ? null : section));
  }

  const [previewPost, setPreviewPost] = useState<PostWithAuthor | null>(null);
  // The modal has no way to tell us a restore/edit/delete happened
  // inside it (those all live in PostCard's own action sheet) — so
  // instead we just watch the archived list and close automatically
  // once the previewed post is no longer in it.
  useEffect(() => {
    if (previewPost && !archivedPosts.some((p) => p.id === previewPost.id)) {
      setPreviewPost(null);
    }
  }, [archivedPosts, previewPost]);

  // Opening this screen clears the "new" badge on the Archive row —
  // items themselves stay right here until the user actually replies
  // (see the accept-on-reply logic in useSendMessage), so this only
  // ever touches the badge, never the list contents.
  useEffect(() => {
    markSeen.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Long press for unarchive/delete/select on conversation rows,
  // shared by both the requests group and the archived-messages
  // accordion below. ---
  const [actionTarget, setActionTarget] = useState<ArchivedConversationSummary | null>(null);
  const longPressTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const longPressStart = useRef<Record<string, { x: number; y: number }>>({});
  const longPressFired = useRef<Record<string, boolean>>({});

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);

  function enterSelectMode(id: string) {
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  }
  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function handlePointerDown(c: ArchivedConversationSummary, e: React.PointerEvent) {
    if (selectMode) return;
    longPressStart.current[c.id] = { x: e.clientX, y: e.clientY };
    longPressFired.current[c.id] = false;
    longPressTimers.current[c.id] = setTimeout(() => {
      longPressFired.current[c.id] = true;
      if (navigator.vibrate) navigator.vibrate(15);
      setActionTarget(c);
    }, 450);
  }
  function cancelLongPressTimer(id: string) {
    const timer = longPressTimers.current[id];
    if (timer) clearTimeout(timer);
    longPressTimers.current[id] = null;
  }
  function handlePointerMove(c: ArchivedConversationSummary, e: React.PointerEvent) {
    const start = longPressStart.current[c.id];
    if (!start) return;
    if (Math.abs(e.clientX - start.x) > 10 || Math.abs(e.clientY - start.y) > 10) {
      cancelLongPressTimer(c.id);
    }
  }
  function endGesture(id: string) {
    cancelLongPressTimer(id);
    delete longPressStart.current[id];
  }
  function handleRowClick(c: ArchivedConversationSummary, e: React.MouseEvent) {
    if (selectMode) {
      toggleSelected(c.id);
      return;
    }
    if (longPressFired.current[c.id]) {
      e.preventDefault();
      longPressFired.current[c.id] = false;
      return;
    }
    navigate(`/messages/${c.id}`);
  }

  function handleUnarchive(c: ArchivedConversationSummary) {
    updateConversationState.mutate({ conversationId: c.id, archived_at: null });
  }
  function handleBulkUnarchive() {
    bulkUpdateConversationState.mutate({ conversationIds: [...selectedIds], archived_at: null }, { onSuccess: exitSelectMode });
  }
  function handleBulkDeletePress() {
    setDeleteTarget({ ids: [...selectedIds], label: selectedIds.size > 1 ? `${selectedIds.size} chats` : "this chat" });
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.ids.length === 1) {
      updateConversationState.mutate({ conversationId: deleteTarget.ids[0], hidden_at: new Date().toISOString() });
    } else {
      bulkUpdateConversationState.mutate({ conversationIds: deleteTarget.ids, hidden_at: new Date().toISOString() });
    }
    setDeleteTarget(null);
    exitSelectMode();
  }

  function renderConversationRow(c: ArchivedConversationSummary) {
    const isSelected = selectedIds.has(c.id);
    return (
      <div
        key={c.id}
        onPointerDown={(e) => handlePointerDown(c, e)}
        onPointerMove={(e) => handlePointerMove(c, e)}
        onPointerUp={() => endGesture(c.id)}
        onPointerLeave={() => endGesture(c.id)}
        onPointerCancel={() => endGesture(c.id)}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => handleRowClick(c, e)}
        role="link"
        className="flex items-center gap-3 py-3.5 border-b border-border select-none cursor-pointer"
        style={{ WebkitTouchCallout: "none" }}
      >
        {selectMode && (
          <span
            className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${
              isSelected ? "bg-accent border-accent" : "border-border"
            }`}
          >
            {isSelected && <span className="w-2 h-2 rounded-full bg-canvas" />}
          </span>
        )}

        <Avatar src={c.other_participant.avatar_url} name={c.other_participant.display_name} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className={`text-sm truncate ${c.unreadCount > 0 ? "font-semibold text-ink" : "font-medium text-ink"}`}>
              {c.other_participant.display_name}
            </p>
            <span className="text-xs text-ink-muted flex-shrink-0 ml-2">{timeAgo(c.last_message_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {c.is_request && (
              <span className="text-[11px] font-medium text-accent bg-accent-soft rounded-full px-2 py-0.5 flex-shrink-0">
                Request
              </span>
            )}
            <p className={`text-sm truncate min-w-0 flex-1 ${c.unreadCount > 0 ? "text-ink" : "text-ink-muted"} ${c.last_message?.is_deleted ? "italic opacity-70" : ""}`}>
              {c.last_message?.is_deleted ? "This message was deleted" : c.last_message?.content ?? "Say hello"}
            </p>
          </div>
        </div>

        {c.unreadCount > 0 && (
          <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent text-canvas text-xs font-semibold flex items-center justify-center flex-shrink-0">
            {c.unreadCount > 99 ? "99+" : c.unreadCount}
          </span>
        )}
      </div>
    );
  }

  const nothingArchived =
    !isLoading &&
    requests.length === 0 &&
    archivedPosts.length === 0 &&
    archivedProjects.length === 0 &&
    archivedMessages.length === 0;

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center gap-3">
        {selectMode ? (
          <>
            <button onClick={exitSelectMode} className="text-ink-muted" aria-label="Cancel selection">
              <X size={22} />
            </button>
            <span className="flex-1 text-sm font-medium text-ink">{selectedIds.size} selected</span>
            <button
              onClick={handleBulkUnarchive}
              disabled={!selectedIds.size}
              className="text-ink-muted disabled:opacity-30"
              aria-label="Unarchive selected"
            >
              <ArchiveRestore size={19} />
            </button>
            <button
              onClick={handleBulkDeletePress}
              disabled={!selectedIds.size}
              className="text-danger disabled:opacity-30"
              aria-label="Delete selected"
            >
              <Trash2 size={19} />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => navigate(-1)} className="text-ink-muted">
              <ArrowLeft size={22} />
            </button>
            <h2 className="font-display text-2xl text-ink flex-1">Archive</h2>
            {(requests.length > 0 || archivedMessages.length > 0) && (
              <button onClick={() => setSelectMode(true)} className="text-ink-muted" aria-label="Select chats">
                <CheckSquare size={20} />
              </button>
            )}
          </>
        )}
      </header>

      <div className="max-w-xl mx-auto px-4 pt-2">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : nothingArchived ? (
          <p className="text-ink-muted text-center py-16 text-sm">Nothing archived right now.</p>
        ) : (
          <>
            {/* New message requests — always visible, not collapsed,
                since these are pending and worth surfacing immediately. */}
            {requests.length > 0 && !selectMode && (
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide pt-2 pb-1">
                New message requests
              </p>
            )}
            {requests.map(renderConversationRow)}

            {/* Archived posts */}
            {archivedPosts.length > 0 && (
              <div className="border-b border-border">
                <SectionHeader
                  label="Archived posts"
                  count={archivedPosts.length}
                  isOpen={openSection === "posts"}
                  onToggle={() => toggleSection("posts")}
                />
                <AccordionBody isOpen={openSection === "posts"}>
                  <div className="pb-2">
                    {archivedPosts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => setPreviewPost(post)}
                        className="w-full flex items-start justify-between gap-3 py-2.5 text-left border-t border-border/60 first:border-t-0"
                      >
                        <span className="text-sm text-ink truncate">
                          {post.heading || post.content || "Untitled post"}
                        </span>
                        <span className="text-xs text-ink-muted flex-shrink-0">{timeAgo(post.created_at)}</span>
                      </button>
                    ))}
                  </div>
                </AccordionBody>
              </div>
            )}

            {/* Archived projects */}
            {archivedProjects.length > 0 && (
              <div className="border-b border-border">
                <SectionHeader
                  label="Archived projects"
                  count={archivedProjects.length}
                  isOpen={openSection === "projects"}
                  onToggle={() => toggleSection("projects")}
                />
                <AccordionBody isOpen={openSection === "projects"}>
                  <div className="pb-2">
                    {archivedProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} isOwnerView />
                    ))}
                  </div>
                </AccordionBody>
              </div>
            )}

            {/* Archived messages — manually archived chats, distinct
                from the pending requests above. */}
            {archivedMessages.length > 0 && (
              <div>
                <SectionHeader
                  label="Archived messages"
                  count={archivedMessages.length}
                  isOpen={openSection === "messages"}
                  onToggle={() => toggleSection("messages")}
                />
                <AccordionBody isOpen={openSection === "messages"}>
                  <div>{archivedMessages.map(renderConversationRow)}</div>
                </AccordionBody>
              </div>
            )}
          </>
        )}
      </div>

      {previewPost && <ArchivedPostModal post={previewPost} onClose={() => setPreviewPost(null)} />}

      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setActionTarget(null)} />
          <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border pb-[env(safe-area-inset-bottom)]">
            <p className="px-4 pt-4 pb-2 text-xs text-ink-muted truncate">{actionTarget.other_participant.display_name}</p>

            <button
              onClick={() => {
                handleUnarchive(actionTarget);
                setActionTarget(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-ink"
            >
              <ArchiveRestore size={18} />
              Unarchive
            </button>

            <button
              onClick={() => {
                enterSelectMode(actionTarget.id);
                setActionTarget(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-ink"
            >
              <CheckSquare size={18} />
              Select chats
            </button>

            <button
              onClick={() => {
                setDeleteTarget({ ids: [actionTarget.id], label: "this chat" });
                setActionTarget(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-danger"
            >
              <Trash2 size={18} />
              Delete chat
            </button>

            <button onClick={() => setActionTarget(null)} className="w-full py-3.5 text-sm text-ink-muted border-t border-border mt-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete ${deleteTarget.label}?`}
          description="This removes it from your Archive. The other participant keeps their copy, and you can't undo this."
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
