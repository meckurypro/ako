// src/components/music/ContributorPicker.tsx
//
// "Tag contributors" step of Publish Music to Akọ (see
// done/AKO_MUSIC_CATALOGUE_AND_CREATOR_DISCOVERY_SYSTEM.md §5).
// Contributors must point to real Akọ accounts — reuses the existing
// PeoplePicker (same "who do you mean" search as @mentions/tagging)
// rather than a separate free-text field, then layers role + split
// assignment on top of the selection.
//
// Splits are ONLY meaningful for paid usage — free usage never
// creates royalties, so the split inputs are hidden entirely when
// usage_mode is 'free' (still sent as 0 to the API either way; the
// server ignores them for free usage and validates the 100% total
// itself for paid usage regardless of what's shown here).

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { PeoplePicker } from "../PeoplePicker";
import { Avatar } from "../Avatar";
import type { MentionCandidate } from "../../hooks/useMentions";
import { CONTRIBUTOR_ROLE_LABELS, CONTRIBUTOR_ROLE_OPTIONS, type ContributorDraft } from "../../types/music";

interface ContributorPickerProps {
  contributors: ContributorDraft[];
  onChange: (contributors: ContributorDraft[]) => void;
  usageMode: "free" | "paid";
}

export function ContributorPicker({ contributors, onChange, usageMode }: ContributorPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const splitTotal = contributors.reduce((sum, c) => sum + (c.split_percent || 0), 0);

  function handlePickerConfirm(selected: MentionCandidate[]) {
    // Contributors must be real accounts, not Pages — PeoplePicker can
    // surface both (same underlying @mention search).
    const people = selected.filter((s) => s.kind === "profile");
    const existingIds = new Set(contributors.map((c) => c.contributor_id));

    const added: ContributorDraft[] = people
      .filter((p) => !existingIds.has(p.id))
      .map((p) => ({
        contributor_id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        role: "other_contributor",
        split_percent: 0,
      }));

    const stillSelectedIds = new Set(people.map((p) => p.id));
    const kept = contributors.filter((c) => stillSelectedIds.has(c.contributor_id));

    onChange([...kept, ...added]);
    setPickerOpen(false);
  }

  function updateContributor(id: string, patch: Partial<ContributorDraft>) {
    onChange(contributors.map((c) => (c.contributor_id === id ? { ...c, ...patch } : c)));
  }

  function removeContributor(id: string) {
    onChange(contributors.filter((c) => c.contributor_id !== id));
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-ink-muted">Contributors</label>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1 text-xs font-medium text-accent"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {contributors.length === 0 && (
        <p className="text-xs text-ink-muted mb-2">
          Tag at least one contributor — usually yourself as Artist.
        </p>
      )}

      <div className="space-y-2">
        {contributors.map((c) => (
          <div key={c.contributor_id} className="flex items-center gap-2 p-2 rounded-xl border border-border bg-surface">
            <Avatar src={c.avatar_url} name={c.display_name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">{c.display_name}</p>
              <select
                value={c.role}
                onChange={(e) => updateContributor(c.contributor_id, { role: e.target.value as ContributorDraft["role"] })}
                className="text-xs text-ink-muted bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
              >
                {CONTRIBUTOR_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {CONTRIBUTOR_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            {usageMode === "paid" && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={c.split_percent}
                  onChange={(e) =>
                    updateContributor(c.contributor_id, { split_percent: Math.max(0, Math.min(100, Number(e.target.value))) })
                  }
                  className="w-14 text-sm text-right bg-canvas border border-border rounded-lg px-1.5 py-1 text-ink"
                />
                <span className="text-xs text-ink-muted">%</span>
              </div>
            )}

            <button onClick={() => removeContributor(c.contributor_id)} className="text-ink-muted p-1" aria-label="Remove">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {usageMode === "paid" && contributors.length > 0 && (
        <p className={`text-xs mt-2 ${splitTotal === 100 ? "text-ink-muted" : "text-danger"}`}>
          Splits total {splitTotal}% — must equal exactly 100% to publish paid usage.
        </p>
      )}

      {pickerOpen && (
        <PeoplePicker
          title="Tag contributors"
          subtitle="Contributors must be real Akọ accounts."
          confirmLabel="Add"
          initialSelected={contributors.map((c) => ({
            kind: "profile" as const,
            id: c.contributor_id,
            username: c.username,
            display_name: c.display_name,
            avatar_url: c.avatar_url,
          }))}
          onConfirm={handlePickerConfirm}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
