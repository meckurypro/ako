// src/pages/Course.tsx
import { useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProject, useHasPurchased } from "../hooks/useProjects";
import {
  useCourseModules,
  useAddModule,
  useAddLesson,
  useDeleteModule,
  usePublishCourse,
} from "../hooks/useCourseBuilder";

// Combined builder (owner) + viewer (buyer) — same underlying data,
// the owner just gets add/delete controls and a Publish button on
// top. Module/lesson RLS already restricts reads to owner-or-buyer,
// so a visitor with neither just sees an empty "locked" state below
// rather than an RLS error.
export function Course() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const isOwner = !!user && project?.owner_id === user.id;
  const hasPurchasedQuery = useHasPurchased(projectId ?? "");
  const hasAccess = isOwner || !!hasPurchasedQuery.data;

  const { data: modules } = useCourseModules(projectId);
  const addModule = useAddModule(projectId ?? "");
  const addLesson = useAddLesson(projectId ?? "");
  const deleteModule = useDeleteModule(projectId ?? "");
  const publishCourse = usePublishCourse(projectId ?? "");

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [lessonDraftFor, setLessonDraftFor] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");

  async function handleAddModule(e: FormEvent) {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;
    await addModule.mutateAsync({ title: newModuleTitle.trim(), sortOrder: modules?.length ?? 0 });
    setNewModuleTitle("");
  }

  async function handleAddLesson(e: FormEvent, moduleId: string) {
    e.preventDefault();
    if (!lessonTitle.trim()) return;
    const module = modules?.find((m) => m.id === moduleId);
    await addLesson.mutateAsync({
      moduleId,
      title: lessonTitle.trim(),
      content: lessonContent.trim() || undefined,
      sortOrder: module?.lessons.length ?? 0,
    });
    setLessonTitle("");
    setLessonContent("");
    setLessonDraftFor(null);
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
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-3">
          <ArrowLeft size={22} />
        </button>

        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-2xl text-ink truncate">{project.title}</h2>
        </div>

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

        {!hasAccess && (
          <div className="flex flex-col items-center text-center gap-2 mt-10 mb-6">
            <Lock size={24} className="text-ink-muted" />
            <p className="text-sm text-ink-muted">
              Buy this course from its project page to unlock lessons.
            </p>
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="text-accent text-sm font-medium"
            >
              Go to project page
            </button>
          </div>
        )}

        {hasAccess && (
          <div className="flex flex-col gap-3">
            {(modules ?? []).map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-ink font-medium text-sm">{m.title}</p>
                  {isOwner && (
                    <button
                      onClick={() => deleteModule.mutate(m.id)}
                      className="text-xs text-danger"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 mb-2">
                  {m.lessons.map((l) => (
                    <div key={l.id} className="pl-3 border-l-2 border-border text-sm">
                      <p className="text-ink">{l.title}</p>
                      {l.content && <p className="text-xs text-ink-muted whitespace-pre-wrap">{l.content}</p>}
                    </div>
                  ))}
                  {m.lessons.length === 0 && (
                    <p className="text-xs text-ink-muted pl-3">No lessons yet.</p>
                  )}
                </div>

                {isOwner && (
                  <>
                    {lessonDraftFor === m.id ? (
                      <form onSubmit={(e) => handleAddLesson(e, m.id)} className="mt-2">
                        <input
                          type="text"
                          placeholder="Lesson title"
                          value={lessonTitle}
                          onChange={(e) => setLessonTitle(e.target.value)}
                          required
                          className="w-full mb-1.5 px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
                        />
                        <textarea
                          placeholder="Lesson content (optional)"
                          value={lessonContent}
                          onChange={(e) => setLessonContent(e.target.value)}
                          rows={2}
                          className="w-full mb-1.5 px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink resize-none"
                        />
                        <button
                          type="submit"
                          disabled={addLesson.isPending}
                          className="text-xs font-medium text-accent"
                        >
                          {addLesson.isPending ? "Adding…" : "Add lesson"}
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setLessonDraftFor(m.id)}
                        className="flex items-center gap-1 text-xs text-accent font-medium mt-1"
                      >
                        <Plus size={12} /> Add lesson
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}

            {isOwner && (
              <form onSubmit={handleAddModule} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New module title"
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

            {!isOwner && (modules ?? []).length === 0 && (
              <p className="text-sm text-ink-muted">No content yet — check back later.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
