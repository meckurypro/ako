// src/components/project-types/GigFields.tsx
import { ImageIcon, Check, Plus, X } from "lucide-react";
import { FormField } from "../FormField";
import { useAuth } from "../../hooks/useAuth";
import { useUserProjects, PROJECT_TYPE_LABELS } from "../../hooks/useProjects";
import type { GigFaqItem } from "../../hooks/useProjectTypeDetails";

export interface GigFieldsValue {
  tagline: string;
  delivery_estimate: string;
  sample_project_ids: string[];
  revisions_included: string; // "" = unspecified, kept as text for the input
  deliverables: string[];
  faq: GigFaqItem[];
}

export const EMPTY_GIG_FIELDS: GigFieldsValue = {
  tagline: "",
  delivery_estimate: "",
  sample_project_ids: [],
  revisions_included: "",
  deliverables: [],
  faq: [],
};

export const MAX_GIG_SAMPLES = 6;

interface GigFieldsProps {
  value: GigFieldsValue;
  onChange: (value: GigFieldsValue) => void;
  // When editing an existing gig, exclude it from its own sample
  // picker — a gig can't showcase itself.
  excludeProjectId?: string;
}

// Grounded in what Fiverr's own seller guidance calls out as the
// difference between a gig that converts and one that doesn't: a
// clear list of what's actually delivered, the number of revisions
// included, and an FAQ that heads off the questions buyers would
// otherwise have to DM to ask. All optional — a bare tagline still
// works, same as before — but each one a host fills in removes a
// reason to bounce before messaging.
export function GigFields({ value, onChange, excludeProjectId }: GigFieldsProps) {
  const { user } = useAuth();
  const { data: ownProjects } = useUserProjects(user?.id ?? "", true);
  const candidates = (ownProjects ?? []).filter(
    (p) => p.project_type !== "gig" && p.id !== excludeProjectId
  );

  function toggleSample(id: string) {
    const isSelected = value.sample_project_ids.includes(id);
    if (isSelected) {
      onChange({ ...value, sample_project_ids: value.sample_project_ids.filter((s) => s !== id) });
    } else {
      if (value.sample_project_ids.length >= MAX_GIG_SAMPLES) return;
      onChange({ ...value, sample_project_ids: [...value.sample_project_ids, id] });
    }
  }

  function updateDeliverable(index: number, text: string) {
    const next = [...value.deliverables];
    next[index] = text;
    onChange({ ...value, deliverables: next });
  }

  function removeDeliverable(index: number) {
    onChange({ ...value, deliverables: value.deliverables.filter((_, i) => i !== index) });
  }

  function updateFaq(index: number, field: keyof GigFaqItem, text: string) {
    const next = value.faq.map((item, i) => (i === index ? { ...item, [field]: text } : item));
    onChange({ ...value, faq: next });
  }

  function removeFaq(index: number) {
    onChange({ ...value, faq: value.faq.filter((_, i) => i !== index) });
  }

  return (
    <div className="mb-4">
      <FormField
        id="gig_tagline"
        label="Tagline"
        value={value.tagline}
        onChange={(e) => onChange({ ...value, tagline: e.target.value })}
        placeholder="e.g. Voice-over & audio production"
        maxLength={100}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <FormField
            id="gig_delivery_estimate"
            label="Delivery estimate (optional)"
            value={value.delivery_estimate}
            onChange={(e) => onChange({ ...value, delivery_estimate: e.target.value })}
            placeholder="e.g. 3–5 business days"
            maxLength={60}
          />
        </div>
        <div className="w-32">
          <FormField
            id="gig_revisions"
            label="Revisions"
            type="number"
            min={0}
            value={value.revisions_included}
            onChange={(e) => onChange({ ...value, revisions_included: e.target.value })}
            placeholder="e.g. 2"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-muted mb-1.5">
          What's included <span className="font-normal">(optional)</span>
        </label>
        <div className="flex flex-col gap-2">
          {value.deliverables.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={item}
                onChange={(e) => updateDeliverable(i, e.target.value)}
                placeholder="e.g. 2 revisions, source files included"
                maxLength={120}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink"
              />
              <button type="button" onClick={() => removeDeliverable(i)} className="text-ink-muted">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...value, deliverables: [...value.deliverables, ""] })}
          className="flex items-center gap-1 text-xs text-accent font-medium mt-2"
        >
          <Plus size={12} /> Add item
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-muted mb-1.5">
          FAQ <span className="font-normal">(optional — head off the questions before they're asked)</span>
        </label>
        <div className="flex flex-col gap-2">
          {value.faq.map((item, i) => (
            <div key={i} className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-border bg-canvas">
              <div className="flex items-center gap-2">
                <input
                  value={item.question}
                  onChange={(e) => updateFaq(i, "question", e.target.value)}
                  placeholder="Question"
                  maxLength={120}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-sm text-ink"
                />
                <button type="button" onClick={() => removeFaq(i)} className="text-ink-muted">
                  <X size={15} />
                </button>
              </div>
              <textarea
                value={item.answer}
                onChange={(e) => updateFaq(i, "answer", e.target.value)}
                placeholder="Answer"
                rows={2}
                maxLength={400}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-surface text-sm text-ink resize-none"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...value, faq: [...value.faq, { question: "", answer: "" }] })}
          className="flex items-center gap-1 text-xs text-accent font-medium mt-2"
        >
          <Plus size={12} /> Add question
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-muted mb-1.5">
          Work samples <span className="font-normal">(optional, up to {MAX_GIG_SAMPLES})</span>
        </label>
        {candidates.length === 0 ? (
          <p className="text-xs text-ink-muted px-4 py-3 rounded-xl border border-border bg-surface">
            You don't have any other projects yet to show as samples. You can add these later from Edit.
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {candidates.map((p) => {
              const selected = value.sample_project_ids.includes(p.id);
              const atCap = !selected && value.sample_project_ids.length >= MAX_GIG_SAMPLES;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleSample(p.id)}
                  disabled={atCap}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-colors disabled:opacity-40 ${
                    selected ? "border-accent bg-accent-soft" : "border-border bg-canvas"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center overflow-hidden shrink-0">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={16} className="text-ink-muted" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate">{p.title}</p>
                    <p className="text-xs text-ink-muted">{PROJECT_TYPE_LABELS[p.project_type]}</p>
                  </div>
                  {selected && <Check size={16} className="text-accent shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-ink-muted mt-1.5">
          Pick from your own projects to show as proof of work on this gig.
        </p>
      </div>
    </div>
  );
}
