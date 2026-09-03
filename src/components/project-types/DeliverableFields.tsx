// src/components/project-types/DeliverableFields.tsx
import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
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
  audio: { linkLabel: "Link to stream (SoundCloud, etc.)", fileLabel: "Or upload the audio file", accept: "audio/*" },
  video: { linkLabel: "Link to stream (YouTube, Vimeo, etc.)", fileLabel: "Or upload the video file", accept: "video/*" },
  file: { linkLabel: "Link (Drive, Dropbox, etc.)", fileLabel: "Or upload the file directly" },
};

// Same mechanics for all three: a buyer needs either a link or an
// uploaded file to unlock — at least one is required, enforced by
// the parent form's submit validation, not here.
export function DeliverableFields({ kind, value, onChange, onError }: DeliverableFieldsProps) {
  const uploadFile = useUploadProjectFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0); // forces the disabled/label state to re-render during upload

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setTick((t) => t + 1);
      const path = await uploadFile.mutateAsync(file);
      onChange({ ...value, file_path: path, file_name: file.name });
    } catch (err) {
      onError(err instanceof Error ? err.message : "File upload failed.");
    }
  }

  const copy = COPY[kind];

  return (
    <>
      <FormField
        id="external_url"
        label={copy.linkLabel}
        type="url"
        value={value.external_url}
        onChange={(e) => onChange({ ...value, external_url: e.target.value })}
        placeholder="https://"
      />

      <div className="mb-4">
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
        <p className="text-xs text-ink-muted mt-1">
          Stored privately — only unlocked for buyers, or streamed/downloaded freely if the price is 0.
        </p>
      </div>
    </>
  );
}
