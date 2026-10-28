// src/components/course/LessonEditor.tsx
// Add / edit one lesson. A new lesson starts by choosing its type (video, reading, quiz, assignment); each type then
// shows only the fields it needs.
import { useState } from "react";
import { ArrowLeft, ClipboardList, Eye, FileText, ListChecks, Plus, Trash2, Video, X } from "lucide-react";
import { EditorToolbar, editorKeyHandler } from "../EditorToolbar";
import { useUndoRedo } from "../../hooks/useUndoRedo";
import { removeCourseVideos } from "../../lib/courseVideo";
import {
  LESSON_TYPES,
  MAX_QUIZ_OPTIONS,
  MIN_QUIZ_OPTIONS,
  cleanQuiz,
  emptyQuestion,
  isQuestionComplete,
  lessonTypeLabel,
  type LessonType,
  type QuizData,
  videoLinkProblem,
} from "../../lib/courseTypes";
import { EMPTY_VIDEO, LessonVideoField, type VideoValue } from "./LessonVideoField";

export interface LessonFormValue {
  lessonType: LessonType;
  title: string;
  content: string;
  quiz: QuizData;
  isFreePreview: boolean;
  /** Section the lesson belongs to. Changing it moves the lesson to the end of that section. */
  moduleId: string;
}

export interface LessonSubmit extends LessonFormValue {
  video: VideoValue;
}

const TYPE_ICON: Record<LessonType, typeof Video> = { video: Video, text: FileText, quiz: ListChecks, assignment: ClipboardList };
export const PASS_MARKS = [50, 60, 70, 80, 90, 100];

const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink";

function QuizEditor({ quiz, onChange }: { quiz: QuizData; onChange: (q: QuizData) => void }) {
  const setQuestion = (i: number, patch: Partial<QuizData["questions"][number]>) =>
    onChange({ ...quiz, questions: quiz.questions.map((q, qi) => (qi === i ? { ...q, ...patch } : q)) });

  return (
    <div className="flex flex-col gap-3">
      {quiz.questions.map((q, qi) => (
        <div key={q.id} className="rounded-xl border border-border bg-canvas p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-muted">Question {qi + 1}</span>
            <button
              type="button"
              onClick={() => onChange({ ...quiz, questions: quiz.questions.filter((_, i) => i !== qi) })}
              aria-label="Delete question"
              className="text-danger"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <input value={q.prompt} onChange={(e) => setQuestion(qi, { prompt: e.target.value })} placeholder="Question" className={inputCls} />
          <div className="mt-2 flex flex-col gap-1.5">
            {q.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correct === oi}
                  onChange={() => setQuestion(qi, { correct: oi })}
                  aria-label={`Mark option ${oi + 1} as the answer`}
                  className="h-4 w-4 flex-shrink-0 accent-[var(--color-accent)]"
                />
                <input
                  value={o}
                  onChange={(e) => setQuestion(qi, { options: q.options.map((x, i) => (i === oi ? e.target.value : x)) })}
                  placeholder={`Option ${oi + 1}`}
                  className={inputCls}
                />
                {q.options.length > MIN_QUIZ_OPTIONS && (
                  <button
                    type="button"
                    aria-label="Remove option"
                    onClick={() =>
                      setQuestion(qi, {
                        options: q.options.filter((_, i) => i !== oi),
                        correct: q.correct === oi ? 0 : q.correct > oi ? q.correct - 1 : q.correct,
                      })
                    }
                    className="flex-shrink-0 text-ink-muted"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {q.options.length < MAX_QUIZ_OPTIONS && (
            <button type="button" onClick={() => setQuestion(qi, { options: [...q.options, ""] })} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-accent">
              <Plus size={12} /> Add option
            </button>
          )}
          <input
            value={q.explanation ?? ""}
            onChange={(e) => setQuestion(qi, { explanation: e.target.value })}
            placeholder="Why it's right (optional)"
            className={`${inputCls} mt-2`}
          />
          {q.prompt.trim() && !isQuestionComplete(q) && <p className="mt-1.5 text-xs text-danger">Needs two options and a marked answer.</p>}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...quiz, questions: [...quiz.questions, emptyQuestion()] })}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-accent"
      >
        <Plus size={14} /> Add question
      </button>
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        Pass mark
        <select
          value={quiz.pass_mark}
          onChange={(e) => onChange({ ...quiz, pass_mark: Number(e.target.value) })}
          className="rounded-lg border border-border bg-canvas px-2 py-1 text-sm text-ink"
        >
          {PASS_MARKS.map((p) => (
            <option key={p} value={p}>
              {p}%
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function LessonEditor({
  projectId,
  initial,
  initialVideo,
  isNew,
  sections,
  suggestFreePreview = false,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  projectId: string;
  initial: LessonFormValue;
  initialVideo: VideoValue;
  isNew: boolean;
  /** Sections the lesson can live in (the locked Foreword section is left out). */
  sections: { id: string; title: string }[];
  /** True while the course has no free preview yet: a new video lesson then starts as one. */
  suggestFreePreview?: boolean;
  submitLabel: string;
  pending: boolean;
  onSubmit: (value: LessonSubmit) => void;
  onCancel: () => void;
}) {
  const [typeChosen, setTypeChosen] = useState(!isNew);
  const history = useUndoRedo(initial);
  const value = history.value;
  const setValue = history.set;
  const [video, setVideo] = useState<VideoValue>(initialVideo);
  const [uploading, setUploading] = useState(false);
  const savedPath = initialVideo.videoPath;

  const type = value.lessonType;
  const completeQuestions = value.quiz.questions.filter(isQuestionComplete).length;
  const missing: string | null = !value.title.trim()
    ? "Add a title."
    : uploading
      ? "Wait for the upload to finish."
      : type === "video" && !video.videoPath && !video.mediaUrl.trim()
        ? "Add a video."
        : type === "video" && !video.videoPath && videoLinkProblem(video.mediaUrl)
          ? (videoLinkProblem(video.mediaUrl) as string)
          : type === "text" && !value.content.trim()
          ? "Write the lesson."
          : type === "assignment" && !value.content.trim()
            ? "Describe the task."
            : type === "quiz" && completeQuestions === 0
              ? "Add a question."
              : null;

  const submit = () => {
    if (missing) return;
    const quiz = type === "quiz" ? cleanQuiz(value.quiz) : value.quiz;
    // A video uploaded in this form that the lesson won't keep (the type was switched away from video before saving)
    // would otherwise sit in storage with nothing pointing at it.
    if (type !== "video" && video.videoPath && video.videoPath !== savedPath) void removeCourseVideos([video.videoPath]);
    onSubmit({ ...value, quiz, video });
    history.markSaved();
  };

  const cancel = () => {
    // A video uploaded in this form and never saved is thrown away with it.
    if (video.videoPath && video.videoPath !== savedPath) void removeCourseVideos([video.videoPath]);
    onCancel();
  };

  if (!typeChosen) {
    return (
      <div className="mt-2 rounded-xl border border-border bg-canvas p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-ink">What kind of lesson?</span>
          <button type="button" onClick={cancel} className="text-xs text-ink-muted">
            Cancel
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LESSON_TYPES.map(({ type: t, label, hint }) => {
            const Icon = TYPE_ICON[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setValue({ ...value, lessonType: t, isFreePreview: t === "video" && suggestFreePreview }, { step: true });
                  setTypeChosen(true);
                }}
                className="flex flex-col items-start gap-1 rounded-xl border border-border bg-surface p-3 text-left active:bg-accent-soft/50"
              >
                <Icon size={18} className="text-accent" />
                <span className="text-sm font-semibold text-ink">{label}</span>
                <span className="text-xs text-ink-muted">{hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const Icon = TYPE_ICON[type];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={editorKeyHandler({ undo: history.undo, redo: history.redo, save: submit })}
      className="mt-2 flex flex-col gap-2"
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
        {isNew && (
          <button type="button" onClick={() => setTypeChosen(false)} aria-label="Change lesson type" className="text-ink-muted">
            <ArrowLeft size={14} />
          </button>
        )}
        <Icon size={13} /> {lessonTypeLabel(type)}
      </div>

      <input
        type="text"
        placeholder="Lesson title"
        value={value.title}
        onChange={(e) => setValue({ ...value, title: e.target.value })}
        required
        className={inputCls}
      />

      {type === "video" && (
        <LessonVideoField projectId={projectId} value={video} savedPath={savedPath} onChange={setVideo} onBusyChange={setUploading} />
      )}

      {type === "quiz" && <QuizEditor quiz={value.quiz} onChange={(quiz) => setValue({ ...value, quiz })} />}

      {(type === "video" || type === "text" || type === "assignment" || type === "quiz") && (
        <textarea
          placeholder={
            type === "assignment"
              ? "What should learners do?"
              : type === "text"
                ? "Lesson text\nTip: # heading, - list, 1. steps, > note, ``` code ```, **bold**, `code`"
                : type === "quiz"
                  ? "Intro (optional)"
                  : "Notes (optional)"
          }
          value={value.content}
          onChange={(e) => setValue({ ...value, content: e.target.value })}
          rows={type === "text" || type === "assignment" ? 7 : 3}
          className={`${inputCls} resize-none`}
        />
      )}

      {sections.length > 1 && (
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          Section
          <select
            value={value.moduleId}
            onChange={(e) => setValue({ ...value, moduleId: e.target.value }, { step: true })}
            className="min-w-0 flex-1 rounded-lg border border-border bg-canvas px-2 py-1 text-sm text-ink"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <button
        type="button"
        onClick={() => setValue({ ...value, isFreePreview: !value.isFreePreview })}
        aria-pressed={value.isFreePreview}
        className={`flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
          value.isFreePreview ? "border-cta bg-cta text-white" : "border-border bg-surface text-ink-muted"
        }`}
      >
        <Eye size={12} />
        Free preview
      </button>

      {missing && value.title.trim() === "" ? null : missing ? <p className="text-xs text-ink-muted">{missing}</p> : null}

      <div className="mt-0.5">
        <EditorToolbar
          onUndo={history.undo}
          onRedo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onSave={submit}
          saving={pending}
          dirty={history.isDirty || isNew || video.videoPath !== savedPath || video.mediaUrl !== initialVideo.mediaUrl}
          canSave={!missing}
          saveLabel={submitLabel}
          onCancel={cancel}
        />
      </div>
    </form>
  );
}

export { EMPTY_VIDEO };
