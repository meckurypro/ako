// src/components/course/CourseSetupWizard.tsx
// Three short steps for a new course: basics, goals, sections. Opened automatically for an empty draft, and from
// "Course details" later (without the sections step).
import { useState } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useBackDismiss } from "../../hooks/useBackDismiss";
import { useToast } from "../Toast";
import {
  useAddModule,
  useSaveCourseDetails,
  type CourseDetails,
} from "../../hooks/useCourseBuilder";
import { COURSE_LEVELS, MAX_OBJECTIVES, MIN_OBJECTIVES } from "../../lib/courseTypes";
import { removeCourseVideos } from "../../lib/courseVideo";
import { LessonVideoField, type VideoValue } from "./LessonVideoField";
import { friendlyError } from "../../lib/friendlyError";

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm text-ink";

function ListField({
  label,
  hint,
  values,
  onChange,
  placeholders,
  min = 1,
  max = 8,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholders: string[];
  min?: number;
  max?: number;
}) {
  const rows = values.length >= min ? values : [...values, ...Array(min - values.length).fill("")];
  return (
    <div className="mb-5">
      {label && <p className="text-sm font-semibold text-ink">{label}</p>}
      {hint && <p className="mb-2 text-xs text-ink-muted">{hint}</p>}
      <div className={`flex flex-col gap-2 ${hint ? "" : label ? "mt-2" : ""}`}>
        {rows.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={v}
              onChange={(e) => onChange(rows.map((x, xi) => (xi === i ? e.target.value : x)))}
              placeholder={placeholders[i % placeholders.length]}
              maxLength={160}
              className={inputCls}
            />
            {rows.length > min && (
              <button type="button" onClick={() => onChange(rows.filter((_, xi) => xi !== i))} aria-label="Remove" className="flex-shrink-0 text-ink-muted">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {rows.length < max && (
        <button type="button" onClick={() => onChange([...rows, ""])} className="mt-2 flex items-center gap-1 text-xs font-medium text-accent">
          <Plus size={12} /> Add another
        </button>
      )}
    </div>
  );
}

export function CourseSetupWizard({
  projectId,
  details,
  existingSections,
  includeSections,
  onClose,
}: {
  projectId: string;
  details: CourseDetails | null | undefined;
  existingSections: number;
  includeSections: boolean;
  onClose: () => void;
}) {
  const [promo, setPromo] = useState<VideoValue>({
    videoPath: details?.promo_video_path ?? null,
    videoWidth: details?.promo_width ?? null,
    videoHeight: details?.promo_height ?? null,
    videoDuration: details?.promo_duration ?? null,
    mediaUrl: details?.promo_url ?? "",
  });
  const [promoBusy, setPromoBusy] = useState(false);
  const savedPromoPath = details?.promo_video_path ?? null;
  // Closing without saving throws away a promo uploaded in this session.
  const close = (saved = false) => {
    if (!saved && promo.videoPath && promo.videoPath !== savedPromoPath) void removeCourseVideos([promo.videoPath]);
    onClose();
  };
  useBackDismiss(() => close());
  const toast = useToast();
  const saveDetails = useSaveCourseDetails(projectId);
  const addModule = useAddModule(projectId);

  const [step, setStep] = useState(0);
  const [subtitle, setSubtitle] = useState(details?.subtitle ?? "");
  const [level, setLevel] = useState<CourseDetails["level"]>(details?.level ?? "all");
  const [language, setLanguage] = useState(details?.language ?? "English");
  const [objectives, setObjectives] = useState<string[]>(details?.objectives ?? []);
  const [requirements, setRequirements] = useState<string[]>(details?.requirements ?? []);
  const [audience, setAudience] = useState<string[]>(details?.audience ?? []);
  const [sections, setSections] = useState<string[]>(["", ""]);
  const [saving, setSaving] = useState(false);

  const steps = includeSections ? ["Basics", "Goals", "Sections"] : ["Basics", "Goals"];
  const last = step === steps.length - 1;
  const objectiveCount = objectives.filter((o) => o.trim()).length;
  const canNext = step === 1 ? objectiveCount >= MIN_OBJECTIVES : true;

  async function finish() {
    setSaving(true);
    try {
      await saveDetails.mutateAsync({
        subtitle,
        level,
        language,
        objectives,
        requirements,
        audience,
        promo_video_path: promo.videoPath,
        promo_url: promo.mediaUrl,
        promo_width: promo.videoWidth,
        promo_height: promo.videoHeight,
        promo_duration: promo.videoDuration,
        previousPromoPath: savedPromoPath,
      });
      if (includeSections) {
        const titles = sections.map((s) => s.trim()).filter(Boolean);
        for (let i = 0; i < titles.length; i++) {
          await addModule.mutateAsync({ title: titles[i], sortOrder: existingSections + i });
        }
      }
      close(true);
    } catch (err) {
      toast(friendlyError(err, "Couldn't save."), { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-canvas">
      <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 pb-2 pt-4">
        <button onClick={() => (step === 0 ? close() : setStep(step - 1))} aria-label={step === 0 ? "Close" : "Back"} className="text-ink-muted">
          {step === 0 ? <X size={22} /> : <ArrowLeft size={22} />}
        </button>
        <div className="flex flex-1 gap-1.5">
          {steps.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-border"}`} />
          ))}
        </div>
        <span className="text-xs font-medium text-ink-muted">
          {step + 1}/{steps.length}
        </span>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 pb-6 pt-3">
        <h2 className="mb-4 font-display text-2xl text-ink">{steps[step]}</h2>

        {step === 0 && (
          <>
            <label className="mb-1 block text-sm font-semibold text-ink">Subtitle</label>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={120} placeholder="One line on what this course gets people to" className={`${inputCls} mb-5`} />
            <label className="mb-1 block text-sm font-semibold text-ink">Level</label>
            <div className="mb-5 flex flex-wrap gap-2">
              {COURSE_LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevel(l.value)}
                  aria-pressed={level === l.value}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${level === l.value ? "border-accent bg-accent text-canvas" : "border-border bg-surface text-ink-muted"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <label className="mb-1 block text-sm font-semibold text-ink">Language</label>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} maxLength={40} className={`${inputCls} mb-5`} />
            <label className="mb-0.5 block text-sm font-semibold text-ink">Promo video</label>
            <p className="mb-2 text-xs text-ink-muted">Optional. Under 2 minutes: what they'll get, and why you.</p>
            <LessonVideoField projectId={projectId} value={promo} savedPath={savedPromoPath} onChange={setPromo} onBusyChange={setPromoBusy} />
            {promo.videoDuration && promo.videoDuration > 180 ? (
              <p className="mt-1.5 text-xs text-ink-muted">Promos over 2–3 minutes lose viewers. Consider trimming it.</p>
            ) : null}
          </>
        )}

        {step === 1 && (
          <>
            <ListField
              label="What will learners be able to do?"
              hint={`At least ${MIN_OBJECTIVES}, up to ${MAX_OBJECTIVES}. Start each with a verb.`}
              values={objectives}
              onChange={setObjectives}
              placeholders={["Build a landing page from scratch", "Price your work with confidence", "Present to a client without notes"]}
              min={MIN_OBJECTIVES}
              max={MAX_OBJECTIVES}
            />
            <ListField label="Anything they need first?" values={requirements} onChange={setRequirements} placeholders={["A laptop", "Basic Excel"]} min={1} max={6} />
            <ListField label="Who is it for?" values={audience} onChange={setAudience} placeholders={["Freelancers starting out", "Students"]} min={1} max={6} />
          </>
        )}

        {step === 2 && (
          <>
            <p className="mb-3 text-sm text-ink-muted">Name your sections. You'll add lessons, videos and quizzes to each next.</p>
            <ListField label="" values={sections} onChange={setSections} placeholders={["Getting started", "The core skills", "Putting it together"]} min={1} max={12} />
          </>
        )}
      </div>

      <div className="mx-auto w-full max-w-md px-4 pb-5 pt-2" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        {step === 1 && !canNext && (
          <p className="mb-2 text-center text-xs text-ink-muted">
            {MIN_OBJECTIVES - objectiveCount} more to go.
          </p>
        )}
        <button
          onClick={() => (last ? void finish() : setStep(step + 1))}
          disabled={!canNext || saving || promoBusy}
          className="h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-canvas disabled:opacity-40"
        >
          {saving ? "Saving…" : last ? (includeSections ? "Start building" : "Save") : "Next"}
        </button>
        {step === 0 && (
          <button onClick={() => setStep(1)} className="mt-2 w-full text-center text-sm text-ink-muted">
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
