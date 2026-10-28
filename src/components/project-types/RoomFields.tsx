// src/components/project-types/RoomFields.tsx
//
// The "what kind of group is this?" part of the group creation form. A group is a community (open-ended,
// social) or a cohort (structured learning with dates). The kind is fixed once it's created, so this is the
// one place it's chosen.
import { Info } from "lucide-react";
import { FormField } from "../FormField";
import { GROUP_KIND_BLURB, GROUP_KIND_LABEL, type GroupKind } from "../../lib/groups";
import type { GroupJoinMode } from "../../hooks/useRoom";

export interface RoomFieldsValue {
  kind: GroupKind;
  join_mode: GroupJoinMode; // communities only; a cohort always has a host review requests
  start_date: string; // datetime-local string, cohorts only, optional
  end_date: string; // datetime-local string, cohorts only, optional
}

export const EMPTY_ROOM_FIELDS: RoomFieldsValue = { kind: "community", join_mode: "open", start_date: "", end_date: "" };

interface RoomFieldsProps {
  value: RoomFieldsValue;
  onChange: (value: RoomFieldsValue) => void;
  error?: string;
  // Editing an existing group: its kind is fixed, so it's shown but not changeable.
  lockKind?: boolean;
}

const KINDS: GroupKind[] = ["community", "cohort"];

export function RoomFields({ value, onChange, error, lockKind }: RoomFieldsProps) {
  return (
    <>
      {lockKind ? (
        <p className="text-sm text-ink mb-1">
          Type: <span className="font-medium">{GROUP_KIND_LABEL[value.kind]}</span>
          <span className="text-ink-muted"> — fixed once a group is created.</span>
        </p>
      ) : (
      <div className="grid grid-cols-2 gap-2 mb-2" role="radiogroup" aria-label="Group type">
        {KINDS.map((kind) => {
          const selected = value.kind === kind;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() =>
                onChange({
                  ...value,
                  kind,
                  // A cohort is always approval-based and the only kind with dates.
                  join_mode: kind === "cohort" ? "request" : value.join_mode,
                  start_date: kind === "cohort" ? value.start_date : "",
                  end_date: kind === "cohort" ? value.end_date : "",
                })
              }
              className={`px-3 py-3 rounded-xl border text-sm font-medium text-left ${
                selected ? "border-accent bg-accent-soft/60 text-ink" : "border-border bg-surface text-ink-muted"
              }`}
            >
              {GROUP_KIND_LABEL[kind]}
            </button>
          );
        })}
      </div>
      )}
      <p className="text-xs text-ink-muted mb-4">{GROUP_KIND_BLURB[value.kind]}</p>

      {value.kind === "community" && (
        <div className="mb-4">
          <p className="text-sm font-medium text-ink mb-2">Who can join?</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who can join">
            {(
              [
                ["open", "Anyone"],
                ["request", "People I approve"],
              ] as [GroupJoinMode, string][]
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={value.join_mode === mode}
                onClick={() => onChange({ ...value, join_mode: mode })}
                className={`px-3 py-2.5 rounded-xl border text-sm text-left ${
                  value.join_mode === mode ? "border-accent bg-accent-soft/60 text-ink" : "border-border bg-surface text-ink-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-muted mt-2">
            Setting a price or making it private overrides this: paid groups are joined by purchase, private groups by invitation.
          </p>
        </div>
      )}

      {value.kind === "cohort" && (
        <>
          <div className="flex gap-3">
            <div className="flex-1">
              <FormField
                label="Start date (optional)"
                id="room_start_date"
                type="datetime-local"
                value={value.start_date}
                onChange={(e) => onChange({ ...value, start_date: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <FormField
                label="End date (optional)"
                id="room_end_date"
                type="datetime-local"
                value={value.end_date}
                onChange={(e) => onChange({ ...value, end_date: e.target.value })}
                error={error}
              />
            </div>
          </div>

          <div className="mb-4 flex gap-2.5 p-4 rounded-xl bg-accent-soft/60 text-sm text-ink-muted">
            <Info size={16} className="shrink-0 mt-0.5 text-accent" />
            <p>
              Members see a countdown once a start date is set. After the end date, the cohort closes — only media you've
              posted stays visible to people who were in it. You'll set up lectures, live sessions and assignments after
              creating it.
            </p>
          </div>
        </>
      )}
    </>
  );
}
