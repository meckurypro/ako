// src/components/project-types/MeetingFields.tsx
import { FormField } from "../FormField";

export interface MeetingFieldsValue {
  scheduled_at: string; // datetime-local string, required
}

export const EMPTY_MEETING_FIELDS: MeetingFieldsValue = { scheduled_at: "" };

interface MeetingFieldsProps {
  value: MeetingFieldsValue;
  onChange: (value: MeetingFieldsValue) => void;
  error?: string;
}

// Deliberately minimal — a Meeting is one scheduled session, buyers
// see a countdown then join when it goes live. The actual video room
// (provider_room_id) gets provisioned when the host starts it, not
// at creation time.
export function MeetingFields({ value, onChange, error }: MeetingFieldsProps) {
  return (
    <FormField
      label="When does it happen?"
      id="scheduled_at"
      type="datetime-local"
      value={value.scheduled_at}
      onChange={(e) => onChange({ scheduled_at: e.target.value })}
      error={error}
    />
  );
}
