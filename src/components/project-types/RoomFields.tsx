// src/components/project-types/RoomFields.tsx
import { Info } from "lucide-react";
import { FormField } from "../FormField";

export interface RoomFieldsValue {
  start_date: string; // datetime-local string, optional
  end_date: string; // datetime-local string, optional
}

export const EMPTY_ROOM_FIELDS: RoomFieldsValue = { start_date: "", end_date: "" };

interface RoomFieldsProps {
  value: RoomFieldsValue;
  onChange: (value: RoomFieldsValue) => void;
  error?: string;
}

// Start/end dates are optional at creation — a cohort without an
// end_date simply never closes (see room_is_closed() in the
// migration). Lectures, chat, meetings, and assignments are all set
// up afterward from the Cohort's manage screen, once members can
// actually join.
export function RoomFields({ value, onChange, error }: RoomFieldsProps) {
  return (
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
          Members see a countdown once a start date is set. After the end date, the cohort closes — only
          media you've posted stays visible to people who were in it. You'll set up lectures, meetings, and
          assignments after creating it, from its manage screen.
        </p>
      </div>
    </>
  );
}
