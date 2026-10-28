// src/components/course/QuizPlayer.tsx
// Learner's side of a quiz lesson: answer, submit, see what was right. Passing marks the lesson complete.
import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { gradeQuiz, parseQuiz } from "../../lib/courseTypes";

export function QuizPlayer({
  data,
  completed,
  onPassed,
}: {
  data: unknown;
  /** Already passed on an earlier visit. */
  completed: boolean;
  onPassed: () => void;
}) {
  const quiz = useMemo(() => parseQuiz(data), [data]);
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [submitted, setSubmitted] = useState(false);

  if (quiz.questions.length === 0) return <p className="text-sm text-ink-muted">This quiz has no questions yet.</p>;

  const result = gradeQuiz(quiz, answers);
  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);

  function submit() {
    setSubmitted(true);
    if (gradeQuiz(quiz, answers).passed && !completed) onPassed();
  }

  return (
    <div className="mt-2 flex flex-col gap-4">
      {completed && !submitted && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-accent">
          <CheckCircle2 size={15} /> You passed this quiz. Retake it any time.
        </p>
      )}
      {quiz.questions.map((q, qi) => (
        <fieldset key={q.id} className="rounded-2xl border border-border bg-surface p-4">
          <legend className="sr-only">Question {qi + 1}</legend>
          <p className="mb-3 text-[15px] font-semibold leading-snug text-ink">
            <span className="mr-1.5 text-ink-muted">{qi + 1}.</span>
            {q.prompt}
          </p>
          <div className="flex flex-col gap-2">
            {q.options.map((o, oi) => {
              const picked = answers[q.id] === oi;
              const right = submitted && oi === q.correct;
              const wrong = submitted && picked && oi !== q.correct;
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={submitted}
                  onClick={() => setAnswers({ ...answers, [q.id]: oi })}
                  aria-pressed={picked}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    right
                      ? "border-accent bg-accent-soft text-ink"
                      : wrong
                        ? "border-danger bg-danger/10 text-ink"
                        : picked
                          ? "border-accent bg-accent-soft/60 text-ink"
                          : "border-border bg-canvas text-ink"
                  }`}
                >
                  <span
                    className={`flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-full border ${picked || right ? "border-accent" : "border-border"}`}
                    style={{ width: 18, height: 18 }}
                  >
                    {(picked || right) && <span className="block rounded-full bg-accent" style={{ width: 8, height: 8 }} />}
                  </span>
                  <span className="min-w-0 flex-1">{o}</span>
                  {right && <CheckCircle2 size={16} className="flex-shrink-0 text-accent" />}
                  {wrong && <XCircle size={16} className="flex-shrink-0 text-danger" />}
                </button>
              );
            })}
          </div>
          {submitted && q.explanation && answers[q.id] !== q.correct && <p className="mt-2.5 text-[13px] text-ink-muted">{q.explanation}</p>}
        </fieldset>
      ))}

      {submitted ? (
        <div className={`rounded-2xl p-4 ${result.passed ? "bg-accent-soft" : "bg-surface border border-border"}`}>
          <p className="font-display text-lg font-bold text-ink">
            {result.correct} of {result.total} right · {result.pct}%
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {result.passed ? "Passed." : `You need ${quiz.pass_mark}% to pass.`}
          </p>
          {!result.passed && (
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
              className="mt-3 flex items-center gap-1.5 rounded-xl bg-cta px-4 py-2 text-sm font-semibold text-white"
            >
              <RotateCcw size={14} /> Try again
            </button>
          )}
          {result.passed && completed && (
            <button
              type="button"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
              className="mt-3 text-sm font-medium text-accent"
            >
              Retake
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!allAnswered}
          className="h-12 rounded-2xl bg-cta text-[15px] font-semibold text-white disabled:opacity-40"
        >
          Submit answers
        </button>
      )}
    </div>
  );
}
