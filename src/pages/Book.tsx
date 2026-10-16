// src/pages/Book.tsx
import { useMemo, useRef, useState } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ImageIcon,
  Lock,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProjectOwnership } from "../hooks/useProjectOwnership";
import { useRecordFreeProjectOpen } from "../hooks/useProjectAccess";
import { useProject, useHasPurchased, isProjectFree, getEffectivePrice, usePurchaseProject } from "../hooks/useProjects";
import { getProjectUrl } from "../lib/projectLinks";
import { BookReflowReader } from "../components/book/BookReflowReader";
import { useIsProjectMember } from "../hooks/useProjectMembers";
import { useUploadProjectThumbnail } from "../hooks/useUploadProjectThumbnail";
import { Button } from "../components/Button";
import {
  useBookChapters,
  useAddChapter,
  useUpdateChapter,
  useMoveChapter,
  useDeleteChapter,
  usePublishBook,
  BOOK_SECTION_INFO,
  OPTIONAL_SECTION_ORDER,
  type BookChapter,
  type BookChapterKind,
} from "../hooks/useBookBuilder";


export function Book() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: project } = useProject(projectId);
  const ownership = useProjectOwnership();
  const isOwner = ownership.isOwner(project);
  // The creator opening their own free project isn't a reader, whichever identity they're acting as.
  const isCreator = !!user && project?.owner_id === user.id;
  const isFree = !!project && isProjectFree(project);
  const hasPurchasedQuery = useHasPurchased(projectId ?? "");
  const isMemberQuery = useIsProjectMember(projectId ?? "", project?.is_private ?? false);
  const privacyBlocked = !!project?.is_private && !isOwner && !isMemberQuery.data;
  const hasAccess = !privacyBlocked && (isOwner || isFree || !!hasPurchasedQuery.data);
  useRecordFreeProjectOpen(project, { isOwner: isCreator, enabled: !privacyBlocked });

  const { data: chapters } = useBookChapters(projectId);
  const purchaseProject = usePurchaseProject();

  const ordered = useMemo(() => (chapters ?? []).slice().sort((a, b) => a.sort_order - b.sort_order), [chapters]);

  // Wait for the acting identity: until it resolves isOwner is false, which would flash the locked view at the creator.
  if (!project || ownership.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <BookLockedView
        title={project.title}
        thumbnailUrl={project.thumbnail_url}
        price={getEffectivePrice(project)}
        onBuy={async () => {
          await purchaseProject.mutateAsync(project.id);
        }}
        buying={purchaseProject.isPending}
        onBack={() => navigate(-1)}
      />
    );
  }

  return <BookReflowReader
      projectId={project.id}
      title={project.title}
      chapters={ordered}
      userId={user?.id}
      thumbnailUrl={project.thumbnail_url}
      shareUrl={getProjectUrl(project)}
      onBack={() => navigate(-1)}
    />;
}

// ---------------------------------------------------------------
// /books/:id is the book AS A READER SEES IT — for everyone, the creator included (a creator who opens their own
// book's link, or finds it in Discover, reads it like any visitor). Editing lives at /books/:id/edit, reached only
// from the creator's own profile → Projects; anyone else who lands there is sent back to the reader.
// ---------------------------------------------------------------

export function BookEdit() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId);
  const ownership = useProjectOwnership();
  const { data: chapters } = useBookChapters(projectId);
  const publishBook = usePublishBook(projectId ?? "");
  const ordered = useMemo(() => (chapters ?? []).slice().sort((a, b) => a.sort_order - b.sort_order), [chapters]);

  if (!project || ownership.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }
  if (!ownership.isOwner(project)) return <Navigate to={`/books/${project.id}`} replace />;
  return <BookBuilder projectId={project.id} project={project} chapters={ordered} publishBook={publishBook} />;
}

// ---------------------------------------------------------------
// Locked state — mirrors ProjectCard's Buy pill, but as a full page
// since a shared /books/:id link can land a logged-out or
// not-yet-purchased visitor directly here.
// ---------------------------------------------------------------

function BookLockedView({
  title,
  thumbnailUrl,
  price,
  onBuy,
  buying,
  onBack,
}: {
  title: string;
  thumbnailUrl: string | null;
  price: number;
  onBuy: () => Promise<void>;
  buying: boolean;
  onBack: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <button onClick={onBack} className="absolute top-4 left-4 text-ink">
        <ArrowLeft size={22} />
      </button>
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" className="w-36 aspect-[2/3] object-cover rounded-lg shadow-lg" />
      ) : (
        <div className="w-36 aspect-[2/3] rounded-lg bg-surface flex items-center justify-center">
          <ImageIcon size={28} className="text-ink-muted" />
        </div>
      )}
      <p className="font-medium text-ink text-lg">{title}</p>
      <p className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Lock size={14} /> Buy to read this book
      </p>
      <button
        onClick={async () => {
          setError(null);
          try {
            await onBuy();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't complete purchase.");
          }
        }}
        disabled={buying}
        className="bg-accent text-canvas px-6 py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
      >
        {buying ? "Processing…" : `Buy for $${price.toFixed(2)}`}
      </button>
      {error && <p className="text-danger text-sm">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------
// Owner builder — cover, optional front/back-matter toggles, a free
// ordered chapter list, publish. Mirrors Course.tsx's module/lesson
// builder shape, flattened to one level (no modules, just chapters).
// ---------------------------------------------------------------

function BookBuilder({
  projectId,
  project,
  chapters,
  publishBook,
}: {
  projectId: string;
  project: { title: string; thumbnail_url: string | null; published_at: string | null };
  chapters: BookChapter[];
  publishBook: ReturnType<typeof usePublishBook>;
}) {
  const navigate = useNavigate();
  const addChapter = useAddChapter(projectId);
  const updateChapter = useUpdateChapter(projectId);
  const moveChapter = useMoveChapter(projectId);
  const deleteChapter = useDeleteChapter(projectId);
  const uploadThumbnail = useUploadProjectThumbnail();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addingSectionPicker, setAddingSectionPicker] = useState(false);

  const usedKinds = new Set(chapters.map((c) => c.kind));
  const availableOptionalSections = OPTIONAL_SECTION_ORDER.filter((k) => !usedKinds.has(k));

  function startEdit(chapter: BookChapter) {
    setEditingId(chapter.id);
    setDraftTitle(chapter.title);
    setDraftContent(chapter.content ?? "");
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      await updateChapter.mutateAsync({ chapterId: editingId, title: draftTitle.trim() || "Untitled", content: draftContent });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  }

  async function handleAddChapter() {
    const sortOrder = chapters.length > 0 ? chapters[chapters.length - 1].sort_order + 1 : 0;
    try {
      const created = await addChapter.mutateAsync({
        kind: "chapter",
        title: `Chapter ${chapters.filter((c) => c.kind === "chapter").length + 1}`,
        sortOrder,
      });
      startEdit(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add chapter.");
    }
  }

  async function handleAddSection(kind: BookChapterKind) {
    const sortOrder = chapters.length > 0 ? chapters[chapters.length - 1].sort_order + 1 : 0;
    try {
      const created = await addChapter.mutateAsync({ kind, title: BOOK_SECTION_INFO[kind].label, sortOrder });
      setAddingSectionPicker(false);
      startEdit(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add section.");
    }
  }

  async function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await uploadThumbnail.mutateAsync(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover upload failed.");
    }
  }

  async function handlePublish() {
    if (chapters.length === 0) {
      setError("Add at least one chapter before publishing.");
      return;
    }
    try {
      await publishBook.mutateAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="sticky top-0 z-10 bg-canvas/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-ink">
          <ArrowLeft size={22} />
        </button>
        <p className="text-sm font-medium text-ink truncate max-w-[50%]">{project.title}</p>
        {!project.published_at ? (
          <Button onClick={handlePublish} loading={publishBook.isPending} className="!w-auto !py-1.5 !px-4 text-sm">
            Publish
          </Button>
        ) : (
          <span className="text-xs text-ink-muted">Published</span>
        )}
      </div>

      <div className="px-4 py-4 max-w-xl mx-auto">
        {/* Cover */}
        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadThumbnail.isPending}
          className="w-28 aspect-[2/3] rounded-lg bg-surface border border-border flex items-center justify-center overflow-hidden mb-6 disabled:opacity-50"
        >
          {project.thumbnail_url ? (
            <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-ink-muted">
              <ImageIcon size={20} />
              <span className="text-[11px]">{uploadThumbnail.isPending ? "Uploading…" : "Add cover"}</span>
            </div>
          )}
        </button>
        <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />

        {error && <p className="text-danger text-sm mb-4">{error}</p>}

        {/* Ordered section/chapter list */}
        <div className="flex flex-col gap-2 mb-4">
          {chapters.map((chapter, i) => (
            <div key={chapter.id} className="border border-border rounded-xl p-3">
              {editingId === chapter.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Title"
                    className="px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm font-medium"
                  />
                  <textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    placeholder={BOOK_SECTION_INFO[chapter.kind].hint}
                    rows={10}
                    className="px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm resize-y"
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={saveEdit} loading={updateChapter.isPending} className="!w-auto !py-1.5 !px-4 text-sm">
                      Save
                    </Button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-ink-muted px-3 py-1.5">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col shrink-0">
                    <button
                      onClick={() => moveChapter.mutate({ chapters, chapterId: chapter.id, direction: "up" })}
                      disabled={i === 0}
                      className="text-ink-muted disabled:opacity-20"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveChapter.mutate({ chapters, chapterId: chapter.id, direction: "down" })}
                      disabled={i === chapters.length - 1}
                      className="text-ink-muted disabled:opacity-20"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink-muted uppercase tracking-wide">
                      {chapter.kind === "chapter" ? `Chapter` : BOOK_SECTION_INFO[chapter.kind].label}
                    </p>
                    <p className="text-sm font-medium text-ink truncate">{chapter.title}</p>
                    {!chapter.content?.trim() && <p className="text-xs text-accent">Empty — tap to write</p>}
                  </div>
                  <button onClick={() => startEdit(chapter)} className="text-ink-muted shrink-0">
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove "${chapter.title}"?`)) deleteChapter.mutate(chapter.id);
                    }}
                    className="text-danger shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleAddChapter}
          disabled={addChapter.isPending}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-border text-sm text-accent font-medium mb-3 disabled:opacity-50"
        >
          <Plus size={16} />
          Add chapter
        </button>

        {/* Optional front/back-matter toggles — "turn on" one by
            adding it here, "turn off" by deleting it above. */}
        {availableOptionalSections.length > 0 && (
          <div>
            <button
              onClick={() => setAddingSectionPicker((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm text-ink-muted font-medium"
            >
              <Plus size={14} />
              Add a section (foreword, epilogue, etc.)
            </button>
            {addingSectionPicker && (
              <div className="flex flex-wrap gap-2 mt-2">
                {availableOptionalSections.map((kind) => (
                  <button
                    key={kind}
                    onClick={() => handleAddSection(kind)}
                    className="px-3 py-1.5 rounded-full border border-border text-xs text-ink-muted"
                  >
                    {BOOK_SECTION_INFO[kind].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
