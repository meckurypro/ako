// src/components/project-types/DeliverableFields.tsx
import { useRef, useState } from "react";
import { FileUp, Link as LinkIcon } from "lucide-react";
import { FormField } from "../FormField";
import { useUploadProjectFile } from "../../hooks/useUploadProjectFile";

export interface DeliverableFieldsValue {
  external_url: string;
  file_path: string | null;
  file_name: string | null; // display-only, not sent to the server
}

export const EMPTY_DELIVERABLE_FIELDS: DeliverableFieldsValue = {
  external_url: "",
  file_path: null,
  file_name: null,
};

interface DeliverableFieldsProps {
  kind: "audio" | "video" | "file";
  value: DeliverableFieldsValue;
  onChange: (value: DeliverableFieldsValue) => void;
  onError: (message: string) => void;
}

const COPY: Record<DeliverableFieldsProps["kind"], { linkLabel: string; fileLabel: string; accept?: string }> = {
  audio: { linkLabel: "Link to stream (SoundCloud, etc.)", fileLabel: "Upload the audio file", accept: "audio/*" },
  video: { linkLabel: "Link to stream (YouTube, Vimeo, etc.)", fileLabel: "Upload the video file", accept: "video/*" },
  file: { linkLabel: "Link (Drive, Dropbox, etc.)", fileLabel: "Upload the file directly" },
};

// A buyer unlocks either a link or an uploaded file — never both, so
// this is a mode toggle rather than two fields sitting side by side.
// Switching modes clears whatever was in the other one, so the two
// can never both be populated at submit time.
export function DeliverableFields({ kind, value, onChange, onError }: DeliverableFieldsProps) {
  const uploadFile = useUploadProjectFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0); // forces the disabled/label state to re-render during upload

  const mode: "link" | "upload" = value.file_path ? "upload" : "link";

  function switchMode(next: "link" | "upload") {
    if (next === mode) return;
    onChange(
      next === "link" ? { ...value, file_path: null, file_name: null } : { ...value, external_url: "" }
    );
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setTick((t) => t + 1);
      const path = await uploadFile.mutateAsync(file);
      // Uploading a file always wins the slot — clear any link at the
      // same time, not just on an explicit mode switch.
      onChange({ ...value, external_url: "", file_path: path, file_name: file.name });
    } catch (err) {
      onError(err instanceof Error ? err.message : "File upload failed.");
    }
  }

  const copy = COPY[kind];

  return (
    <div className="mb-4">
      <div className="flex gap-2 mb-3" role="tablist" aria-label="Delivery method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "link"}
          onClick={() => switchMode("link")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
            mode === "link" ? "bg-accent text-canvas border-accent" : "bg-surface text-ink-muted border-border"
          }`}
        >
          <LinkIcon size={14} />
          Link
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "upload"}
          onClick={() => switchMode("upload")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
            mode === "upload" ? "bg-accent text-canvas border-accent" : "bg-surface text-ink-muted border-border"
          }`}
        >
          <FileUp size={14} />
          Upload
        </button>
      </div>

      {mode === "link" ? (
        <FormField
          id="external_url"
          label={copy.linkLabel}
          type="url"
          value={value.external_url}
          onChange={(e) => onChange({ ...value, external_url: e.target.value })}
          placeholder="https://"
        />
      ) : (
        <div>
          <label className="block text-sm font-medium text-ink-muted mb-1.5">{copy.fileLabel}</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadFile.isPending}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-surface text-sm text-ink-muted disabled:opacity-50"
          >
            <FileUp size={16} />
            {uploadFile.isPending ? "Uploading…" : value.file_name ?? "Choose file"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={copy.accept}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      <p className="text-xs text-ink-muted mt-1">
        Stored privately — only unlocked for buyers, or streamed/downloaded freely if the price is 0.
      </p>
    </div>
  );
}
