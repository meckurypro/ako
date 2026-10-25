// src/components/course/ReorderPanel.tsx
// Drag-to-reorder for the whole curriculum: sections move as blocks, lessons move within a section or into another
// one. Nothing is saved until "Save order".
import { useRef, useState } from "react";
import { ClipboardList, FileText, GripVertical, ListChecks, Video } from "lucide-react";
import type { CourseModule, OutlineDraft } from "../../hooks/useCourseBuilder";
import { lessonTypeOf, type LessonType } from "../../lib/courseTypes";

interface DraftLesson {
  id: string;
  title: string;
  type: LessonType;
}
interface DraftModule {
  id: string;
  title: string;
  locked: boolean;
  lessons: DraftLesson[];
}

const ICON: Record<LessonType, typeof Video> = { video: Video, text: FileText, quiz: ListChecks, assignment: ClipboardList };

function toDraft(modules: CourseModule[]): DraftModule[] {
  return modules.map((m) => ({
    id: m.id,
    title: m.title,
    locked: !!m.is_foreword_managed,
    lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, type: lessonTypeOf(l) })),
  }));
}

export function ReorderPanel({
  modules,
  saving,
  onSave,
  onCancel,
}: {
  modules: CourseModule[];
  saving: boolean;
  onSave: (draft: OutlineDraft[]) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<DraftModule[]>(() => toDraft(modules));
  const [drag, setDrag] = useState<{ kind: "lesson" | "section"; id: string } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  function moveLesson(lessonId: string, targetEl: Element, clientY: number) {
    setDraft((prev) => {
      const from = prev.find((m) => m.lessons.some((l) => l.id === lessonId));
      const lesson = from?.lessons.find((l) => l.id === lessonId);
      if (!from || !lesson) return prev;
      const rect = targetEl.getBoundingClientRect();
      const after = clientY > rect.top + rect.height / 2;
      const targetLessonId = targetEl.getAttribute("data-lesson");
      const targetSecId = targetEl.getAttribute("data-sec-body");
      if (targetLessonId === lessonId) return prev;
      const next = prev.map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }));
      if (targetLessonId) {
        const host = next.find((m) => m.lessons.some((l) => l.id === targetLessonId));
        if (!host || host.locked) return prev;
        const idx = host.lessons.findIndex((l) => l.id === targetLessonId);
        host.lessons.splice(idx + (after ? 1 : 0), 0, lesson);
      } else if (targetSecId) {
        const host = next.find((m) => m.id === targetSecId);
        if (!host || host.locked) return prev;
        host.lessons.splice(after && host.lessons.length ? host.lessons.length : 0, 0, lesson);
      } else return prev;
      return next;
    });
  }

  function moveSection(sectionId: string, targetEl: Element, clientY: number) {
    const targetId = targetEl.getAttribute("data-sec");
    if (!targetId || targetId === sectionId) return;
    const rect = targetEl.getBoundingClientRect();
    const after = clientY > rect.top + rect.height / 2;
    setDraft((prev) => {
      const item = prev.find((m) => m.id === sectionId);
      if (!item) return prev;
      const rest = prev.filter((m) => m.id !== sectionId);
      const idx = rest.findIndex((m) => m.id === targetId);
      if (idx < 0) return prev;
      rest.splice(idx + (after ? 1 : 0), 0, item);
      return rest;
    });
  }

  function onMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    if (e.clientY < 90) window.scrollBy(0, -14);
    else if (e.clientY > window.innerHeight - 90) window.scrollBy(0, 14);
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!under) return;
    if (d.kind === "lesson") {
      const target = under.closest("[data-lesson]") ?? under.closest("[data-sec-body]");
      if (target) moveLesson(d.id, target, e.clientY);
    } else {
      const target = under.closest("[data-sec]");
      if (target) moveSection(d.id, target, e.clientY);
    }
  }

  const grip = (kind: "lesson" | "section", id: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDrag({ kind, id });
    },
    onPointerMove: onMove,
    onPointerUp: () => setDrag(null),
    onPointerCancel: () => setDrag(null),
    style: { touchAction: "none" as const },
  });

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-3 flex items-center justify-between border-b border-border bg-canvas px-4 py-2.5">
        <span className="text-sm font-medium text-ink">Drag to reorder</span>
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-sm text-ink-muted">
            Cancel
          </button>
          <button
            onClick={() => onSave(draft.map((m) => ({ id: m.id, lessons: m.lessons.map((l) => ({ id: l.id })) })))}
            disabled={saving}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-canvas disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save order"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {draft.map((m) => {
          const lifted = drag?.kind === "section" && drag.id === m.id;
          return (
            <div key={m.id} data-sec={m.id} className={`rounded-xl border bg-surface p-2.5 transition-shadow ${lifted ? "border-accent shadow-lg" : "border-border"}`}>
              <div className="flex items-center gap-2">
                <span {...grip("section", m.id)} className="flex h-9 w-7 flex-shrink-0 cursor-grab items-center justify-center text-ink-muted" aria-label="Drag section">
                  <GripVertical size={18} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{m.title}</span>
                <span className="text-xs text-ink-muted">{m.lessons.length}</span>
              </div>
              <div data-sec-body={m.id} className="mt-1.5 flex min-h-8 flex-col gap-1 pl-1">
                {m.lessons.map((l) => {
                  const Icon = ICON[l.type];
                  const liftedLesson = drag?.kind === "lesson" && drag.id === l.id;
                  return (
                    <div
                      key={l.id}
                      data-lesson={l.id}
                      className={`flex items-center gap-2 rounded-lg border bg-canvas px-1 py-1 ${liftedLesson ? "border-accent shadow-md" : "border-border"}`}
                    >
                      {m.locked ? (
                        <span className="w-7" />
                      ) : (
                        <span {...grip("lesson", l.id)} className="flex h-9 w-7 flex-shrink-0 cursor-grab items-center justify-center text-ink-muted" aria-label="Drag lesson">
                          <GripVertical size={16} />
                        </span>
                      )}
                      <Icon size={13} className="flex-shrink-0 text-ink-muted" />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{l.title}</span>
                    </div>
                  );
                })}
                {m.lessons.length === 0 && <p className="py-1.5 pl-2 text-xs text-ink-muted">Drop a lesson here.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
