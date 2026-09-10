// src/components/project-types/PitchFields.tsx
import { FormField } from "../FormField";

export interface PitchFieldsValue {
  goal_amount_usd: string; // kept as text for the input, parsed on submit
}

export const EMPTY_PITCH_FIELDS: PitchFieldsValue = {
  goal_amount_usd: "",
};

interface PitchFieldsProps {
  value: PitchFieldsValue;
  onChange: (value: PitchFieldsValue) => void;
}

// A Pitch never carries a price tag (see PROJECT_TYPE_HINTS.pitch) —
// this is support-based fundraising, not a sale. The goal amount is
// purely a progress-bar target: Pitch always uses keep-what-you-raise,
// so missing this number changes nothing about what the creator can
// access from what was already pledged.
export function PitchFields({ value, onChange }: PitchFieldsProps) {
  return (
    <div className="mb-4">
      <FormField
        id="pitch_goal_amount"
        label="Fundraising goal (USD)"
        type="number"
        min={1}
        step="0.01"
        value={value.goal_amount_usd}
        onChange={(e) => onChange({ goal_amount_usd: e.target.value })}
        placeholder="5000"
      />
      <p className="text-xs text-ink-muted -mt-4 mb-2">
        Shown as a progress bar only. Supporters can back this idea for any amount they
        choose — you keep whatever is raised, whether or not you hit this goal.
      </p>
    </div>
  );
}
