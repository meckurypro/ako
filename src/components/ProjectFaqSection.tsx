// src/components/ProjectFaqSection.tsx
import { useState } from "react";
import { ChevronDown, Plus, Pencil, Trash2, Sparkles, Loader2, Check, X } from "lucide-react";
import {
  useProjectFaqs,
  useScaffoldProjectFaqs,
  useAddProjectFaq,
  useUpdateProjectFaq,
  useDeleteProjectFaq,
  projectTypeSupportsFaq,
  type ProjectFaq,
} from "../hooks/useProjectFaqs";

function FaqAccordionItem({ faq }: { faq: ProjectFaq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-ink">{faq.question}</span>
        <ChevronDown size={16} className={`text-ink-muted flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="px-4 pb-3.5 text-sm text-ink-muted whitespace-pre-wrap">{faq.answer}</p>}
    </div>
  );
}

function FaqEditRow({
  faq,
  onSave,
  onDelete,
  saving,
  deleting,
}: {
  faq: ProjectFaq;
  onSave: (question: string, answer: string) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);

  if (!editing) {
    return (
      <div className="border border-border rounded-xl p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-ink">{faq.question}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setEditing(true)} className="text-ink-muted p-1" aria-label="Edit">
              <Pencil size={14} />
            </button>
            <button onClick={onDelete} disabled={deleting} className="text-danger p-1" aria-label="Delete">
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        </div>
        <p className="text-sm text-ink-muted mt-1 whitespace-pre-wrap">{faq.answer}</p>
      </div>
    );
  }

  return (
    <div className="border border-accent rounded-xl p-3.5 space-y-2">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
        placeholder="Question"
        className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm font-medium"
      />
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value.slice(0, 1000))}
        placeholder="Answer"
        rows={3}
        className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            setQuestion(faq.question);
            setAnswer(faq.answer);
            setEditing(false);
          }}
          className="text-ink-muted p-1.5"
          aria-label="Cancel"
        >
          <X size={16} />
        </button>
        <button
          onClick={() => {
            if (!question.trim() || !answer.trim()) return;
            onSave(question, answer);
            setEditing(false);
          }}
          disabled={saving}
          className="text-accent p-1.5"
          aria-label="Save"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        </button>
      </div>
    </div>
  );
}

export function ProjectFaqSection({
  projectId,
  projectType,
  isOwner,
}: {
  projectId: string;
  projectType: string;
  isOwner: boolean;
}) {
  const { data: faqs } = useProjectFaqs(projectId);
  const scaffold = useScaffoldProjectFaqs(projectId);
  const addFaq = useAddProjectFaq(projectId);
  const updateFaq = useUpdateProjectFaq(projectId);
  const deleteFaq = useDeleteProjectFaq(projectId);

  const [adding, setAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Not every project type gets an FAQ section — media/room/url
  // projects rarely have recurring questions worth a dedicated block.
  // A non-eligible type with zero FAQs (the common case) renders
  // nothing at all; one that somehow already has entries still shows
  // them, just without the "eligible" affordances (scaffold, add).
  const eligible = projectTypeSupportsFaq(projectType);
  if (!eligible && (!faqs || faqs.length === 0)) return null;

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteFaq.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base text-ink">FAQ</h3>
        {isOwner && eligible && (
          <div className="flex items-center gap-3">
            {(faqs?.length ?? 0) === 0 && (
              <button
                onClick={() => scaffold.mutate()}
                disabled={scaffold.isPending}
                className="flex items-center gap-1 text-sm text-accent font-medium disabled:opacity-50"
              >
                {scaffold.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Use starter questions
              </button>
            )}
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 text-sm text-accent font-medium"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        )}
      </div>

      {!faqs || faqs.length === 0 ? (
        isOwner ? (
          <p className="text-sm text-ink-muted">
            No FAQ yet — add your own, or use the starter questions above to get going quickly.
          </p>
        ) : null
      ) : (
        <div className="space-y-2">
          {faqs.map((faq) =>
            isOwner ? (
              <FaqEditRow
                key={faq.id}
                faq={faq}
                onSave={(question, answer) => updateFaq.mutate({ id: faq.id, question, answer })}
                onDelete={() => void handleDelete(faq.id)}
                saving={updateFaq.isPending}
                deleting={deletingId === faq.id}
              />
            ) : (
              <FaqAccordionItem key={faq.id} faq={faq} />
            )
          )}
        </div>
      )}

      {isOwner && adding && (
        <div className="border border-accent rounded-xl p-3.5 space-y-2 mt-2">
          <input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value.slice(0, 200))}
            placeholder="Question"
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm font-medium"
          />
          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value.slice(0, 1000))}
            placeholder="Answer"
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-ink text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setAdding(false);
                setNewQuestion("");
                setNewAnswer("");
              }}
              className="text-ink-muted p-1.5"
              aria-label="Cancel"
            >
              <X size={16} />
            </button>
            <button
              onClick={async () => {
                if (!newQuestion.trim() || !newAnswer.trim()) return;
                await addFaq.mutateAsync({ question: newQuestion, answer: newAnswer });
                setAdding(false);
                setNewQuestion("");
                setNewAnswer("");
              }}
              disabled={addFaq.isPending}
              className="text-accent p-1.5"
              aria-label="Save"
            >
              {addFaq.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
