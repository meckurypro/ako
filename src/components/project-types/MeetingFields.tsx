// src/components/project-types/MeetingFields.tsx
import { Video } from "lucide-react";
import { FormField } from "../FormField";

export interface MeetingFieldsValue {
  scheduled_at: string; // datetime-local string, required
  recording_enabled: boolean;
}

export const EMPTY_MEETING_FIELDS: MeetingFieldsValue = { scheduled_at: "", recording_enabled: false };

interface MeetingFieldsProps {
  value: MeetingFieldsValue;
  onChange: (value: MeetingFieldsValue) => void;
  error?: string;
}

// Deliberately minimal — a Meeting is one scheduled session, buyers
// see a countdown then join when it goes live. The actual video room
// (provider_room_id) gets provisioned when the host starts it, not
// at creation time. Recording is a yes/no decided up front, same as
// Zoom/Meet ask the host before the call starts — participants then
// see a consent notice in the lobby if it's on.
export function MeetingFields({ value, onChange, error }: MeetingFieldsProps) {
  return (
    <>
      <FormField
        label="When does it happen?"
        id="scheduled_at"
        type="datetime-local"
        value={value.scheduled_at}
        onChange={(e) => onChange({ ...value, scheduled_at: e.target.value })}
        error={error}
      />

      <button
        type="button"
        onClick={() => onChange({ ...value, recording_enabled: !value.recording_enabled })}
        aria-pressed={value.recording_enabled}
        className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm text-left transition-colors mb-4 ${
          value.recording_enabled ? "bg-accent-soft/60 border-accent" : "bg-surface border-border"
        }`}
      >
        <Video size={16} className={value.recording_enabled ? "text-accent" : "text-ink-muted"} />
        <span className="flex-1">
          <span className="block font-medium text-ink">Record this meeting</span>
          <span className="block text-xs text-ink-muted">
            Everyone sees a recording notice before joining. The finished recording is shared here afterward.
          </span>
        </span>
      </button>
    </>
  );
}
