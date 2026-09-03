// src/components/project-types/EventFields.tsx
import { FormField } from "../FormField";
import { useUploadProjectThumbnail } from "../../hooks/useUploadProjectThumbnail";
import { useState } from "react";

export interface EventFieldsValue {
  event_date: string; // datetime-local string, "" = TBA
  location_type: "physical" | "online";
  location_value: string;
  ticket_template_url: string; // "" = none, use default ticket layout
}

export const EMPTY_EVENT_FIELDS: EventFieldsValue = {
  event_date: "",
  location_type: "physical",
  location_value: "",
  ticket_template_url: "",
};

interface EventFieldsProps {
  value: EventFieldsValue;
  onChange: (value: EventFieldsValue) => void;
}

// Ticket template is just an image upload — same bucket/hook as the
// project thumbnail, since it's a public-facing image (overlaid with
// attendee/event details at issue time, not sensitive on its own).
export function EventFields({ value, onChange }: EventFieldsProps) {
  const uploadThumbnail = useUploadProjectThumbnail();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const set = <K extends keyof EventFieldsValue>(key: K, val: EventFieldsValue[K]) =>
    onChange({ ...value, [key]: val });

  async function handleTicketTemplate(file: File) {
    setUploadError(null);
    try {
      const uploaded = await uploadThumbnail.mutateAsync(file);
      set("ticket_template_url", uploaded.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <div>
      <FormField
        label="Date & time (leave blank if TBA)"
        id="event_date"
        type="datetime-local"
        value={value.event_date}
        onChange={(e) => set("event_date", e.target.value)}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-muted mb-1.5">Where</label>
        <div className="flex gap-2 mb-2">
          {(["physical", "online"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => set("location_type", type)}
              className={`flex-1 py-2.5 rounded-xl border font-body text-sm capitalize transition-colors ${
                value.location_type === type
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-ink-muted"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <FormField
        label={value.location_type === "physical" ? "Address" : "Join link"}
        id="location_value"
        placeholder={value.location_type === "physical" ? "123 Main St, Lagos" : "https://..."}
        value={value.location_value}
        onChange={(e) => set("location_value", e.target.value)}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-muted mb-1.5">
          Ticket design (optional)
        </label>
        <p className="text-xs text-ink-muted/70 mb-2">
          Upload a background image and we'll overlay attendee details on it. Skip this and
          we'll use a clean default layout instead.
        </p>
        {value.ticket_template_url ? (
          <div className="flex items-center gap-3">
            <img
              src={value.ticket_template_url}
              alt="Ticket template"
              className="w-20 h-20 object-cover rounded-lg border border-border"
            />
            <button
              type="button"
              onClick={() => set("ticket_template_url", "")}
              className="text-sm text-danger"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="block w-full py-3 px-4 rounded-xl border border-dashed border-border text-center text-sm text-ink-muted cursor-pointer">
            {uploadThumbnail.isPending ? "Uploading…" : "Choose image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleTicketTemplate(e.target.files[0])}
            />
          </label>
        )}
        {uploadError && <p className="text-danger text-sm mt-1.5">{uploadError}</p>}
      </div>
    </div>
  );
}
