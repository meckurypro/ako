// src/pages/Course.tsx
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
  PlayCircle,
  FileText,
  PenLine,
  ListChecks,
  ClipboardList,
  ArrowUpDown,
  Settings2,
  Circle as CircleIcon,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProjectOwnership } from "../hooks/useProjectOwnership";
import { useRecordFreeProjectOpen } from "../hooks/useProjectAccess";
import { useProject, useHasPurchased, isProjectFree } from "../hooks/useProjects";
import { useFeedDoorway } from "../hooks/useFeedDoorway";
import { FeedDoorway } from "../components/FeedDoorway";
import { CourseHero } from "../components/course/CourseHero";
import { LessonReader } from "../components/course/LessonReader";
import { ResumePrompt } from "../components/ResumePrompt";
import { ProgressBar } from "../components/course/ProgressBar";
import { ForewordPreviewBar } from "../components/ForewordPreviewBar";
import { ForewordsSheet } from "../components/ForewordsSheet";
import { useForewordPreview, useProjectForewords } from "../hooks/useForewords";
import { useToast } from "../components/Toast";
import { useReturnAfterSave } from "../hooks/useReturnAfterSave";
import { buildReaderModel } from "../lib/lessonFormat";
import { LessonVideo } from "../components/course/LessonVideo";
import { LessonEditor, type LessonSubmit } from "../components/course/LessonEditor";
import { EMPTY_VIDEO } from "../components/course/LessonVideoField";
import { QuizPlayer } from "../components/course/QuizPlayer";
import { CourseAbout } from "../components/course/CourseAbout";
import { CourseSetupWizard } from "../components/course/CourseSetupWizard";
import { ReorderPanel } from "../components/course/ReorderPanel";
import {
  DEFAULT_PASS_MARK,
  MIN_OBJECTIVES,
  formatDuration,
  lessonMinutes,
  lessonTypeOf,
  parseQuiz,
  type LessonType,
} from "../lib/courseTypes";
import {
  useCourseModules,
  useAddModule,
  useUpdateModuleTitle,
  useDeleteModule,
  useAddLesson,
  useUpdateLesson,
  useDeleteLesson,
  usePublishCourse,
  useSaveOutline,
  useCourseDetails,
  useCourseProgress,
  useCourseResume,
  useSaveCourseResume,
  useSetLessonComplete,
  type CourseLesson,
} from "../hooks/useCourseBuilder";
import { friendlyError } from "../lib/friendlyError";

const TYPE_ICONS: Record<LessonType, typeof PlayCircle> = {
  video: PlayCircle,
  text: FileText,
  quiz: ListChecks,
  assignment: ClipboardList,
};

/** Short right-hand label in the curriculum list. */
function lessonMeta(l: CourseLesson): string {
  const type = lessonTypeOf(l);
  if (type === "video") return formatDuration(l.video_duration) || "video";
  if (type === "quiz") {
    const n = parseQuiz(l.data).questions.length;
    return `quiz · ${n} q`;
  }
  if (type === "assignment") return "task";
  return `${lessonMinutes(l)} min`;
}

/** Form value → what the hooks write. Fields that don't belong to the chosen type are cleared. */
function lessonPayload(value: LessonSubmit) {
  const type = value.lessonType;
  const isVideo = type === "video";
  return {
    title: value.title.trim(),
    content: value.content.trim() || undefined,
    isFreePreview: value.isFreePreview,
    lessonType: type,
    mediaUrl: isVideo && !value.video.videoPath ? value.video.mediaUrl.trim() || undefined : undefined,
    videoPath: isVideo ? value.video.videoPath : null,
    videoWidth: isVideo ? value.video.videoWidth : null,
    videoHeight: isVideo ? value.video.videoHeight : null,
    videoDuration: isVideo ? value.video.videoDuration : null,
    data: type === "quiz" ? value.quiz : null,
  };
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
  const ownership = useProjectOwnership();
  const isOwner = ownership.isOwner(project);
  const isCreator = !!user && project?.owner_id === user.id;
  const isFree = !!project && isProjectFree(project);
  const hasPurchasedQuery = useHasPurchased(projectId ?? "");
  // Someone invited to write a foreword may go through the whole course first, draft or paid (the database grants the
  // rows while their invite is open, and after they've written). A preview isn't enrollment: no Library entry, no
  // progress tracking.
  const foreword = useForewordPreview(projectId);
  const isPreviewer = foreword.canPreview && !isCreator;
  const hasAccess = isOwner || isFree || !!hasPurchasedQuery.data || isPreviewer;
  useRecordFreeProjectOpen(project, { isOwner: isCreator, enabled: !isPreviewer });
  const [showForewords, setShowForewords] = useState(false);
  const forewordsQuery = useProjectForewords(projectId, isOwner);
  const forewordsToReview = (forewordsQuery.data ?? []).filter((f) => f.status === "submitted").length;

  const { data: modules } = useCourseModules(projectId);
  const progressQuery = useCourseProgress(projectId, user?.id);
  const completedIds = useMemo(() => progressQuery.data ?? new Set<string>(), [progressQuery.data]);
  const setLessonComplete = useSetLessonComplete(projectId ?? "", user?.id, !isPreviewer);

  const addModule = useAddModule(projectId ?? "");
  const updateModuleTitle = useUpdateModuleTitle(projectId ?? "");
  const deleteModule = useDeleteModule(projectId ?? "");
  const addLesson = useAddLesson(projectId ?? "");
  const updateLesson = useUpdateLesson(projectId ?? "");
  const deleteLesson = useDeleteLesson(projectId ?? "");
  const saveOutline = useSaveOutline(projectId ?? "");
  const detailsQuery = useCourseDetails(projectId);
  const publishCourse = usePublishCourse(projectId ?? "");
  const returnAfterSave = useReturnAfterSave();

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");
  const [lessonDraftFor, setLessonDraftFor] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [reordering, setReordering] = useState(false);
  // "setup" = the first-run wizard (basics, goals, sections); "details" = the same first two steps, reopened later.
  const [wizard, setWizard] = useState<null | "setup" | "details">(null);
  const wizardOffered = useRef(false);

  const model = useMemo(() => buildReaderModel(modules ?? [], completedIds), [modules, completedIds]);
  const { flat: flatLessons, total: totalLessons, done: completedCount, pct: progressPct, allDone: allComplete } = model;
  const toast = useToast();
  const details = detailsQuery.data;
  const editableSections = (modules ?? []).filter((m) => !m.is_foreword_managed).map((m) => ({ id: m.id, title: m.title }));
  // "outline" = hero + module list; "lesson" = focused reader (on wide screens both show side by side).
  const [view, setView] = useState<"outline" | "lesson">("outline");
  // Milestone completion only — deliberately not wired to individual
  // lesson completion (spec: "avoid showing the invitation after
  // every lesson; prefer milestone completion over micro-completion").
  const courseDoorway = useFeedDoorway("course_complete");

  // A brand-new, empty draft opens the setup wizard once.
  useEffect(() => {
    if (wizardOffered.current || !isCreator || !project || project.published_at) return;
    if (modules === undefined || detailsQuery.isLoading) return;
    wizardOffered.current = true;
    if (!modules.some((m) => !m.is_foreword_managed) && !details) setWizard("setup");
  }, [isCreator, project, modules, detailsQuery.isLoading, details]);

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

  // Learners see the module they're up to open and the rest folded; owners keep everything open to edit.
  const collapseInit = useRef(false);
  useEffect(() => {
    if (collapseInit.current || !modules || modules.length === 0 || progressQuery.isLoading || !project) return;
    collapseInit.current = true;
    if (isOwner) return;
    const current = model.next ? model.next.module_id : modules[0].id;
    setCollapsedModules(new Set(modules.filter((m) => m.id !== current).map((m) => m.id)));
  }, [modules, progressQuery.isLoading, project, isOwner, model.next]);

  const selectedLesson = flatLessons.find((l) => l.id === selectedLessonId) ?? null;
  const canOpen = (lesson: CourseLesson) => hasAccess || lesson.is_free_preview;

  // ── Resume: where the learner stopped (lesson + how far down it / into its video) ──────────────────────────────
  const resumeQuery = useCourseResume(projectId, user?.id);
  const saveResume = useSaveCourseResume(projectId ?? "", user?.id);
  type ResumeAt = { lessonId: string; scrollFraction: number | null; mediaSeconds: number | null };
  const [resumeOffer, setResumeOffer] = useState<ResumeAt | null>(null);
  const [resumeAt, setResumeAt] = useState<ResumeAt | null>(null);
  const offerChecked = useRef(false);
  const tracking = !!user && hasAccess && !isOwner && !isPreviewer;

  // Offer to pick up where they stopped. Runs once, after access, progress and the saved position have all loaded.
  useEffect(() => {
    if (offerChecked.current || !tracking || flatLessons.length === 0) return;
    if (progressQuery.isLoading || resumeQuery.isLoading) return;
    offerChecked.current = true;
    const saved = resumeQuery.data;
    const lesson = saved?.lesson_id ? flatLessons.find((l) => l.id === saved.lesson_id) : undefined;
    if (!saved || !lesson) return;
    const fraction = saved.scroll_fraction ?? 0;
    const seconds = saved.media_seconds ?? 0;
    const startedInside = fraction >= 0.02 || seconds >= 5;
    // Nothing to return to: still at the very start of the first lesson, or a finished lesson left at its top.
    if (!startedInside && (lesson.id === flatLessons[0].id || completedIds.has(lesson.id))) return;
    setResumeOffer({ lessonId: lesson.id, scrollFraction: fraction, mediaSeconds: seconds });
  }, [tracking, flatLessons, progressQuery.isLoading, resumeQuery.isLoading, resumeQuery.data, completedIds]);

  // Position tracking. The lesson scrolls with the page, so progress is measured against the reader pane.
  const paneRef = useRef<HTMLDivElement>(null);
  const pendingFraction = useRef<number | null>(null);
  const fractionRef = useRef(0);
  const mediaRef = useRef<number | null>(null);
  const unsaved = useRef<{ lessonId: string; scrollFraction: number; mediaSeconds: number | null } | null>(null);
  const saveTimer = useRef<number | null>(null);
  const saveResumeMutate = saveResume.mutate;
  const flushPosition = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const pending = unsaved.current;
    unsaved.current = null;
    if (pending) saveResumeMutate(pending);
  }, [saveResumeMutate]);
  const queuePosition = useCallback(
    (lessonId: string) => {
      unsaved.current = { lessonId, scrollFraction: fractionRef.current, mediaSeconds: mediaRef.current };
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(flushPosition, 1200);
    },
    [flushPosition]
  );
  const paneFraction = useCallback(() => {
    const pane = paneRef.current;
    if (!pane) return null;
    const rect = pane.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    return { rect, total, fraction: total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0 };
  }, []);

  const lessonOpenId = view === "lesson" || (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) ? selectedLessonId : null;
  useEffect(() => {
    if (!tracking || !lessonOpenId) return;
    const lessonId = lessonOpenId;
    // Start from the resume point for this lesson (or the top), and jump to it once the lesson has laid out.
    const at = resumeAt && resumeAt.lessonId === lessonId ? resumeAt : null;
    fractionRef.current = at?.scrollFraction ?? 0;
    mediaRef.current = at?.mediaSeconds ?? null;
    pendingFraction.current = at?.scrollFraction != null && at.scrollFraction > 0.01 ? at.scrollFraction : null;
    const timers: number[] = [];
    if (pendingFraction.current != null) {
      const apply = () => {
        const m = paneFraction();
        const f = pendingFraction.current;
        if (!m || f == null || m.total <= 0) return;
        window.scrollTo({ top: window.scrollY + m.rect.top + f * m.total });
      };
      [0, 80, 250, 600].forEach((ms) => timers.push(window.setTimeout(apply, ms)));
      timers.push(window.setTimeout(() => (pendingFraction.current = null), 800));
    }
    const onScroll = () => {
      if (pendingFraction.current != null) return; // the page is still being moved to the saved spot
      const m = paneFraction();
      if (!m) return;
      fractionRef.current = m.fraction;
      queuePosition(lessonId);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flushPosition();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushPosition);
    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushPosition);
      flushPosition(); // leaving this lesson / the course: send the last position now, don't drop it
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking, lessonOpenId, resumeAt]);
  const handleMediaTime = useCallback(
    (seconds: number) => {
      mediaRef.current = seconds;
      if (lessonOpenId) queuePosition(lessonOpenId);
    },
    [lessonOpenId, queuePosition]
  );
  const selectedIndex = selectedLesson ? flatLessons.findIndex((l) => l.id === selectedLesson.id) : -1;
  const prevLesson = selectedIndex > 0 ? flatLessons[selectedIndex - 1] : null;
  const nextLesson = selectedIndex >= 0 && selectedIndex < flatLessons.length - 1 ? flatLessons[selectedIndex + 1] : null;

  // Lessons complete when the learner clicks "Complete & continue" (or, for video files, when playback ends).

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
    setResumeAt(null); // a lesson picked by hand opens at its top
    setSelectedLessonId(lesson.id);
    setView("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });
    // This lesson is now the place to come back to, even if they leave before scrolling.
    if (tracking) saveResume.mutate({ lessonId: lesson.id, scrollFraction: 0, mediaSeconds: 0 });
  }

  function continueFromResume() {
    if (!resumeOffer) return;
    setResumeAt(resumeOffer);
    setSelectedLessonId(resumeOffer.lessonId);
    setView("lesson");
    setResumeOffer(null);
  }

  function startCourseOver() {
    setResumeOffer(null);
    // Back to the first lesson. Completed lessons keep their ticks — this only moves the reading position.
    if (flatLessons[0]) selectLesson(flatLessons[0]);
  }

  function resume() {
    const target = model.next ?? flatLessons[0];
    if (target) selectLesson(target);
  }

  async function handlePublishCourse() {
    try {
      await publishCourse.mutateAsync();
    } catch (err) {
      toast(friendlyError(err, "Couldn't publish this course."), { variant: "error" });
      return;
    }
    toast("Course published.", { variant: "success" });
    // Back to wherever the course was opened from, refreshed.
    await returnAfterSave({ fallback: `/projects/${projectId}` });
  }

  function completeAndContinue() {
    if (!selectedLesson) return;
    const goNext = () => {
      if (nextLesson && canOpen(nextLesson)) selectLesson(nextLesson);
      else {
        setView("outline");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    if (!hasAccess) {
      if (nextLesson && canOpen(nextLesson)) selectLesson(nextLesson);
      else navigate(`/projects/${projectId}`);
      return;
    }
    if (completedIds.has(selectedLesson.id)) {
      goNext();
      return;
    }
    const mods = modules ?? [];
    const mod = mods.find((m) => m.id === selectedLesson.module_id);
    const moduleDone = !!mod && mod.lessons.every((l) => l.id === selectedLesson.id || completedIds.has(l.id));
    const courseDone = completedCount + 1 === totalLessons;
    const moduleNumber = mods.findIndex((m) => m.id === selectedLesson.module_id) + 1;
    setLessonComplete.mutate(
      { lessonId: selectedLesson.id, completed: true },
      {
        onSuccess: () => {
          if (courseDone) {
            toast("You finished the course. Well done!", { variant: "success" });
            setView("outline");
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            if (moduleDone) toast(`Module ${moduleNumber} complete`, { variant: "success" });
            goNext();
          }
        },
      }
    );
  }

  // The locked Foreword module sits in front of the course but isn't one of its numbered modules.
  const moduleNumberOf = (moduleId: string): number | null => {
    let n = 0;
    for (const m of modules ?? []) {
      if (m.is_foreword_managed) {
        if (m.id === moduleId) return null;
        continue;
      }
      n += 1;
      if (m.id === moduleId) return n;
    }
    return null;
  };
  const lessonNumberOf = (lesson: CourseLesson) => {
    const mods = modules ?? [];
    const n = moduleNumberOf(lesson.module_id);
    if (n === null) return "";
    const mod = mods.find((m) => m.id === lesson.module_id);
    const li = mod ? mod.lessons.findIndex((l) => l.id === lesson.id) : 0;
    return `${n}.${li + 1}`;
  };

  const objectivesOk = (details?.objectives.length ?? 0) >= MIN_OBJECTIVES;
  const lessonsOk = totalLessons > 0;
  const descriptionOk = !!project?.description?.trim();
  const publishReady = objectivesOk && lessonsOk && descriptionOk;
  const checklist = [
    { done: objectivesOk, label: `Learning objectives (${MIN_OBJECTIVES}+)`, action: isCreator ? () => setWizard("details") : undefined },
    { done: lessonsOk, label: "At least one lesson", action: undefined },
    { done: descriptionOk, label: "Course description", action: isCreator ? () => navigate(`/projects/${projectId}/edit`) : undefined },
    { done: !!project?.thumbnail_url, label: "Cover image", optional: true, action: isCreator ? () => navigate(`/projects/${projectId}/edit`) : undefined },
  ];

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md lg:max-w-6xl mx-auto">
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
                onClick={handlePublishCourse}
                disabled={publishCourse.isPending || !publishReady}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-accent text-canvas disabled:opacity-50"
              >
                {publishCourse.isPending ? "Publishing…" : "Publish"}
              </button>
            )}
          </div>
        )}

        {isOwner && isCreator && (
          <button
            onClick={() => setShowForewords(true)}
            className="w-full flex items-center justify-center gap-1.5 mb-4 py-2.5 rounded-xl border border-border text-sm text-ink font-medium"
          >
            <PenLine size={15} />
            Forewords
            {forewordsToReview > 0 && (
              <span className="ml-1 min-w-5 h-5 px-1.5 rounded-full bg-accent text-canvas text-[11px] flex items-center justify-center">
                {forewordsToReview}
              </span>
            )}
          </button>
        )}

        {isOwner && !project.published_at && (
          <div className="mb-4 rounded-xl border border-border bg-surface p-3">
            <p className="mb-2 text-sm font-semibold text-ink">Before you publish</p>
            <ul className="flex flex-col gap-1.5">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-sm">
                  {c.done ? <CheckCircle2 size={16} className="flex-shrink-0 text-accent" /> : <CircleIcon size={16} className="flex-shrink-0 text-ink-muted" />}
                  <span className={c.done ? "text-ink-muted line-through decoration-border" : "text-ink"}>
                    {c.label}
                    {c.optional && !c.done ? <span className="text-ink-muted"> · optional</span> : null}
                  </span>
                  {!c.done && c.action && (
                    <button onClick={c.action} className="ml-auto text-xs font-medium text-accent">
                      Add
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isCreator && !reordering && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setWizard("details")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-medium text-ink"
            >
              <Settings2 size={15} /> Course details
            </button>
            <button
              onClick={() => setReordering(true)}
              disabled={(modules ?? []).length === 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-medium text-ink disabled:opacity-40"
            >
              <ArrowUpDown size={15} /> Reorder
            </button>
          </div>
        )}

        {view === "outline" || (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) ? (
          <CourseAbout details={details} lessons={totalLessons} minutes={(modules ?? []).flatMap((m) => m.lessons).reduce((n, l) => n + lessonMinutes(l), 0)} />
        ) : null}

        {hasAccess && totalLessons > 0 && (
          <div className={view === "lesson" ? "hidden lg:block" : ""}>
            <CourseHero
              pct={progressPct}
              done={completedCount}
              total={totalLessons}
              minutesLeft={model.minutesLeft}
              nextTitle={model.next ? [lessonNumberOf(model.next), model.next.title].filter(Boolean).join("  ") : null}
              onContinue={resume}
            />
            {allComplete && courseDoorway.visible && (
              <FeedDoorway context="course_complete" onEnter={courseDoorway.markEnteredFeed} />
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

        <div className="lg:grid lg:grid-cols-[minmax(300px,390px)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className={`${view === "lesson" ? "hidden lg:block" : ""} lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1`}>
        {/* Curriculum outline — always visible so a prospective buyer
            can see what's inside, same as a Udemy course landing page;
            locked rows just can't be opened. */}
        {reordering ? (
          <ReorderPanel
            modules={modules ?? []}
            saving={saveOutline.isPending}
            onCancel={() => setReordering(false)}
            onSave={async (draft) => {
              try {
                await saveOutline.mutateAsync({ draft, current: modules ?? [] });
                setReordering(false);
              } catch (err) {
                toast(friendlyError(err, "Couldn't save the new order."), { variant: "error" });
              }
            }}
          />
        ) : (
        <div className="flex flex-col gap-3">
          {(modules ?? []).map((m) => {
            const collapsed = collapsedModules.has(m.id);
            const prog = model.perModule.get(m.id);
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
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10.5px] font-bold uppercase tracking-[0.09em] text-ink-muted">
                          {m.is_foreword_managed ? "Foreword" : `Module ${moduleNumberOf(m.id)}`}
                        </span>
                        <span className="block text-[15px] font-semibold leading-5 text-ink">{m.title}</span>
                      </span>
                      {hasAccess && prog?.complete ? (
                        <CheckCircle2 size={16} className="text-accent flex-shrink-0" />
                      ) : hasAccess && prog ? (
                        <span className="text-xs text-ink-muted flex-shrink-0">
                          {prog.done}/{prog.total}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-muted flex-shrink-0">({m.lessons.length})</span>
                      )}
                    </button>
                  )}

                  {isOwner && editingModuleId !== m.id && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {m.is_foreword_managed ? (
                        <button onClick={() => setShowForewords(true)} className="text-xs font-medium text-accent">
                          Manage
                        </button>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  )}
                </div>

                {hasAccess && prog && prog.total > 0 && (
                  <div className="mb-2 mt-1">
                    <ProgressBar pct={Math.round((prog.done / prog.total) * 100)} height={4} />
                  </div>
                )}

                {!collapsed && (
                  <div className="flex flex-col gap-1 mb-2">
                    {m.lessons.map((l, lessonIdx) => {
                      const locked = !canOpen(l);
                      const complete = completedIds.has(l.id);
                      const isSelected = selectedLessonId === l.id;
                      return (
                        <div key={l.id}>
                          {editingLessonId === l.id ? (
                            <LessonEditor
                              projectId={projectId ?? ""}
                              isNew={false}
                              initial={{
                                lessonType: lessonTypeOf(l),
                                title: l.title,
                                content: l.content ?? "",
                                quiz: parseQuiz(l.data),
                                isFreePreview: l.is_free_preview,
                                moduleId: m.id,
                              }}
                              initialVideo={{
                                videoPath: l.video_path,
                                videoWidth: l.video_width,
                                videoHeight: l.video_height,
                                videoDuration: l.video_duration,
                                mediaUrl: l.media_url ?? "",
                              }}
                              sections={editableSections}
                              submitLabel="Save lesson"
                              pending={updateLesson.isPending}
                              onCancel={() => setEditingLessonId(null)}
                              onSubmit={async (value) => {
                                await updateLesson.mutateAsync({
                                  lessonId: l.id,
                                  ...lessonPayload(value),
                                  previousVideoPath: l.video_path,
                                  ...(value.moduleId !== m.id
                                    ? { moduleId: value.moduleId, sortOrder: (modules ?? []).find((x) => x.id === value.moduleId)?.lessons.length ?? 0 }
                                    : {}),
                                });
                                setEditingLessonId(null);
                              }}
                            />
                          ) : (
                            <div
                              className={`flex items-center gap-2 pl-2.5 py-2.5 rounded-lg border-l-2 ${
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
                                {(() => {
                                  const Icon = TYPE_ICONS[lessonTypeOf(l)];
                                  return <Icon size={13} className="text-ink-muted flex-shrink-0" />;
                                })()}
                                <span className={`text-sm truncate ${locked ? "text-ink-muted" : "text-ink"}`}>
                                  {m.is_foreword_managed ? "" : `${moduleNumberOf(m.id)}.${lessonIdx + 1}\u00A0\u00A0`}{l.title}
                                </span>
                                <span className="text-[11px] text-ink-muted flex-shrink-0">{lessonMeta(l)}</span>
                                {!hasAccess && l.is_free_preview && (
                                  <span className="text-[11px] text-accent font-medium flex-shrink-0">Preview</span>
                                )}
                              </button>
                              {isOwner && !m.is_foreword_managed && (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button onClick={() => setEditingLessonId(l.id)} className="text-ink-muted">
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Delete "${l.title}"?${l.video_path ? " Its uploaded video is deleted too." : ""}`)) deleteLesson.mutate(l.id);
                                    }}
                                    className="text-danger"
                                    aria-label="Delete lesson"
                                  >
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

                {isOwner && !collapsed && !m.is_foreword_managed && (
                  <>
                    {lessonDraftFor === m.id ? (
                      <LessonEditor
                        projectId={projectId ?? ""}
                        isNew
                        initial={{
                          lessonType: "video",
                          title: "",
                          content: "",
                          quiz: { questions: [], pass_mark: DEFAULT_PASS_MARK },
                          isFreePreview: m.lessons.length === 0,
                          moduleId: m.id,
                        }}
                        initialVideo={EMPTY_VIDEO}
                        sections={editableSections}
                        submitLabel="Add lesson"
                        pending={addLesson.isPending}
                        onCancel={() => setLessonDraftFor(null)}
                        onSubmit={async (value) => {
                          const target = (modules ?? []).find((x) => x.id === value.moduleId) ?? m;
                          await addLesson.mutateAsync({
                            ...lessonPayload(value),
                            moduleId: target.id,
                            sortOrder: target.lessons.length,
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
        )}
          </div>

          {/* Reader pane — the lesson currently open. Only ever shows a locked lesson's content if it's
              flagged for free preview; everything else routes through canOpen(). */}
          <div ref={paneRef} className={`${view === "outline" ? "hidden lg:block" : ""} min-w-0`}>
            {selectedLesson && canOpen(selectedLesson) ? (
              <LessonReader
                lesson={selectedLesson}
                moduleNumber={moduleNumberOf(selectedLesson.module_id)}
                lessonNumber={lessonNumberOf(selectedLesson)}
                position={selectedIndex + 1}
                total={totalLessons}
                pct={progressPct}
                hasAccess={hasAccess}
                completed={completedIds.has(selectedLesson.id)}
                pending={setLessonComplete.isPending}
                hasPrev={!!prevLesson}
                hasNext={!!nextLesson}
                nextLocked={!!nextLesson && !canOpen(nextLesson)}
                media={
                  selectedLesson.video_path || selectedLesson.media_url ? (
                    <LessonVideo
                      videoPath={selectedLesson.video_path}
                      mediaUrl={selectedLesson.media_url}
                      width={selectedLesson.video_width}
                      height={selectedLesson.video_height}
                      title={selectedLesson.title}
                      startAt={resumeAt && resumeAt.lessonId === selectedLesson.id ? resumeAt.mediaSeconds : null}
                      onTime={tracking ? handleMediaTime : undefined}
                      onWatched={() => {
                        if (hasAccess) setLessonComplete.mutate({ lessonId: selectedLesson.id, completed: true });
                      }}
                    />
                  ) : null
                }
                interactive={
                  lessonTypeOf(selectedLesson) === "quiz" ? (
                    <QuizPlayer
                      key={selectedLesson.id}
                      data={selectedLesson.data}
                      completed={completedIds.has(selectedLesson.id)}
                      onPassed={() => {
                        if (hasAccess) setLessonComplete.mutate({ lessonId: selectedLesson.id, completed: true });
                      }}
                    />
                  ) : null
                }
                onOutline={() => setView("outline")}
                onPrev={() => prevLesson && selectLesson(prevLesson)}
                onPrimary={completeAndContinue}
                onToggleComplete={() =>
                  setLessonComplete.mutate({ lessonId: selectedLesson.id, completed: !completedIds.has(selectedLesson.id) })
                }
              />
            ) : (
              <div className="hidden rounded-3xl border border-dashed border-border p-10 text-center lg:block">
                <p className="font-display text-xl text-ink">Pick a lesson to begin</p>
                <p className="mt-1 text-sm text-ink-muted">Your lessons are on the left. Start anywhere, or press Continue.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {resumeOffer &&
        (() => {
          const lesson = flatLessons.find((l) => l.id === resumeOffer.lessonId);
          if (!lesson) return null;
          const idx = flatLessons.findIndex((l) => l.id === lesson.id);
          return (
            <ResumePrompt
              kind="course"
              where={lessonNumberOf(lesson) ? `lesson ${lessonNumberOf(lesson)}, “${lesson.title}”` : `“${lesson.title}”`}
              percent={totalLessons > 0 ? ((idx + (resumeOffer.scrollFraction ?? 0)) / totalLessons) * 100 : null}
              onContinue={continueFromResume}
              onStartOver={startCourseOver}
            />
          );
        })()}
      {wizard && projectId && (
        <CourseSetupWizard
          projectId={projectId}
          details={details}
          existingSections={(modules ?? []).length}
          includeSections={wizard === "setup"}
          onClose={() => setWizard(null)}
        />
      )}
      {showForewords && projectId && (
        <ForewordsSheet projectId={projectId} projectType="course" onClose={() => setShowForewords(false)} />
      )}
      {projectId && <ForewordPreviewBar projectId={projectId} isOwner={isOwner} />}
    </div>
  );
}
