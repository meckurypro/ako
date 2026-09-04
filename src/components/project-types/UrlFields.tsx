// src/components/project-types/UrlFields.tsx
import { FormField } from "../FormField";

export interface UrlFieldsValue {
  url: string;
}

export const EMPTY_URL_FIELDS: UrlFieldsValue = { url: "" };

interface UrlFieldsProps {
  value: UrlFieldsValue;
  onChange: (value: UrlFieldsValue) => void;
}

// A URL project is just a link the host is selling/gating access to —
// a WhatsApp group invite, a private page, a download link elsewhere,
// anything. Unlike File, this type never stores an uploaded file.
export function UrlFields({ value, onChange }: UrlFieldsProps) {
  return (
    <div>
      <FormField
        id="project_url"
        label="Link"
        type="url"
        value={value.url}
        onChange={(e) => onChange({ url: e.target.value })}
        placeholder="https://chat.whatsapp.com/..."
      />
      <p className="text-xs text-ink-muted -mt-3 mb-4">
        Whatever you're sharing access to — a WhatsApp group, a web page, anything with a link.
        Buyers see this once they unlock it.
      </p>
    </div>
  );
}
