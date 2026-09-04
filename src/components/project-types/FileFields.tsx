// src/components/project-types/FileFields.tsx
import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { useUploadProjectFile } from "../../hooks/useUploadProjectFile";

export interface FileFieldsValue {
  file_path: string | null;
  file_name: string | null; // display-only, not sent to the server
}

export const EMPTY_FILE_FIELDS: FileFieldsValue = {
  file_path: null,
  file_name: null,
};

interface FileFieldsProps {
  value: FileFieldsValue;
  onChange: (value: FileFieldsValue) => void;
  onError: (message: string) => void;
}

// File projects only ever store the uploaded file itself — no
// redirect/marketing link. Unlike Media's per-channel link-or-upload
// choice, there's no toggle here at all: this is upload-only, always.
export function FileFields({ value, onChange, onError }: FileFieldsProps) {
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
      onChange({ file_path: path, file_name: file.name });
    } catch (err) {
      onError(err instanceof Error ? err.message : "File upload failed.");
    }
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-ink-muted mb-1.5">File</label>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadFile.isPending}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-surface text-sm text-ink-muted disabled:opacity-50"
      >
        <FileUp size={16} />
        {uploadFile.isPending ? "Uploading…" : value.file_name ?? "Choose file"}
      </button>
      <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
      <p className="text-xs text-ink-muted mt-1">
        Hosted here — no external link is stored. Visitors with access download it with one tap.
      </p>
    </div>
  );
}
