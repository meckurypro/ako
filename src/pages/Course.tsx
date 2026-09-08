// src/pages/Course.tsx
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSmartBack } from "../hooks/useSmartBack";
import {
  ArrowLeft,
  Plus,
  Lock,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Eye,
  PlayCircle,
  FileText,
  PartyPopper,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProject, useHasPurchased, isProjectFree } from "../hooks/useProjects";
import {
  useCourseModules,
  useAddModule,
  useUpdateModuleTitle,
  useMoveModule,
  useDeleteModule,
  useAddLesson,
  useUpdateLesson,
  useDeleteLesson,
  useMoveLesson,
  usePublishCourse,
  useCourseProgress,
  useSetLessonComplete,
  type CourseLesson,
} from "../hooks/useCourseBuilder";

// ---------------------------------------------------------------
// Lesson video embedding — a course lesson's media_url is a plain
// pasted link (YouTube, Vimeo, or a direct video file), not an Ako
// storage upload. There's no lesson-video upload pipeline; hosting
// stays on whichever platform the instructor already uses, same as
// how Udemy instructors mostly upload once to Udemy's own encoder,
// but plenty of course tools (and this one, for now) just take a URL.
// ---------------------------------------------------------------

type EmbedKind = { type: "youtube" | "vimeo"; embedUrl: string } | { type: "video" } | { type: "link" };

function resolveEmbed(url: string): EmbedKind {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/);
  if (yt) return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) return { type: "video" };
  return { type: "link" };
}

function LessonMedia({ url, onWatched }: { url: string; onWatched: () => void }) {
  const embed = resolveEmbed(url);
  if (embed.type === "youtube" || embed.type === "vimeo") {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-canvas mb-2">
        <iframe
          src={embed.embedUrl}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Lesson video"
        />
      </div>
    );
  }
  if (embed.type === "video") {
    return (
      // Udemy auto-marks a lecture complete once you've watched all
      // of it — onEnded is the direct equivalent for a file we can
      // actually observe playback on (YouTube/Vimeo iframes are
      // cross-origin, so there's no "ended" event to listen for there;
      // those rely on the manual Mark complete button instead).
      <video controls src={url} onEnded={onWatched} className="w-full rounded-xl max-h-80 mb-2 bg-canvas" />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-sm text-accent font-medium mb-2"
    >
      <PlayCircle size={15} />
      Open lesson video
    </a>
  );
}

// ---------------------------------------------------------------
// Owner's add/edit form for a single lesson.
// ---------------------------------------------------------------

interface LessonFormValue {
  title: string;
  content: string;
  mediaUrl: string;
  isFreePreview: boolean;
}

function LessonForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: LessonFormValue;
  submitLabel: string;
  pending: boolean;
  onSubmit: (value: LessonFormValue) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.title.trim()) return;
        onSubmit(value);
      }}
      className="mt-2 flex flex-col gap-1.5"
    >
      <input
        type="text"
        placeholder="Lesson title"
        value={value.title}
        onChange={(e) => setValue({ ...value, title: e.target.value })}
        required
        className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
      />
      <input
        type="url"
        placeholder="Video link (YouTube, Vimeo, or a direct video URL) — optional"
        value={value.mediaUrl}
        onChange={(e) => setValue({ ...value, mediaUrl: e.target.value })}
        className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
      />
      <textarea
        placeholder="Article text / lesson notes (optional)"
        value={value.content}
        onChange={(e) => setValue({ ...value, content: e.target.value })}
        rows={2}
        className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink resize-none"
      />
      <button
        type="button"
        onClick={() => setValue({ ...value, isFreePreview: !value.isFreePreview })}
        aria-pressed={value.isFreePreview}
        className={`self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
          value.isFreePreview ? "bg-accent text-canvas border-accent" : "bg-surface text-ink-muted border-border"
        }`}
      >
        <Eye size={12} />
        Free preview
      </button>
      <div className="flex items-center gap-3 mt-0.5">
        <button type="submit" disabled={pending || !value.title.trim()} className="text-xs font-medium text-accent disabled:opacity-50">
          {pending ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-ink-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------
// Combined builder (owner) + player (buyer) — same underlying data,
// the owner just gets edit/reorder/publish controls on top. The
// curriculum outline (titles only) is always visible, purchased or
// not — same as a Udemy course landing page — so a prospective buyer
// can see what's inside before paying; only opening a locked lesson's
// content requires access or that lesson's free-preview flag.
// ---------------------------------------------------------------

export function Course() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const isOwner = !!user && project?.owner_id === user.id;
  const isFree = !!project && isProjectFree(project);
  const hasPurchasedQuery = useHasPurchased(projectId ?? "");
  const hasAccess = isOwner || isFree || !!hasPurchasedQuery.data;

  const { data: modules } = useCourseModules(projectId);
  const progressQuery = useCourseProgress(projectId, user?.id);
  const completedIds = progressQuery.data ?? new Set<string>();
  const setLessonComplete = useSetLessonComplete(projectId ?? "", user?.id);

  const addModule = useAddModule(projectId ?? "");
  const updateModuleTitle = useUpdateModuleTitle(projectId ?? "");
  const moveModule = useMoveModule(projectId ?? "");
  const deleteModule = useDeleteModule(projectId ?? "");
  const addLesson = useAddLesson(projectId ?? "");
  const updateLesson = useUpdateLesson(projectId ?? "");
  const deleteLesson = useDeleteLesson(projectId ?? "");
  const moveLesson = useMoveLesson(projectId ?? "");
  const publishCourse = usePublishCourse(projectId ?? "");

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");
  const [lessonDraftFor, setLessonDraftFor] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

  const flatLessons = useMemo(
    () => (modules ?? []).flatMap((m) => m.lessons),
    [modules]
  );
  const totalLessons = flatLessons.length;
  const completedCount = flatLessons.filter((l) => completedIds.has(l.id)).length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const allComplete = totalLessons > 0 && completedCount === totalLessons;

  // "Continue where you left off": once the course and progress have
  // loaded, land on the first not-yet-completed lesson (or the very
  // first lesson if nothing's been completed, or if the course has
  // just been finished).
  useEffect(() => {
    if (selectedLessonId || !hasAccess || flatLessons.length === 0 || progressQuery.isLoading) return;
    const firstIncomplete = flatLessons.find((l) => !completedIds.has(l.id));
    setSelectedLessonId((firstIncomplete ?? flatLessons[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess, flatLessons, progressQuery.isLoading]);

  const selectedLesson = flatLessons.find((l) => l.id === selectedLessonId) ?? null;
  const canOpen = (lesson: CourseLesson) => hasAccess || lesson.is_free_preview;
  const selectedIndex = selectedLesson ? flatLessons.findIndex((l) => l.id === selectedLesson.id) : -1;
  const prevLesson = selectedIndex > 0 ? flatLessons[selectedIndex - 1] : null;
  const nextLesson = selectedIndex >= 0 && selectedIndex < flatLessons.length - 1 ? flatLessons[selectedIndex + 1] : null;

  // Udemy auto-marks text/article lectures complete a few seconds
  // after they load, since there's no "watched to the end" signal for
  // plain text the way there is for video. Mirrors that here for any
  // lesson with no video attached.
  useEffect(() => {
    if (!selectedLesson || !hasAccess || selectedLesson.media_url) return;
    if (completedIds.has(selectedLesson.id)) return;
    const timer = window.setTimeout(() => {
      setLessonComplete.mutate({ lessonId: selectedLesson.id, completed: true });
    }, 4000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLesson?.id, hasAccess]);

  function toggleModuleCollapsed(moduleId: string) {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  async function handleAddModule(e: FormEvent) {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;
    await addModule.mutateAsync({ title: newModuleTitle.trim(), sortOrder: modules?.length ?? 0 });
    setNewModuleTitle("");
  }

  function selectLesson(lesson: CourseLesson) {
    if (!canOpen(lesson)) return;
    setSelectedLessonId(lesson.id);
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={smartBack} className="text-ink-muted mb-3">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink truncate mb-1">{project.title}</h2>

        {isOwner && (
          <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-accent-soft/60">
            <span className="text-sm text-ink-muted">
              {project.published_at ? (
                <span className="flex items-center gap-1.5 text-accent">
                  <CheckCircle2 size={14} /> Published
                </span>
              ) : (
                "Draft — not visible to buyers yet"
              )}
            </span>
            {!project.published_at && (
              <button
                onClick={() => publishCourse.mutate()}
                disabled={publishCourse.isPending || (modules ?? []).length === 0}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-accent text-canvas disabled:opacity-50"
              >
                {publishCourse.isPending ? "Publishing…" : "Publish"}
              </button>
            )}
          </div>
        )}

        {/* Progress bar — visible to anyone with access, buyer or
            owner-previewing-their-own-course, same as Udemy's "Your
            progress" readout at the top of the course player. */}
        {hasAccess && totalLessons > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
              <span>
                {completedCount}/{totalLessons} lessons complete
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${progressPct}%` }} />
            </div>
            {allComplete && (
              <div className="flex items-center gap-1.5 text-sm text-accent font-medium mt-2">
                <PartyPopper size={15} />
                Course complete!
              </div>
            )}
          </div>
        )}

        {!hasAccess && (
          <div className="flex flex-col items-center text-center gap-2 mt-2 mb-5 p-4 rounded-xl bg-surface border border-border">
            <Lock size={22} className="text-ink-muted" />
            <p className="text-sm text-ink-muted">
              {flatLessons.some((l) => l.is_free_preview)
                ? "Preview a free lesson below, or buy the course to unlock everything."
                : "Buy this course from its project page to unlock every lesson."}
            </p>
            <button onClick={() => navigate(`/projects/${projectId}`)} className="text-accent text-sm font-medium">
              Go to project page
            </button>
          </div>
        )}

        {/* Player pane — the lesson currently open. Only ever shows a
            locked lesson's content if it's flagged for free preview;
            everything else routes through canOpen(). */}
        {selectedLesson && canOpen(selectedLesson) && (
          <div className="rounded-xl border border-border bg-surface p-3 mb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-ink font-medium text-sm">{selectedLesson.title}</p>
              {!hasAccess && selectedLesson.is_free_preview && (
                <span className="flex items-center gap-1 text-xs text-accent font-medium flex-shrink-0">
                  <Eye size={12} /> Preview
                </span>
              )}
            </div>

            {selectedLesson.media_url && (
              <LessonMedia
                url={selectedLesson.media_url}
                onWatched={() => {
                  if (hasAccess) setLessonComplete.mutate({ lessonId: selectedLesson.id, completed: true });
                }}
              />
            )}
            {selectedLesson.content && (
              <p className="text-sm text-ink whitespace-pre-wrap mb-2">{selectedLesson.content}</p>
            )}
            {!selectedLesson.media_url && !selectedLesson.content && (
              <p className="text-sm text-ink-muted mb-2">No content yet.</p>
            )}

            {hasAccess && (
              <button
                onClick={() =>
                  setLessonComplete.mutate({ lessonId: selectedLesson.id, completed: !completedIds.has(selectedLesson.id) })
                }
                disabled={setLessonComplete.isPending}
                className="flex items-center gap-1.5 text-sm font-medium disabled:opacity-50"
              >
                {completedIds.has(selectedLesson.id) ? (
                  <>
                    <CheckCircle2 size={16} className="text-accent" />
                    <span className="text-accent">Completed — mark incomplete</span>
                  </>
                ) : (
                  <>
                    <Circle size={16} className="text-ink-muted" />
                    <span className="text-ink-muted">Mark as complete</span>
                  </>
                )}
              </button>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <button
                onClick={() => prevLesson && selectLesson(prevLesson)}
                disabled={!prevLesson}
                className="text-xs font-medium text-ink-muted disabled:opacity-30"
              >
                ← Previous
              </button>
              <button
                onClick={() => nextLesson && selectLesson(nextLesson)}
                disabled={!nextLesson || !canOpen(nextLesson)}
                className="text-xs font-medium text-accent disabled:opacity-30 disabled:text-ink-muted"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Curriculum outline — always visible so a prospective buyer
            can see what's inside, same as a Udemy course landing page;
            locked rows just can't be opened. */}
        <div className="flex flex-col gap-3">
          {(modules ?? []).map((m, moduleIdx) => {
            const collapsed = collapsedModules.has(m.id);
            return (
              <div key={m.id} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  {editingModuleId === m.id ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!editingModuleTitle.trim()) return;
                        await updateModuleTitle.mutateAsync({ moduleId: m.id, title: editingModuleTitle.trim() });
                        setEditingModuleId(null);
                      }}
                      className="flex-1 flex items-center gap-1.5"
                    >
                      <input
                        autoFocus
                        value={editingModuleTitle}
                        onChange={(e) => setEditingModuleTitle(e.target.value)}
                        className="flex-1 px-2 py-1 rounded-lg border border-border bg-canvas text-sm text-ink"
                      />
                      <button type="submit" className="text-xs font-medium text-accent">
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingModuleId(null)} className="text-xs text-ink-muted">
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => toggleModuleCollapsed(m.id)}
                      className="flex-1 flex items-center gap-1.5 text-left min-w-0"
                    >
                      {collapsed ? (
                        <ChevronDown size={14} className="text-ink-muted flex-shrink-0" />
                      ) : (
                        <ChevronUp size={14} className="text-ink-muted flex-shrink-0" />
                      )}
                      <span className="text-ink font-medium text-sm truncate">
                        Section {moduleIdx + 1}: {m.title}
                      </span>
                      <span className="text-xs text-ink-muted flex-shrink-0">({m.lessons.length})</span>
                    </button>
                  )}

                  {isOwner && editingModuleId !== m.id && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => moveModule.mutate({ modules: modules ?? [], moduleId: m.id, direction: "up" })} disabled={moduleIdx === 0} className="text-ink-muted disabled:opacity-30">
                        <ChevronUp size={14} />
                      </button>
                      <button onClick={() => moveModule.mutate({ modules: modules ?? [], moduleId: m.id, direction: "down" })} disabled={moduleIdx === (modules ?? []).length - 1} className="text-ink-muted disabled:opacity-30">
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingModuleId(m.id);
                          setEditingModuleTitle(m.title);
                        }}
                        className="text-ink-muted"
                      >
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteModule.mutate(m.id)} className="text-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {!collapsed && (
                  <div className="flex flex-col gap-1 mb-2">
                    {m.lessons.map((l, lessonIdx) => {
                      const locked = !canOpen(l);
                      const complete = completedIds.has(l.id);
                      const isSelected = selectedLessonId === l.id;
                      return (
                        <div key={l.id}>
                          {editingLessonId === l.id ? (
                            <LessonForm
                              initial={{
                                title: l.title,
                                content: l.content ?? "",
                                mediaUrl: l.media_url ?? "",
                                isFreePreview: l.is_free_preview,
                              }}
                              submitLabel="Save lesson"
                              pending={updateLesson.isPending}
                              onCancel={() => setEditingLessonId(null)}
                              onSubmit={async (value) => {
                                await updateLesson.mutateAsync({
                                  lessonId: l.id,
                                  title: value.title.trim(),
                                  content: value.content.trim() || undefined,
                                  mediaUrl: value.mediaUrl.trim() || undefined,
                                  isFreePreview: value.isFreePreview,
                                });
                                setEditingLessonId(null);
                              }}
                            />
                          ) : (
                            <div
                              className={`flex items-center gap-2 pl-2 py-1.5 rounded-lg border-l-2 ${
                                isSelected ? "border-accent bg-accent-soft/40" : "border-border"
                              }`}
                            >
                              <button
                                onClick={() => (hasAccess ? setLessonComplete.mutate({ lessonId: l.id, completed: !complete }) : undefined)}
                                disabled={!hasAccess}
                                className="flex-shrink-0"
                                aria-label={complete ? "Mark incomplete" : "Mark complete"}
                              >
                                {locked ? (
                                  <Lock size={14} className="text-ink-muted" />
                                ) : complete ? (
                                  <CheckCircle2 size={14} className="text-accent" />
                                ) : (
                                  <Circle size={14} className="text-ink-muted" />
                                )}
                              </button>
                              <button
                                onClick={() => selectLesson(l)}
                                disabled={locked}
                                className="flex-1 flex items-center gap-1.5 text-left min-w-0 disabled:cursor-not-allowed"
                              >
                                {l.media_url ? (
                                  <PlayCircle size={13} className="text-ink-muted flex-shrink-0" />
                                ) : (
                                  <FileText size={13} className="text-ink-muted flex-shrink-0" />
                                )}
                                <span className={`text-sm truncate ${locked ? "text-ink-muted" : "text-ink"}`}>
                                  {lessonIdx + 1}. {l.title}
                                </span>
                                {!hasAccess && l.is_free_preview && (
                                  <span className="text-[11px] text-accent font-medium flex-shrink-0">Preview</span>
                                )}
                              </button>
                              {isOwner && (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button onClick={() => moveLesson.mutate({ lessons: m.lessons, lessonId: l.id, direction: "up" })} disabled={lessonIdx === 0} className="text-ink-muted disabled:opacity-30">
                                    <ChevronUp size={13} />
                                  </button>
                                  <button onClick={() => moveLesson.mutate({ lessons: m.lessons, lessonId: l.id, direction: "down" })} disabled={lessonIdx === m.lessons.length - 1} className="text-ink-muted disabled:opacity-30">
                                    <ChevronDown size={13} />
                                  </button>
                                  <button onClick={() => setEditingLessonId(l.id)} className="text-ink-muted">
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => deleteLesson.mutate(l.id)} className="text-danger">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {m.lessons.length === 0 && <p className="text-xs text-ink-muted pl-3">No lessons yet.</p>}
                  </div>
                )}

                {isOwner && !collapsed && (
                  <>
                    {lessonDraftFor === m.id ? (
                      <LessonForm
                        initial={{ title: "", content: "", mediaUrl: "", isFreePreview: m.lessons.length === 0 }}
                        submitLabel="Add lesson"
                        pending={addLesson.isPending}
                        onCancel={() => setLessonDraftFor(null)}
                        onSubmit={async (value) => {
                          await addLesson.mutateAsync({
                            moduleId: m.id,
                            title: value.title.trim(),
                            content: value.content.trim() || undefined,
                            mediaUrl: value.mediaUrl.trim() || undefined,
                            isFreePreview: value.isFreePreview,
                            sortOrder: m.lessons.length,
                          });
                          setLessonDraftFor(null);
                        }}
                      />
                    ) : (
                      <button onClick={() => setLessonDraftFor(m.id)} className="flex items-center gap-1 text-xs text-accent font-medium mt-1">
                        <Plus size={12} /> Add lesson
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {isOwner && (
            <form onSubmit={handleAddModule} className="flex gap-2">
              <input
                type="text"
                placeholder="New section title"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-full border border-border bg-canvas text-sm text-ink"
              />
              <button
                type="submit"
                disabled={addModule.isPending || !newModuleTitle.trim()}
                className="px-4 py-2.5 rounded-full bg-accent text-canvas text-sm font-medium disabled:opacity-50"
              >
                Add
              </button>
            </form>
          )}

          {!isOwner && (modules ?? []).length === 0 && <p className="text-sm text-ink-muted">No content yet — check back later.</p>}
        </div>
      </div>
    </div>
  );
}
