// src/components/project-types/GigFields.tsx
import { ImageIcon, Check } from "lucide-react";
import { FormField } from "../FormField";
import { useAuth } from "../../hooks/useAuth";
import { useUserProjects, PROJECT_TYPE_LABELS } from "../../hooks/useProjects";

export interface GigFieldsValue {
  tagline: string;
  delivery_estimate: string;
  sample_project_ids: string[];
}

export const EMPTY_GIG_FIELDS: GigFieldsValue = {
  tagline: "",
  delivery_estimate: "",
  sample_project_ids: [],
};

export const MAX_GIG_SAMPLES = 6;

interface GigFieldsProps {
  value: GigFieldsValue;
  onChange: (value: GigFieldsValue) => void;
  // When editing an existing gig, exclude it from its own sample
  // picker — a gig can't showcase itself.
  excludeProjectId?: string;
}

// Samples are drawn from the host's own other projects (any type —
// file, media, url, whatever already exists) rather than uploaded
// fresh here. This is proof-of-work, not new content.
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

      <FormField
        id="gig_delivery_estimate"
        label="Delivery estimate (optional)"
        value={value.delivery_estimate}
        onChange={(e) => onChange({ ...value, delivery_estimate: e.target.value })}
        placeholder="e.g. 3–5 business days"
        maxLength={60}
      />

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
